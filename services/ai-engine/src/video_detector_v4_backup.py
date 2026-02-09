"""
Video/Image-based trash detection using OpenCV DNN + YOLOv4-tiny.
No PyTorch or ultralytics dependency — uses COCO-trained model
loaded via cv2.dnn for lightweight, fast inference.
"""
import os
import logging
import time
import urllib.request
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger("video-detector")

SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv"}

# Full 80-class COCO label list
COCO_CLASSES = [
    "person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck",
    "boat", "traffic light", "fire hydrant", "stop sign", "parking meter", "bench",
    "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra",
    "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee",
    "skis", "snowboard", "sports ball", "kite", "baseball bat", "baseball glove",
    "skateboard", "surfboard", "tennis racket", "bottle", "wine glass", "cup",
    "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange",
    "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "sofa",
    "pottedplant", "bed", "diningtable", "toilet", "tvmonitor", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
    "toothbrush",
]

# Classes considered "trash / litter" when found in an urban scene
TRASH_CLASSES = {
    "bottle", "cup", "bowl", "banana", "apple", "sandwich", "orange",
    "donut", "cake", "fork", "knife", "spoon", "wine glass",
    "backpack", "handbag", "suitcase", "umbrella", "frisbee",
    "book", "vase", "scissors", "toothbrush", "cell phone", "remote",
}

# Default paths
MODEL_DIR = Path(os.getenv("MODEL_DIR", "./models"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
DEFAULT_CONFIDENCE = float(os.getenv("YOLO_CONFIDENCE", "0.5"))

# YOLOv4-tiny model URLs (~23 MB weights, < 1 KB config)
YOLOV4_TINY_WEIGHTS_URL = "https://github.com/AlexeyAB/darknet/releases/download/yolov4/yolov4-tiny.weights"
YOLOV4_TINY_CFG_URL = "https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg"

_net = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _download_file(url: str, dest: Path) -> None:
    """Download a file if it doesn't already exist."""
    if dest.exists():
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    logger.info(f"Downloading {dest.name} from {url} ...")
    try:
        urllib.request.urlretrieve(url, str(dest))
        size_mb = dest.stat().st_size / 1024 / 1024
        logger.info(f"Downloaded {dest.name} ({size_mb:.1f} MB)")
    except Exception as e:
        logger.error(f"Download failed for {dest.name}: {e}")
        raise RuntimeError(f"Could not download model file from {url}: {e}")


def _load_net():
    """Load YOLOv4-tiny Darknet model into OpenCV DNN."""
    global _net
    if _net is not None:
        return _net

    weights_path = MODEL_DIR / "yolov4-tiny.weights"
    cfg_path = MODEL_DIR / "yolov4-tiny.cfg"

    # Auto-download model files on first use
    _download_file(YOLOV4_TINY_WEIGHTS_URL, weights_path)
    _download_file(YOLOV4_TINY_CFG_URL, cfg_path)

    _net = cv2.dnn.readNetFromDarknet(str(cfg_path), str(weights_path))
    _net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
    _net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
    logger.info("Loaded YOLOv4-tiny model via OpenCV DNN (CPU)")
    return _net


def _run_detection(image: np.ndarray, confidence: float = DEFAULT_CONFIDENCE) -> list[dict]:
    """Run YOLO detection on a BGR numpy image and return a list of detections."""
    net = _load_net()
    h, w = image.shape[:2]

    blob = cv2.dnn.blobFromImage(image, 1 / 255.0, (416, 416), swapRB=True, crop=False)
    net.setInput(blob)

    layer_names = net.getLayerNames()
    out_layer_ids = net.getUnconnectedOutLayers()
    output_names = [layer_names[i - 1] for i in out_layer_ids]
    outputs = net.forward(output_names)

    boxes, confidences_list, class_ids = [], [], []
    for output in outputs:
        for det in output:
            scores = det[5:]
            cls_id = int(np.argmax(scores))
            conf = float(scores[cls_id])
            if conf < confidence:
                continue
            cx, cy, bw, bh = det[0] * w, det[1] * h, det[2] * w, det[3] * h
            x1 = cx - bw / 2
            y1 = cy - bh / 2
            boxes.append([x1, y1, bw, bh])
            confidences_list.append(conf)
            class_ids.append(cls_id)

    # Non-maximum suppression
    indices = cv2.dnn.NMSBoxes(boxes, confidences_list, confidence, 0.4)

    detections: list[dict] = []
    if len(indices) > 0:
        for i in indices.flatten():
            x, y, bw, bh = boxes[i]
            cls_name = COCO_CLASSES[class_ids[i]] if class_ids[i] < len(COCO_CLASSES) else "unknown"
            detections.append({
                "class": cls_name,
                "confidence": round(confidences_list[i], 4),
                "bbox": [round(x, 1), round(y, 1), round(x + bw, 1), round(y + bh, 1)],
            })

    return detections


# ---------------------------------------------------------------------------
# Public API — same interface as the original torch-based module
# ---------------------------------------------------------------------------

def detect_image(
    image_path: str,
    confidence: float = DEFAULT_CONFIDENCE,
    weights_path: Optional[str] = None,
) -> dict:
    """
    Run object detection on a single image.

    Args:
        image_path: Path to the input image.
        confidence: Minimum confidence threshold (0.0–1.0).
        weights_path: Unused (kept for API compatibility).

    Returns:
        dict with detections, counts, and metadata.
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")
    if path.suffix.lower() not in SUPPORTED_IMAGE_EXTENSIONS:
        raise ValueError(f"Unsupported image format: {path.suffix}")

    start_time = time.time()
    image = cv2.imread(str(path))
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")

    detections = _run_detection(image, confidence)
    inference_time = time.time() - start_time

    trash_count = sum(1 for d in detections if d["class"] in TRASH_CLASSES)

    return {
        "status": "success",
        "image_path": str(path),
        "device": "cpu",
        "inference_time_ms": round(inference_time * 1000, 2),
        "total_detections": len(detections),
        "trash_count": trash_count,
        "detections": detections,
        "confidence_threshold": confidence,
        "model": "yolov4-tiny-coco",
    }


def detect_video(
    video_path: str,
    output_path: Optional[str] = None,
    confidence: float = DEFAULT_CONFIDENCE,
    weights_path: Optional[str] = None,
    max_frames: int = 0,
) -> dict:
    """
    Run object detection on a video file frame-by-frame.

    Args:
        video_path: Path to the input video.
        output_path: Ignored (kept for API compatibility).
        confidence: Minimum confidence threshold.
        weights_path: Unused.
        max_frames: Max frames to process (0 = all).

    Returns:
        dict with aggregated detections, frame stats, and metadata.
    """
    path = Path(video_path)
    if not path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")
    if path.suffix.lower() not in SUPPORTED_VIDEO_EXTENSIONS:
        raise ValueError(f"Unsupported video format: {path.suffix}")

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    frame_results: list[dict] = []
    all_detections: list[dict] = []
    frames_processed = 0
    start_time = time.time()

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            if 0 < max_frames <= frames_processed:
                break

            frame_dets = _run_detection(frame, confidence)
            all_detections.extend(frame_dets)
            frame_results.append({"frame": frames_processed, "detections": len(frame_dets)})
            frames_processed += 1
    except KeyboardInterrupt:
        logger.warning("Video processing interrupted")
    finally:
        cap.release()

    total_time = time.time() - start_time
    trash_count = sum(1 for d in all_detections if d["class"] in TRASH_CLASSES)

    return {
        "status": "success",
        "video_path": str(path),
        "output_path": output_path,
        "device": "cpu",
        "video_info": {"width": width, "height": height, "fps": fps, "total_frames": total_frames},
        "processing": {
            "frames_processed": frames_processed,
            "total_time_s": round(total_time, 2),
            "avg_fps": round(frames_processed / total_time, 2) if total_time > 0 else 0,
        },
        "total_detections": len(all_detections),
        "trash_count": trash_count,
        "confidence_threshold": confidence,
        "frame_summary": frame_results[:100],
        "model": "yolov4-tiny-coco",
    }


def detect_frame_base64(base64_data: str, confidence: float = DEFAULT_CONFIDENCE) -> dict:
    """
    Run detection on a base64-encoded image frame (fast path for live analysis).
    Skips file I/O — decodes directly to numpy array.

    Args:
        base64_data: Base64-encoded image bytes (JPEG/PNG).
        confidence: Minimum confidence threshold.

    Returns:
        dict with detections, counts, inference time.
    """
    import base64

    start_time = time.time()
    img_bytes = base64.b64decode(base64_data)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode base64 image data")

    detections = _run_detection(image, confidence)
    inference_time = time.time() - start_time
    trash_count = sum(1 for d in detections if d["class"] in TRASH_CLASSES)

    return {
        "status": "success",
        "inference_time_ms": round(inference_time * 1000, 2),
        "total_detections": len(detections),
        "trash_count": trash_count,
        "detections": detections,
        "confidence_threshold": confidence,
        "model": "yolov4-tiny-coco",
        "frame_width": image.shape[1],
        "frame_height": image.shape[0],
    }


def get_model_status() -> dict:
    """Return current model status and configuration."""
    weights_path = MODEL_DIR / "yolov4-tiny.weights"
    cfg_path = MODEL_DIR / "yolov4-tiny.cfg"
    return {
        "model_loaded": _net is not None,
        "device": "cpu",
        "weights_path": str(weights_path),
        "weights_exists": weights_path.exists(),
        "config_exists": cfg_path.exists(),
        "default_confidence": DEFAULT_CONFIDENCE,
        "model_dir": str(MODEL_DIR),
        "upload_dir": str(UPLOAD_DIR),
        "model_type": "yolov4-tiny (OpenCV DNN, COCO 80-class)",
        "supported_image_formats": sorted(SUPPORTED_IMAGE_EXTENSIONS),
        "supported_video_formats": sorted(SUPPORTED_VIDEO_EXTENSIONS),
    }


def reload_model(weights_path: Optional[str] = None) -> dict:
    """Force reload the model."""
    global _net
    _net = None
    _load_net()
    return {"status": "reloaded", "model": "yolov4-tiny-coco"}
