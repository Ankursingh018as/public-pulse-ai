import cv2
import numpy as np
from ultralytics import YOLO

class GarbageDetector:
    def __init__(self, model_path="services/ai-engine/models/best_garbage.pt", confidence_threshold=0.20):
        # Load custom Garbage Detection Model
        self.model = YOLO(model_path)
        # Load Standard YOLOv8n for Person Detection (Secondary Filter)
        self.person_model = YOLO("yolov8n.pt")
        
        self.conf = confidence_threshold
        self.class_mapping = self.model.names
        
        # Classes: 0: Glass, 1: Metal, 2: Paper, 3: Plastic, 4: Waste
        self.TRASH_CLASSES = [0, 1, 2, 3, 4]
        self.PERSON_CLASS = None 

    def detect_garbage_texture(self, frame, exclude_boxes):
        """
        Detects 'Garbage Masses' based on high texture/edge density.
        Legacy heuristic - kept for reference but disabled in favor of trained model.
        """
        return []

    def detect_garbage_piles(self, boxes, classes, confs, frame):
        """
        Combine Object-Based Clustering
        """
        # 1. Identify Trash Items
        trash_boxes = []
        
        for box, cls, conf in zip(boxes, classes, confs):
            if int(cls) in self.TRASH_CLASSES:
                 trash_boxes.append(box)

        # 2. Get Object-Based Hulls (Cluster individual items into a pile)
        piles = []
        if trash_boxes:
            trash_points = []
            for box in trash_boxes:
                x1, y1, x2, y2 = box
                trash_points.append([x1, y1])
                trash_points.append([x2, y2])
                trash_points.append([x1, y2])
                trash_points.append([x2, y1])
            
            points = np.array(trash_points, dtype=np.int32)
            if len(trash_boxes) >= 1:
                # Calculate convex hull of ALL detected trash items
                piles.append(cv2.convexHull(points))
                
        # 3. Get Texture-Based Masses (DISABLED - Relying on Model)
        # texture_contours = self.detect_garbage_texture(frame, [])
        # piles.extend(texture_contours)
        
        return piles, trash_boxes

    def process_frame(self, frame, debug=True):
        # Tune: agnostic_nms=True prevents "Plastic" and "Waste" bounding boxes from overlapping on the same object
        # Tune: iou=0.5 cleans up cluttered detections
        results = self.model(frame, verbose=False, conf=self.conf, iou=0.5, agnostic_nms=True)[0]
        
        boxes = results.boxes.xyxy.cpu().numpy()
        classes = results.boxes.cls.cpu().numpy()
        confs = results.boxes.conf.cpu().numpy()
        
        # Detect Piles (Methods merged)
        garbage_piles_hulls, trash_boxes = self.detect_garbage_piles(boxes, classes, confs, frame)
        
        annotated_frame = frame.copy()
        
        # Draw items (debug - orange)
        if debug:
            for box in trash_boxes:
                x1, y1, x2, y2 = map(int, box)
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 165, 255), 2)

        # Draw Piles (Hulls/Contours - Red)
        for hull in garbage_piles_hulls:
            overlay = annotated_frame.copy()
            cv2.fillPoly(overlay, [hull], (0, 0, 255))
            cv2.addWeighted(overlay, 0.4, annotated_frame, 0.6, 0, annotated_frame)
            cv2.polylines(annotated_frame, [hull], True, (0, 0, 255), 3)
            
            M = cv2.moments(hull)
            if M["m00"] != 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
                cv2.putText(annotated_frame, "GARBAGE PILE / MASS", (cX - 100, cY), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        # Info
        info_text = f"Garbage Regions: {len(garbage_piles_hulls)}"
        cv2.putText(annotated_frame, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            
        return annotated_frame, len(garbage_piles_hulls)

    def process_video(self, source=0, show=True):
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"Error opening video source: {source}")
            return
            
        print(f"Processing VIDEO for GARBAGE detection: {source}...")
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret: break
                
                processed_frame, count = self.process_frame(frame)
                
                if show:
                    cv2.imshow("Public Pulse - Garbage Detector", processed_frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'): break
        finally:
            cap.release()
            cv2.destroyAllWindows()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=str, default="0", help="Video source")
    args = parser.parse_args()
    source = int(args.source) if args.source.isdigit() else args.source
    
    detector = GarbageDetector()
    detector.process_video(source=source)
