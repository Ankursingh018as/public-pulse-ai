import cv2
from ultralytics import YOLO

class CrowdDetector:
    def __init__(self, model_path="yolov8n.pt", confidence_threshold=0.3):
        self.model = YOLO(model_path)
        self.conf = confidence_threshold
        self.CROWD_CLASSES = [0] # person
        
    def process_frame(self, frame):
        results = self.model(frame, verbose=False, conf=self.conf)[0]
        
        boxes = results.boxes.xyxy.cpu().numpy()
        classes = results.boxes.cls.cpu().numpy()
        
        crowd_count = sum(1 for c in classes if int(c) in self.CROWD_CLASSES)
        annotated_frame = frame.copy()
        
        for box, cls in zip(boxes, classes):
            if int(cls) in self.CROWD_CLASSES:
                x1, y1, x2, y2 = map(int, box)
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(annotated_frame, "Person", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

        info_text = f"Crowd Count: {crowd_count}"
        cv2.putText(annotated_frame, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
        return annotated_frame, crowd_count

    def process_video(self, source=0, show=True):
        cap = cv2.VideoCapture(source)
        if not cap.isOpened():
            print(f"Error opening video source: {source}")
            return
            
        print(f"Processing VIDEO for CROWD detection: {source}...")
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret: break
                
                processed_frame, count = self.process_frame(frame)
                
                if show:
                    cv2.imshow("Public Pulse - Crowd Detector", processed_frame)
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
    
    detector = CrowdDetector()
    detector.process_video(source=source)
