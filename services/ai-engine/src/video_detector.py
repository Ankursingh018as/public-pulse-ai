"""
Video/Image-based trash detection using YOLOv8n via ONNX Runtime.
No PyTorch or ultralytics dependency at runtime — pure numpy + onnxruntime
for fast, lightweight inference on any platform.

Supports:
  - Custom-trained trash ONNX model (single "trash" class)
  - Base YOLOv8n ONNX (COCO 80-class with trash-class filtering)
Auto-detects which model is loaded by checking output shape.
"""
import os
import logging
import time
import base64
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger("video-detector")

SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".wmv", ".flv"}

# Full 80-class COCO label list (used when running base yolov8n)
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
    "trash",  # custom model class
    "bottle", "cup", "bowl", "banana", "apple", "sandwich", "orange",
    "donut", "cake", "fork", "knife", "spoon", "wine glass",
    "backpack", "handbag", "suitcase", "umbrella", "frisbee",
    "book", "vase", "scissors", "toothbrush", "cell phone", "remote",
}

# Default paths
MODEL_DIR = Path(os.getenv("MODEL_DIR", "./models"))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
DEFAULT_CONFIDENCE = float(os.getenv("YOLO_CONFIDENCE", "0.40"))
INPUT_SIZE = int(os.getenv("YOLO_INPUT_SIZE", "640"))

# Model file names — prefer custom trash model, fallback to base
CUSTOM_MODEL_NAME = "trash_detector.onnx"
BASE_MODEL_NAME = "yolov8n.onnx"

_session = None          # ONNX Runtime InferenceSession
_model_name = None       # which model is loaded
_model_classes = None    # class list for the loaded model


# ---------------------------------------------------------------------------
# ONNX Runtime model loading
# ---------------------------------------------------------------------------

def _load_session():
    """Load the YOLOv8 ONNX model into ONNX Runtime."""
    global _session, _model_name, _model_classes

    if _session is not None:
        return _session

    import onnxruntime as ort

    # Prefer custom-trained trash detector over generic base model
    custom_path = MODEL_DIR / CUSTOM_MODEL_NAME
    base_path = MODEL_DIR / BASE_MODEL_NAME

    if custom_path.exists():
        model_path = custom_path
        _model_name = "yolov8n-trash-custom"
    elif base_path.exists():
        model_path = base_path
        _model_name = "yolov8n-coco-base"
    else:
        raise FileNotFoundError(
            f"No ONNX model found. Expected one of:\n"
            f"  {custom_path}\n"
            f"  {base_path}\n"
            "Run 'python videomodel/export_to_onnx.py' to generate the model."
        )

    providers = ["CPUExecutionProvider"]
    available = ort.get_available_providers()
    if "CUDAExecutionProvider" in available:
        providers.insert(0, "CUDAExecutionProvider")
    elif "DmlExecutionProvider" in available:
        providers.insert(0, "DmlExecutionProvider")

    sess_opts = ort.SessionOptions()
    sess_opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess_opts.intra_op_num_threads = max(1, os.cpu_count() // 2)

    _session = ort.InferenceSession(str(model_path), sess_opts, providers=providers)

    # Determine model classes from output shape
    # YOLOv8 output: (1, 4+num_classes, 8400)
    output_shape = _session.get_outputs()[0].shape
    num_classes = output_shape[1] - 4

    if num_classes == 1:
        _model_classes = ["trash"]
        logger.info(f"Loaded custom trash detector ({model_path.name}, 1 class)")
    elif num_classes == 80:
        _model_classes = COCO_CLASSES
        logger.info(f"Loaded YOLOv8n base model ({model_path.name}, 80 COCO classes)")
    else:
        _model_classes = [f"class_{i}" for i in range(num_classes)]
        logger.info(f"Loaded ONNX model ({model_path.name}, {num_classes} classes)")

    active_provider = _session.get_providers()[0]
    logger.info(f"ONNX Runtime provider: {active_provider}")
    size_mb = model_path.stat().st_size / 1024 / 1024
    logger.info(f"Model size: {size_mb:.1f} MB")

    return _session


# ---------------------------------------------------------------------------
# YOLOv8 pre/post-processing (pure numpy — no torch needed)
# ---------------------------------------------------------------------------

def _preprocess(image: np.ndarray, input_size: int = INPUT_SIZE):
    """
    Letterbox + normalize an image for YOLOv8 input.

    Returns:
        blob: (1, 3, H, W) float32 array, values [0..1]
        orig_shape: (orig_h, orig_w)
        ratio: (scale_w, scale_h) for box rescaling
        pad: (pad_w, pad_h) for box offset
    """
    h, w = image.shape[:2]
    orig_shape = (h, w)

    scale = min(input_size / h, input_size / w)
    new_w, new_h = int(w * scale), int(h * scale)

    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    pad_w = (input_size - new_w) // 2
    pad_h = (input_size - new_h) // 2
    padded = np.full((input_size, input_size, 3), 114, dtype=np.uint8)
    padded[pad_h:pad_h + new_h, pad_w:pad_w + new_w] = resized

    blob = padded[:, :, ::-1].astype(np.float32) / 255.0
    blob = blob.transpose(2, 0, 1)[np.newaxis, ...]

    return blob, orig_shape, (scale, scale), (pad_w, pad_h)


def _postprocess(
    output: np.ndarray,
    orig_shape: tuple,
    ratio: tuple,
    pad: tuple,
    confidence: float,
    iou_threshold: float = 0.45,
) -> list:
    """
    Post-process YOLOv8 ONNX output into detection dicts.

    YOLOv8 output shape: (1, 4+num_classes, 8400)
    """
    classes = _model_classes or COCO_CLASSES

    preds = output[0].T  # (8400, 4+num_classes)

    boxes_xywh = preds[:, :4]
    class_scores = preds[:, 4:]

    max_scores = class_scores.max(axis=1)
    class_ids = class_scores.argmax(axis=1)

    mask = max_scores >= confidence
    boxes_xywh = boxes_xywh[mask]
    max_scores = max_scores[mask]
    class_ids = class_ids[mask]

    if len(boxes_xywh) == 0:
        return []

    x1 = boxes_xywh[:, 0] - boxes_xywh[:, 2] / 2
    y1 = boxes_xywh[:, 1] - boxes_xywh[:, 3] / 2
    x2 = boxes_xywh[:, 0] + boxes_xywh[:, 2] / 2
    y2 = boxes_xywh[:, 1] + boxes_xywh[:, 3] / 2

    pad_w, pad_h = pad
    scale_w, scale_h = ratio

    x1 = (x1 - pad_w) / scale_w
    y1 = (y1 - pad_h) / scale_h
    x2 = (x2 - pad_w) / scale_w
    y2 = (y2 - pad_h) / scale_h

    orig_h, orig_w = orig_shape
    x1 = np.clip(x1, 0, orig_w)
    y1 = np.clip(y1, 0, orig_h)
    x2 = np.clip(x2, 0, orig_w)
    y2 = np.clip(y2, 0, orig_h)

    boxes_for_nms = np.stack([x1, y1, x2 - x1, y2 - y1], axis=1).tolist()
    scores_for_nms = max_scores.tolist()

    indices = cv2.dnn.NMSBoxes(boxes_for_nms, scores_for_nms, confidence, iou_threshold)

    detections = []
    if len(indices) > 0:
        for i in indices.flatten():
            cls_id = int(class_ids[i])
            cls_name = classes[cls_id] if cls_id < len(classes) else "unknown"
            detections.append({
                "class": cls_name,
                "confidence": round(float(max_scores[i]), 4),
                "bbox": [
                    round(float(x1[i]), 1),
                    round(float(y1[i]), 1),
                    round(float(x2[i]), 1),
                    round(float(y2[i]), 1),
                ],
            })

    return detections


def _run_detection(image: np.ndarray, confidence: float = DEFAULT_CONFIDENCE) -> list:
    """Run YOLOv8 ONNX detection on a BGR numpy image."""
    session = _load_session()

    input_name = session.get_inputs()[0].name
    blob, orig_shape, ratio, pad = _preprocess(image)
    outputs = session.run(None, {input_name: blob})

    return _postprocess(outputs[0], orig_shape, ratio, pad, confidence)


# ---------------------------------------------------------------------------
# Public API — same interface as the previous module
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
        "model": _model_name or "yolov8n-onnx",
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

    frame_results = []
    all_detections = []
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
        "model": _model_name or "yolov8n-onnx",
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
        "model": _model_name or "yolov8n-onnx",
        "frame_width": image.shape[1],
        "frame_height": image.shape[0],
    }


def get_model_status() -> dict:
    """Return current model status and configuration."""
    custom_path = MODEL_DIR / CUSTOM_MODEL_NAME
    base_path = MODEL_DIR / BASE_MODEL_NAME

    active_model = None
    if custom_path.exists():
        active_model = str(custom_path)
    elif base_path.exists():
        active_model = str(base_path)

    return {
        "model_loaded": _session is not None,
        "model_name": _model_name,
        "model_path": active_model,
        "model_classes": len(_model_classes) if _model_classes else 0,
        "device": "cpu",
        "custom_model_exists": custom_path.exists(),
        "base_model_exists": base_path.exists(),
        "default_confidence": DEFAULT_CONFIDENCE,
        "input_size": INPUT_SIZE,
        "model_dir": str(MODEL_DIR),
        "upload_dir": str(UPLOAD_DIR),
        "model_type": f"YOLOv8n ONNX Runtime ({_model_name or 'not loaded'})",
        "supported_image_formats": sorted(SUPPORTED_IMAGE_EXTENSIONS),
        "supported_video_formats": sorted(SUPPORTED_VIDEO_EXTENSIONS),
    }


def reload_model(weights_path: Optional[str] = None) -> dict:
    """Force reload the model."""
    global _session, _model_name, _model_classes
    _session = None
    _model_name = None
    _model_classes = None
    _load_session()
    return get_model_status()
