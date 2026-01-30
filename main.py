#!/opt/anaconda3/bin/python3
import pandas as pd
import numpy as np
import pickle
import sys

def load_pickle(path):
    try:
        with open(path, 'rb') as f:
            return pickle.load(f)
    except FileNotFoundError:
        print(f"Error: Model file '{path}' not found. Please run training scripts first.")
        sys.exit(1)

def run_nlp_classifier():
    print("\n--- NLP CITIZEN ISSUE CLASSIFIER ---")
    model = load_pickle('civic_classifier_model.pkl')
    
    cities = ["garbage_overflow", "traffic_jam", "streetlight_failure", "waterlogging", 
              "construction_related", "weather_alert", "noise/irrelevant"]
    
    while True:
        text = input("\nEnter citizen complaint (or 'q' to quit): ")
        if text.lower() == 'q': break
        
        pred = model.predict([text])[0]
        print(f"-> Classified as: {pred.upper()}")

def run_timeseries_forecaster():
    print("\n--- TIME-SERIES FORECASTING ---")
    print("Available Models: garbage, traffic, water, voltage")
    
    model_type = input("Choose model type: ").strip().lower()
    mapping = {
        'garbage': 'garbage_model.pkl',
        'traffic': 'traffic_model.pkl',
        'water': 'water_model.pkl',
        'voltage': 'voltage_model.pkl'
    }
    
    if model_type not in mapping:
        print("Invalid model type.")
        return
        
    model = load_pickle(mapping[model_type])
    
    print("\nEnter recent values (comma separated, oldest to newest).")
    print("Format: hour (0-23), day (0-6), month (1-12), val_1hr_ago, val_2hr_ago, val_3hr_ago, rolling_mean")
    print("Example (Garbage): 10, 0, 1, 80, 75, 70, 75")
    
    vals = input("Input vector: ").split(',')
    if len(vals) != 7:
        print(f"Error: Expected 7 values, got {len(vals)}")
        return
        
    try:
        input_data = [float(v.strip()) for v in vals]
        features = ['hour', 'day_of_week', 'month', 'lag_1', 'lag_2', 'lag_3', 'rolling_mean_3']
        df = pd.DataFrame([input_data], columns=features)
        
        pred = model.predict(df)[0]
        print(f"-> Forecasted Value: {pred:.2f}")
    except ValueError:
        print("Error: Please enter numeric values.")

def run_anomaly_detector():
    print("\n--- ANOMALY DETECTOR ---")
    print("Available Models: traffic, water, garbage, message")
    
    model_type = input("Choose model type: ").strip().lower()
    mapping = {
        'traffic': 'traffic_anomaly.pkl',
        'water': 'water_anomaly.pkl',
        'garbage': 'garbage_anomaly.pkl',
        'message': 'message_volume_anomaly.pkl'
    }
    
    if model_type not in mapping:
        print("Invalid model type.")
        return
        
    model = load_pickle(mapping[model_type])
    
    val_str = input("Enter current value to check (e.g. Traffic speed 10, or Water level 200): ")
    try:
        val = float(val_str)
        # Isolation Forest expects shape (n_samples, n_features)
        pred = model.predict([[val]])[0]
        
        status = "ANOMALY DETECTED! 🚨" if pred == -1 else "Normal Status ✅"
        print(f"-> Result: {status}")
    except ValueError:
        print("Invalid number.")

def main():
    print("================================")
    print("   CIVIC MODEL PREDICTION CLI   ")
    print("================================")
    print("1. Text Classification (NLP)")
    print("2. Future Forecast (Time-Series)")
    print("3. Anomaly Detection")
    print("4. Exit")
    
    choice = input("\nSelect Option (1-4): ")
    
    if choice == '1':
        run_nlp_classifier()
    elif choice == '2':
        run_timeseries_forecaster()
    elif choice == '3':
        run_anomaly_detector()
    elif choice == '4':
        print("Exiting...")
    else:
        print("Invalid choice.")

if __name__ == "__main__":
    main()
