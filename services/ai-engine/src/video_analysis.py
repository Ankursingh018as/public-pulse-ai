import cv2
import numpy as np
from ultralytics import YOLO
from collections import defaultdict

class VideoAnalyzer:
    def __init__(self, model_path="yolov8n.pt", confidence_threshold=0.15):
        self.model = YOLO(model_path)
        self.conf = confidence_threshold
        
        # Mappings for COCO classes
        self.class_mapping = self.model.names
        
        # Define categories based on COCO classes
        self.TRAFFIC_CLASSES = [2, 3, 5, 7]  # car, motorcycle, bus, truck
        self.CROWD_CLASSES = [0]  # person
        # Potential trash items in COCO
        # EXPANDED: In a dump yard, almost any manufactured object that isn't a vehicle/person is likely trash.
        # 56-65: chair, couch, potted plant, bed, dining table, toilet, tv, laptop, mouse, remote, keyboard, cell phone
        # 68-76: microwave, oven, toaster, sink, refrigerator, book, clock, vase, scissors, teddy bear, hair drier, toothbrush
        self.TRASH_CLASSES = [
            39, 41, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, # Food/Eating
            56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, # Furniture/Electronics
            68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89 # Appliances/Indoor/Misc
        ]
        
    def detect_garbage_piles(self, boxes, classes, confs):
        """
        Heuristic: Cluster trash items.
        If multiple trash items are close to each other, consider it a 'Garbage Pile'.
        Returns a list of polygons (convex hulls) representing the piles.
        """
        trash_boxes = []
        for box, cls, conf in zip(boxes, classes, confs):
            if int(cls) in self.TRASH_CLASSES:
                 trash_boxes.append(box)

        if not trash_boxes:
            return []

        # Collect points from all trash boxes to cluster them
        trash_points = []
        for box in trash_boxes:
            x1, y1, x2, y2 = box
            # Add corners and center
            trash_points.append([x1, y1])
            trash_points.append([x2, y2])
            trash_points.append([x1, y2])
            trash_points.append([x2, y1])

        if not trash_points:
             return []
             
        # For this version, if we have a lot of trash points, we assume they form piles.
        # We can just draw one massive hull if they are all vaguely connected, 
        # or separate hulls if we did proper clustering.
        # Given the "Dump Yard" context, simpler might be better: ONE big pile if many items exist.
        
        points = np.array(trash_points, dtype=np.int32)
        
        # If we have disparate groups, hull will cover empty space between them. 
        # But user wants "whole pile".
        
        if len(trash_boxes) >= 2:
             hull = cv2.convexHull(points)
             return [hull] # Return as a list of hulls
        elif len(trash_boxes) == 1:
             # Just a box for single item
             return [points]
        
        return []

    def detect_water_logging(self, frame):
        """
        Placeholder for water logging detection.
        Real implementation would need semantic segmentation or trained classifier.
        """
        # Heuristic: Check for large uniform low-texture reflective areas on the ground?
        # Too complex for heuristic. Return 0 for now.
        return False, []

    def process_frame(self, frame, debug=True): # Enable debug by default to see what's happening
        results = self.model(frame, verbose=False, conf=self.conf)[0]
        
        boxes = results.boxes.xyxy.cpu().numpy()
        classes = results.boxes.cls.cpu().numpy()
        confs = results.boxes.conf.cpu().numpy()
        
        # Counts
        traffic_count = sum(1 for c in classes if int(c) in self.TRAFFIC_CLASSES)
        crowd_count = sum(1 for c in classes if int(c) in self.CROWD_CLASSES)
        
        # Garbage Piles
        garbage_piles_hulls = self.detect_garbage_piles(boxes, classes, confs)
        
        # Annotate
        annotated_frame = frame.copy()
        
        # Draw standard detections for traffic/crowd
        for box, cls, conf in zip(boxes, classes, confs):
            cls_int = int(cls)
            x1, y1, x2, y2 = map(int, box)
            
            color = None
            label = f"{self.class_mapping[cls_int]} {conf:.2f}"
            
            if cls_int in self.CROWD_CLASSES:
                color = (0, 255, 0) # Green
            elif cls_int in self.TRAFFIC_CLASSES:
                color = (255, 0, 0) # Blue
            # Don't draw individual trash boxes to reduce clutter, just the pile hull
            # unless in debug
            elif cls_int in self.TRASH_CLASSES:
                if debug: color = (0, 165, 255) # Orange (Debug only)
            elif debug:
                color = (128, 128, 128) # Gray for others in debug mode
                
            if color:
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(annotated_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Draw Garbage Piles (Convex Hulls)
        for hull in garbage_piles_hulls:
            overlay = annotated_frame.copy()
            cv2.fillPoly(overlay, [hull], (0, 0, 255))
            cv2.addWeighted(overlay, 0.3, annotated_frame, 0.7, 0, annotated_frame)
            
            cv2.polylines(annotated_frame, [hull], True, (0, 0, 255), 3)
            
            # Find center for label
            M = cv2.moments(hull)
            if M["m00"] != 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
                cv2.putText(annotated_frame, "GARBAGE PILE", (cX - 50, cY), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

        # Overlay Info
        info_text = [
            f"Traffic Count: {traffic_count}",
            f"Crowd Count: {crowd_count}",
            f"Garbage Piles: {len(garbage_piles_hulls)}",
            f"Water Logging: {'Detected' if False else 'None'}" # Placeholder
        ]
        
        for i, line in enumerate(info_text):
            cv2.putText(annotated_frame, line, (10, 30 + i * 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            
        return annotated_frame, {
            "traffic": traffic_count,
            "crowd": crowd_count,
            "garbage_piles": len(garbage_piles_hulls),
            "water_logging": False
        }

    def process_video(self, source=0, show=True):
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"Error opening video source: {source}")
            return
            
        print(f"Processing video from source: {source}...")
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                    
                processed_frame, stats = self.process_frame(frame)
                
                if show:
                    cv2.imshow("Public Pulse - Video Analysis", processed_frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                        
                # stats can be sent to API or saved
                # print(stats) 
                
        finally:
            cap.release()
            cv2.destroyAllWindows()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=str, default="0", help="Video source (0 for webcam, or path to file)")
    args = parser.parse_args()
    
    # Check if we should cast source to int (for webcam)
    source = int(args.source) if args.source.isdigit() else args.source
    
    analyzer = VideoAnalyzer()
    analyzer.process_video(source=source)
