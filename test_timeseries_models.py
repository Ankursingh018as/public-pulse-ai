#!/opt/anaconda3/bin/python3
import pandas as pd
import numpy as np
import pickle

def load_and_predict(model_name, input_features, feature_names):
    """
    Loads a model and predicts based on input features.
    input_features: list/array of feature values
    feature_names: list of feature names used during training
    """
    try:
        with open(f"{model_name}.pkl", 'rb') as f:
            model = pickle.load(f)
    except FileNotFoundError:
        print(f"Error: Model {model_name}.pkl not found.")
        return

    # Create DataFrame for prediction to match feature names
    input_df = pd.DataFrame([input_features], columns=feature_names)
    prediction = model.predict(input_df)[0]
    return prediction

# Features used during training: 
# ['hour', 'day_of_week', 'month', 'lag_1', 'lag_2', 'lag_3', 'rolling_mean_3']

feature_cols = ['hour', 'day_of_week', 'month', 'lag_1', 'lag_2', 'lag_3', 'rolling_mean_3']

print("--- Testing Civic Prediction Models ---")

# 1. Garbage Prediction Test
# Scenario: 10 AM, Monday, Jan. Bin was 80% full an hour ago, 75% 2 hours ago, 70% 3 hours ago.
# Trend: Filling up fast.
garbage_input = [10, 0, 1, 80.0, 75.0, 70.0, 75.0] 
pred_garbage = load_and_predict('garbage_model', garbage_input, feature_cols)
print(f"\n[Garbage Bin Scenario]")
print(f"Input: 10 AM, Mon, Jan. Past levels: 80% -> 75% -> 70%")
print(f"Predicted Future Level: {pred_garbage:.2f}% (Expected: > 80%)")

# 2. Traffic Prediction Test
# Scenario: 6 PM (Rush Hour), Friday, Oct. Speed was 20 km/h, 22 km/h, 25 km/h.
# Trend: Slowing down due to rush hour.
traffic_input = [18, 4, 10, 20.0, 22.0, 25.0, 22.3]
pred_traffic = load_and_predict('traffic_model', traffic_input, feature_cols)
print(f"\n[Traffic Speed Scenario]")
print(f"Input: 6 PM (Rush Hour), Fri, Oct. Past speeds: 20 -> 22 -> 25 km/h")
print(f"Predicted Speed: {pred_traffic:.2f} km/h (Expected: low speed)")

# 3. Water Level Prediction Test
# Scenario: Monsoon (July), Heavy Rain. Level: 28 ft (Danger), 27 ft, 26 ft.
# Trend: Rising rapidly.
water_input = [14, 2, 7, 28.0, 27.0, 26.0, 27.0]
pred_water = load_and_predict('water_model', water_input, feature_cols)
print(f"\n[Flood Water Level Scenario]")
print(f"Input: 2 PM, July (Monsoon). Past levels: 28ft -> 27ft -> 26ft")
print(f"Predicted Level: {pred_water:.2f} ft (Expected: > 28ft)")

# 4. Voltage Prediction Test
# Scenario: Night (9 PM). Voltage: 210V, 215V, 220V.
voltage_input = [21, 3, 5, 210.0, 215.0, 220.0, 215.0]
pred_voltage = load_and_predict('voltage_model', voltage_input, feature_cols)
print(f"\n[Streetlight Voltage Scenario]")
print(f"Input: 9 PM. Past voltages: 210V -> 215V -> 220V")
print(f"Predicted Voltage: {pred_voltage:.2f} V")
