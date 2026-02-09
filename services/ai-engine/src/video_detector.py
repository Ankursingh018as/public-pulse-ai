"""
Video/Image-based trash detection using YOLOv8.
Production-grade module with dynamic device selection, configurable thresholds,
and robust error handling.
"""
import os
import logging
import tempfile
import time
from pathlib import Path
from typing import Optional

logger = logging.getLogger("video-detector")

# Lazy-loaded globals
_model = None
_device = None

SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv"}
TRASH_CLASS_NAMES = {"trash", "garbage", "waste", "litter"}

# Default paths
MODEL_DIR = Path(os.getenv("MODEL_DIR", "/app/models"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/uploads"))
DEFAULT_WEIGHTS = os.getenv("YOLO_WEIGHTS", "yolov8n.pt")
DEFAULT_CONFIDENCE = float(os.getenv("YOLO_CONFIDENCE", "0.5"))


def _get_device() -> str:
    """Dynamically select the best available compute device."""
    global _device
    if _device is not None:
        return _device

    try:
        import torch

        if torch.cuda.is_available():
            _device = "cuda"
        elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            _device = "mps"
        else:
            _device = "cpu"
    except ImportError:
        _device = "cpu"

    logger.info(f"Selected compute device: {_device}")
    return _device


def _load_model(weights_path: Optional[str] = None):
    """Load or reload the YOLO model with the specified weights."""
    global _model
    try:
        from ultralytics import YOLO
    except ImportError:
        raise RuntimeError(
            "ultralytics is not installed. Run: pip install ultralytics"
        )

    weights = weights_path or str(MODEL_DIR / DEFAULT_WEIGHTS)

    # Fall back to pretrained if custom weights don't exist
    if not os.path.exists(weights):
        logger.warning(
            f"Weights not found at {weights}, using pretrained {DEFAULT_WEIGHTS}"
        )
        weights = DEFAULT_WEIGHTS

    _model = YOLO(weights)
    logger.info(f"Loaded YOLO model from {weights}")
    return _model


def get_model(weights_path: Optional[str] = None):
    """Get the YOLO model, loading it if necessary."""
    global _model
    if _model is None:
        _load_model(weights_path)
    return _model


def detect_image(
    image_path: str,
    confidence: float = DEFAULT_CONFIDENCE,
    weights_path: Optional[str] = None,
) -> dict:
    """
    Run trash detection on a single image.

    Args:
        image_path: Path to the input image.
        confidence: Minimum confidence threshold (0.0–1.0).
        weights_path: Optional custom model weights path.

    Returns:
        dict with detections, counts, and metadata.
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    if path.suffix.lower() not in SUPPORTED_IMAGE_EXTENSIONS:
        raise ValueError(
            f"Unsupported image format: {path.suffix}. "
            f"Supported: {SUPPORTED_IMAGE_EXTENSIONS}"
        )

    model = get_model(weights_path)
    device = _get_device()

    start_time = time.time()
    results = model.predict(
        source=str(path), conf=confidence, device=device, verbose=False
    )
    inference_time = time.time() - start_time

    detections = []
    for result in results:
        boxes = result.boxes
        for i in range(len(boxes)):
            detections.append(
                {
                    "class": result.names[int(boxes.cls[i])],
                    "confidence": round(float(boxes.conf[i]), 4),
                    "bbox": boxes.xyxy[i].tolist(),
                }
            )

    trash_count = sum(
        1
        for d in detections
        if d["class"].lower() in TRASH_CLASS_NAMES
    )

    return {
        "status": "success",
        "image_path": str(path),
        "device": device,
        "inference_time_ms": round(inference_time * 1000, 2),
        "total_detections": len(detections),
        "trash_count": trash_count,
        "detections": detections,
        "confidence_threshold": confidence,
    }


def detect_video(
    video_path: str,
    output_path: Optional[str] = None,
    confidence: float = DEFAULT_CONFIDENCE,
    weights_path: Optional[str] = None,
    max_frames: int = 0,
) -> dict:
    """
    Run trash detection on a video file.

    Args:
        video_path: Path to the input video.
        output_path: Path to save annotated output video (optional).
        confidence: Minimum confidence threshold.
        weights_path: Optional custom model weights path.
        max_frames: Maximum frames to process (0 = all frames).

    Returns:
        dict with aggregated detections, frame-by-frame stats, and metadata.
    """
    try:
        import cv2
    except ImportError:
        raise RuntimeError(
            "opencv-python is not installed. Run: pip install opencv-python-headless"
        )

    path = Path(video_path)
    if not path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    if path.suffix.lower() not in SUPPORTED_VIDEO_EXTENSIONS:
        raise ValueError(
            f"Unsupported video format: {path.suffix}. "
            f"Supported: {SUPPORTED_VIDEO_EXTENSIONS}"
        )

    model = get_model(weights_path)
    device = _get_device()

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    # Video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    # Setup output writer if requested
    out = None
    if output_path:
        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_results = []
    all_detections = []
    frames_processed = 0
    start_time = time.time()

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if max_frames > 0 and frames_processed >= max_frames:
                break

            results = model.predict(
                source=frame, conf=confidence, device=device, verbose=False
            )

            frame_detections = []
            for result in results:
                boxes = result.boxes
                for i in range(len(boxes)):
                    detection = {
                        "class": result.names[int(boxes.cls[i])],
                        "confidence": round(float(boxes.conf[i]), 4),
                        "bbox": boxes.xyxy[i].tolist(),
                    }
                    frame_detections.append(detection)
                    all_detections.append(detection)

                if out is not None:
                    annotated = result.plot()
                    out.write(annotated)

            frame_results.append(
                {
                    "frame": frames_processed,
                    "detections": len(frame_detections),
                }
            )
            frames_processed += 1

    except KeyboardInterrupt:
        logger.warning("Video processing interrupted by user")
    finally:
        cap.release()
        if out is not None:
            out.release()

    total_time = time.time() - start_time
    trash_count = sum(
        1
        for d in all_detections
        if d["class"].lower() in TRASH_CLASS_NAMES
    )

    return {
        "status": "success",
        "video_path": str(path),
        "output_path": output_path,
        "device": device,
        "video_info": {
            "width": width,
            "height": height,
            "fps": fps,
            "total_frames": total_frames,
        },
        "processing": {
            "frames_processed": frames_processed,
            "total_time_s": round(total_time, 2),
            "avg_fps": round(frames_processed / total_time, 2) if total_time > 0 else 0,
        },
        "total_detections": len(all_detections),
        "trash_count": trash_count,
        "confidence_threshold": confidence,
        "frame_summary": frame_results[:100],  # Limit to first 100 frames in response
    }


def get_model_status() -> dict:
    """Return current model status and configuration."""
    global _model, _device
    weights_file = str(MODEL_DIR / DEFAULT_WEIGHTS)

    return {
        "model_loaded": _model is not None,
        "device": _device or "not initialized",
        "weights_path": weights_file,
        "weights_exists": os.path.exists(weights_file),
        "default_confidence": DEFAULT_CONFIDENCE,
        "model_dir": str(MODEL_DIR),
        "upload_dir": str(UPLOAD_DIR),
        "supported_image_formats": sorted(SUPPORTED_IMAGE_EXTENSIONS),
        "supported_video_formats": sorted(SUPPORTED_VIDEO_EXTENSIONS),
    }


def reload_model(weights_path: Optional[str] = None) -> dict:
    """Force reload the YOLO model with new weights."""
    global _model
    _model = None
    _load_model(weights_path)
    return {"status": "reloaded", "weights": weights_path or DEFAULT_WEIGHTS}
