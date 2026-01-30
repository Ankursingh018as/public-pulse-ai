#!/opt/anaconda3/bin/python3
import pandas as pd
import numpy as np
import pickle
import matplotlib.pyplot as plt
import seaborn as sns

def visualize_anomalies(file_path, target_col, time_col, model_name, title, preprocessing_func=None):
    print(f"\n--- Visualizing {model_name} ---")
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        return

    # Preprocessing (Must match training)
    df[time_col] = pd.to_datetime(df[time_col], errors='coerce')
    df = df.dropna(subset=[time_col])
    df = df.sort_values(by=time_col)
    
    if preprocessing_func:
        df = preprocessing_func(df, time_col, target_col)
    
    # Load Model
    try:
        with open(f"{model_name}.pkl", 'rb') as f:
            model = pickle.load(f)
    except FileNotFoundError:
        print(f"Model {model_name}.pkl not found.")
        return
    
    # Predict Anomalies
    X = df[[target_col]].values
    df['anomaly'] = model.predict(X) 
    # -1 means anomaly, 1 means normal
    
    anomalies = df[df['anomaly'] == -1]
    
    # Plot
    plt.figure(figsize=(12, 6))
    plt.plot(df[time_col], df[target_col], label='Normal', color='blue', alpha=0.6)
    
    # Highlight anomalies
    plt.scatter(anomalies[time_col], anomalies[target_col], color='red', label='Anomaly', s=50, zorder=5)
    
    plt.title(f"{title} - Anomaly Detection")
    plt.xlabel("Time")
    plt.ylabel(target_col)
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f"{model_name}_plot.png")
    print(f"Plot saved to {model_name}_plot.png")
    print(f"Detected {len(anomalies)} anomalies out of {len(df)} samples.")

# --- Custom Preprocessing (Same as training) ---
def aggregate_message_volume(df, time_col, target_col):
    df = df.set_index(time_col)
    df_resampled = df.resample('h').size().reset_index(name=target_col)
    df_resampled[target_col] = df_resampled[target_col].fillna(0)
    return df_resampled

# Run Validations
visualize_anomalies('vadodara_traffic_speed.csv', 'average_speed', 'timestamp', 'traffic_anomaly', 'Traffic Speed Anomalies')
visualize_anomalies('flood_sensor_vadodara.csv', 'water_level_ft', 'timestamp', 'water_anomaly', 'Flood Sensor Anomalies')
visualize_anomalies('smart_bin_vadodara.csv', 'fill_level_percent', 'timestamp', 'garbage_anomaly', 'Garbage Bin Anomalies')
visualize_anomalies('vadodara_complaints.csv', 'message_count', 'timestamp', 'message_volume_anomaly', 'Complaint Volume Anomalies', preprocessing_func=aggregate_message_volume)
