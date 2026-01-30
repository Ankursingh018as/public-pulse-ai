#!/opt/anaconda3/bin/python3
import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import IsolationForest
import os
import warnings
warnings.filterwarnings('ignore')

# Helper function to train and save Isolation Forest model
def train_anomaly_model(file_path, target_col, time_col, model_name, preprocessing_func=None):
    print(f"\n--- Training {model_name} ---")
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        return

    # Standard Preprocessing
    # Handle mixed types or parsing errors broadly
    try:
        df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
    except Exception as e:
        print(f"Date parsing error: {e}")
        return
        
    df = df.dropna(subset=[time_col])
    df = df.sort_values(by=time_col)
    
    # Custom Preprocessing (e.g., aggregation)
    # This must return a DF with the 'target_col' ready for training
    if preprocessing_func:
        df = preprocessing_func(df, time_col, target_col)
    
    # Prepare Data for Isolation Forest
    # We use the target column reshaped
    X = df[[target_col]].values
    
    # Train Isolation Forest
    # contamination='auto' or 0.05 (assuming 5% anomalies)
    model = IsolationForest(contamination=0.05, random_state=42)
    model.fit(X)
    
    # Save Model
    with open(f"{model_name}.pkl", 'wb') as f:
        pickle.dump(model, f)
    print(f"Saved to {model_name}.pkl")

# --- Custom Preprocessing Functions ---

def aggregate_message_volume(df, time_col, target_col):
    """Aggregates messages by hour to create a 'message_count' column."""
    # Group by hour
    df = df.set_index(time_col)
    # Resample to hourly counts
    df_resampled = df.resample('h').size().reset_index(name=target_col)
    # Fill missing hours with 0
    df_resampled[target_col] = df_resampled[target_col].fillna(0)
    return df_resampled

# --- Train All Models ---

# 1. Traffic Anomaly (Sudden speed drops/spikes)
train_anomaly_model(
    file_path='vadodara_traffic_speed.csv', 
    target_col='average_speed', 
    time_col='timestamp', 
    model_name='traffic_anomaly'
)

# 2. Water/Flood Anomaly (Sudden level spikes)
train_anomaly_model(
    file_path='flood_sensor_vadodara.csv', 
    target_col='water_level_ft', 
    time_col='timestamp', 
    model_name='water_anomaly'
)

# 3. Garbage Anomaly (Sudden fills)
train_anomaly_model(
    file_path='smart_bin_vadodara.csv', 
    target_col='fill_level_percent', 
    time_col='timestamp', 
    model_name='garbage_anomaly'
)

# 4. Message Volume Anomaly (Spike in complaints)
# USING vadodara_complaints.csv because it has timestamps
train_anomaly_model(
    file_path='vadodara_complaints.csv', 
    target_col='message_count', # New column created by aggregation
    time_col='timestamp',
    model_name='message_volume_anomaly',
    preprocessing_func=aggregate_message_volume
)
