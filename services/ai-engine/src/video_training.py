"""
YOLO model training pipeline for trash detection.
Supports training, data preparation, and resume capabilities.
"""
import os
import logging
import shutil
import random
from pathlib import Path
from typing import Optional

logger = logging.getLogger("video-training")

MODEL_DIR = Path(os.getenv("MODEL_DIR", "/app/models"))
DATA_DIR = Path(os.getenv("DATA_DIR", "/app/data"))


def _get_device() -> str:
    """Dynamically select the best available compute device."""
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            return "mps"
    except ImportError:
        pass
    return "cpu"


def prepare_dataset(
    source_path: str,
    target_dir: Optional[str] = None,
    split_ratio: tuple = (0.8, 0.1, 0.1),
) -> dict:
    """
    Organize a raw dataset into YOLOv8 train/val/test format.

    Args:
        source_path: Path to the downloaded dataset.
        target_dir: Path to the organized output directory.
        split_ratio: Tuple of (train, val, test) ratios.

    Returns:
        dict with preparation status and statistics.
    """
    source = Path(source_path)
    target = Path(target_dir) if target_dir else DATA_DIR

    if not source.exists():
        raise FileNotFoundError(f"Source path does not exist: {source_path}")

    # Create directory structure
    for split in ("train", "val", "test"):
        (target / "images" / split).mkdir(parents=True, exist_ok=True)
        (target / "labels" / split).mkdir(parents=True, exist_ok=True)

    # Collect all image files
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp"}
    images = []
    for root, _, files in os.walk(source):
        for f in files:
            if Path(f).suffix.lower() in image_extensions:
                images.append(os.path.join(root, f))

    random.shuffle(images)
    num_images = len(images)

    if num_images == 0:
        return {"status": "error", "message": "No images found in source path"}

    train_end = int(num_images * split_ratio[0])
    val_end = train_end + int(num_images * split_ratio[1])

    stats = {"train": 0, "val": 0, "test": 0, "skipped": 0}

    for i, image_path in enumerate(images):
        image_path = Path(image_path)
        if i < train_end:
            split = "train"
        elif i < val_end:
            split = "val"
        else:
            split = "test"

        label_path = image_path.with_suffix(".txt")
        if not label_path.exists():
            stats["skipped"] += 1
            continue

        shutil.copy(image_path, target / "images" / split / image_path.name)

        # Normalize labels to single class (trash = 0)
        new_label = target / "labels" / split / label_path.name
        with open(label_path, "r") as fin, open(new_label, "w") as fout:
            for line in fin:
                parts = line.strip().split()
                if len(parts) >= 5:
                    parts[0] = "0"
                    fout.write(" ".join(parts) + "\n")

        stats[split] += 1

    # Create data.yaml
    _create_data_yaml(target)

    return {
        "status": "success",
        "total_images": num_images,
        "splits": stats,
        "data_dir": str(target),
    }


def _create_data_yaml(target_dir: Path):
    """Create data.yaml configuration file for YOLO training."""
    try:
        import yaml
    except ImportError:
        # Fallback: write manually
        content = (
            f"path: {target_dir.absolute()}\n"
            f"train: images/train\n"
            f"val: images/val\n"
            f"test: images/test\n"
            f"names:\n"
            f"  0: trash\n"
        )
        with open(target_dir / "data.yaml", "w") as f:
            f.write(content)
        return

    data = {
        "path": str(target_dir.absolute()),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {0: "trash"},
    }
    with open(target_dir / "data.yaml", "w") as f:
        yaml.dump(data, f)


def train_model(
    data_yaml: Optional[str] = None,
    epochs: int = 50,
    image_size: int = 640,
    batch_size: int = 16,
    base_model: str = "yolov8n.pt",
    project_name: str = "trash_detector",
) -> dict:
    """
    Train a YOLOv8 model on the prepared dataset.

    Args:
        data_yaml: Path to data.yaml configuration.
        epochs: Number of training epochs.
        image_size: Image size for training.
        batch_size: Batch size.
        base_model: Base pretrained model to fine-tune.
        project_name: Name for the training project.

    Returns:
        dict with training status and results path.
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        raise RuntimeError("ultralytics is not installed")

    yaml_path = data_yaml or str(DATA_DIR / "data.yaml")
    if not os.path.exists(yaml_path):
        raise FileNotFoundError(f"data.yaml not found at {yaml_path}")

    device = _get_device()
    logger.info(f"Starting training on device: {device}")

    model = YOLO(base_model)
    results = model.train(
        data=yaml_path,
        epochs=epochs,
        imgsz=image_size,
        batch=batch_size,
        project=str(MODEL_DIR),
        name=project_name,
        device=device,
    )

    return {
        "status": "success",
        "device": device,
        "epochs": epochs,
        "project": str(MODEL_DIR / project_name),
    }


def resume_training(checkpoint_path: Optional[str] = None) -> dict:
    """
    Resume training from a checkpoint.

    Args:
        checkpoint_path: Path to last.pt checkpoint file.

    Returns:
        dict with resume status.
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        raise RuntimeError("ultralytics is not installed")

    if checkpoint_path is None:
        # Search for last.pt in common locations
        candidates = list(MODEL_DIR.rglob("last.pt"))
        if not candidates:
            raise FileNotFoundError(
                "No checkpoint found. Provide a path or train first."
            )
        checkpoint_path = str(candidates[0])

    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint_path}")

    logger.info(f"Resuming training from {checkpoint_path}")
    model = YOLO(checkpoint_path)
    model.train(resume=True)

    return {"status": "resumed", "checkpoint": checkpoint_path}
