#!/opt/anaconda3/bin/python3
import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import os

# Helper function to train and save model
def train_and_save_model(file_path, target_col, time_col, model_name, feature_cols=None):
    print(f"\n--- Training {model_name} ---")
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        return

    # 1. Preprocessing
    df[time_col] = pd.to_datetime(df[time_col])
    df = df.sort_values(by=time_col)
    
    # 2. Feature Engineering
    df['hour'] = df[time_col].dt.hour
    df['day_of_week'] = df[time_col].dt.dayofweek
    df['month'] = df[time_col].dt.month
    
    # Lag Features (Previous values)
    # We predict current value based on previous 1, 2, 3 time steps
    df['lag_1'] = df[target_col].shift(1)
    df['lag_2'] = df[target_col].shift(2)
    df['lag_3'] = df[target_col].shift(3)
    
    # Rolling Mean (Moving Average)
    df['rolling_mean_3'] = df[target_col].rolling(window=3).mean().shift(1)
    
    # Drop NaNs created by lagging
    df = df.dropna()
    
    # Define Features and Target
    features = ['hour', 'day_of_week', 'month', 'lag_1', 'lag_2', 'lag_3', 'rolling_mean_3']
    
    X = df[features]
    y = df[target_col]
    
    # 3. Train/Test Split (Time-based split: Train on past, Test on future)
    # shuffle=False ensures we don't leak future data into training
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)
    
    # 4. Train Model
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # 5. Evaluate
    predictions = model.predict(X_test)
    mse = mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)
    
    print(f"Model: {model_name}")
    print(f"MSE: {mse:.4f}")
    print(f"R2 Score: {r2:.4f}")
    
    # 6. Save Model
    with open(f"{model_name}.pkl", 'wb') as f:
        pickle.dump(model, f)
    print(f"Saved to {model_name}.pkl")

# --- Train All Models ---

# 1. Garbage Model
train_and_save_model(
    file_path='smart_bin_vadodara.csv', 
    target_col='fill_level_percent', 
    time_col='timestamp', 
    model_name='garbage_model'
)

# 2. Traffic Model
train_and_save_model(
    file_path='vadodara_traffic_speed.csv', 
    target_col='average_speed', 
    time_col='timestamp', 
    model_name='traffic_model'
)

# 3. Flood/Water Model
# Note: Flood sensor might have duplicates or multiple sensors. 
# For simplicity, we'll average if there are multiple sensors per timestamp, or just take the whole dataset if it's cleaner.
# Let's handle 'flood_sensor_vadodara.csv' directly.
train_and_save_model(
    file_path='flood_sensor_vadodara.csv', 
    target_col='water_level_ft', 
    time_col='timestamp', 
    model_name='water_model'
)

# 4. Power/Voltage Model
train_and_save_model(
    file_path='power_fluctuations_vadodara.csv', 
    target_col='voltage_v', 
    time_col='timestamp', 
    model_name='voltage_model'
)
