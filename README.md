# Civic Intelligence Models

This directory contains three types of Machine Learning models for Vadodara's civic data.

## 1. Models Overview

| Type | Script | Description |
| :--- | :--- | :--- |
| **NLP Classifier** | `train_civic_model.py` | Classifies text (WhatsApp/News) into categories like `garbage_overflow`, `traffic_jam`. |
| **Time-Series** | `train_timeseries_models.py` | Predicts future values for Garbage, Traffic, Water, Voltage. |
| **Anomaly** | `train_anomaly_models.py` | Detects outliers (speed drops, water spikes) using Isolation Forest. |

## 2. One-Stop Prediction Tool

Run the interactive CLI to test any model:

```bash
chmod +x main.py
./main.py
```

## 3. Individual Usage

### NLP Classifier
Train:
```bash
./train_civic_model.py
```
Test:
```bash
./test_civic_model.py
```

### Time-Series Forecasting
Train:
```bash
./train_timeseries_models.py
```
Test/Verify:
```bash
./test_timeseries_models.py
```
Visualize:
```bash
./visualize_timeseries.py
```

### Anomaly Detection
Train:
```bash
./train_anomaly_models.py
```
Visualize (Graphs with Red Dots):
```bash
./visualize_anomalies.py
```

## 4. Requirements
- Python 3
- scikit-learn
- pandas
- numpy
- matplotlib
- seaborn
