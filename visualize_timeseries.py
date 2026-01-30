#!/opt/anaconda3/bin/python3
import pandas as pd
import numpy as np
import pickle
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

def evaluate_and_plot(file_path, target_col, time_col, model_name, title):
    print(f"\n--- Evaluating {model_name} ---")
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        return

    # 1. Preprocessing (Must match training)
    df[time_col] = pd.to_datetime(df[time_col])
    df = df.sort_values(by=time_col)
    
    df['hour'] = df[time_col].dt.hour
    df['day_of_week'] = df[time_col].dt.dayofweek
    df['month'] = df[time_col].dt.month
    
    df['lag_1'] = df[target_col].shift(1)
    df['lag_2'] = df[target_col].shift(2)
    df['lag_3'] = df[target_col].shift(3)
    df['rolling_mean_3'] = df[target_col].rolling(window=3).mean().shift(1)
    
    df = df.dropna()
    
    features = ['hour', 'day_of_week', 'month', 'lag_1', 'lag_2', 'lag_3', 'rolling_mean_3']
    X = df[features]
    y = df[target_col]
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    # Load Model
    try:
        with open(f"{model_name}.pkl", 'rb') as f:
            model = pickle.load(f)
    except FileNotFoundError:
        print(f"Model file {model_name}.pkl not found.")
        return

    # Predict
    predictions = model.predict(X_test)
    
    # Metrics
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    print(f"MSE: {mse:.4f}, R2: {r2:.4f}")
    
    # Plot
    plt.figure(figsize=(12, 6))
    plt.plot(y_test.values, label='Actual', color='blue', alpha=0.7)
    plt.plot(predictions, label='Predicted', color='red', alpha=0.7, linestyle='--')
    plt.title(f"{title} - Actual vs Predicted\n(MSE: {mse:.2f}, R2: {r2:.2f})")
    plt.xlabel("Time Steps (Test Set)")
    plt.ylabel(target_col)
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(f"{model_name}_plot.png")
    print(f"Plot saved to {model_name}_plot.png")

# Run for all
evaluate_and_plot('smart_bin_vadodara.csv', 'fill_level_percent', 'timestamp', 'garbage_model', 'Garbage Fill Level')
evaluate_and_plot('vadodara_traffic_speed.csv', 'average_speed', 'timestamp', 'traffic_model', 'Traffic Speed')
evaluate_and_plot('flood_sensor_vadodara.csv', 'water_level_ft', 'timestamp', 'water_model', 'Water Level')
evaluate_and_plot('power_fluctuations_vadodara.csv', 'voltage_v', 'timestamp', 'voltage_model', 'Streetlight Voltage')
