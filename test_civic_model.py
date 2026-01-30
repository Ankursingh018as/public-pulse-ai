#!/opt/anaconda3/bin/python3
import pickle
import pandas as pd

# Load Model
try:
    with open('civic_classifier_model.pkl', 'rb') as f:
        model = pickle.load(f)
except FileNotFoundError:
    print("Error: 'civic_classifier_model.pkl' not found.")
    exit()

# Test Cases (from user)
test_cases = [
    ("Manjalpur dustbin overflow ho raha hai", "garbage_overflow"),
    ("Gotri road jam hai", "traffic_jam"),
    ("Streetlight blink ho rahi hai – Ajwa Road", "streetlight_failure"),
    ("Barish aa rahi hai, Waghodia me paani bhar sakta hai", "weather_alert"), # Or waterlogging if it's about potential filling? But "warning" tone -> weather/waterlogging
    ("Fiber laying construction on Ajwa Road", "construction_related"),
    ("Heavy rain warning issued", "weather_alert"),
    # Extra ones
    ("There is a dead dog on the highway", "noise/irrelevant"),
    ("No water supply in my area since morning", "noise/irrelevant"),
    ("Potholes everywhere in Karelibaug", "construction_related"),
    ("Traffic is not moving at all near station", "traffic_jam"),
    ("Garbage burning near school", "garbage_overflow"),
]

print(f"{'Text':<50} | {'Predicted':<20} | {'Expected':<20} | {'Status'}")
print("-" * 105)

correct = 0
for text, expected in test_cases:
    prediction = model.predict([text])[0]
    status = "✅" if prediction == expected else "❌"
    if prediction == expected:
        correct += 1
    print(f"{text:<50} | {prediction:<20} | {expected:<20} | {status}")

print("-" * 105)
print(f"Accuracy on test cases: {correct}/{len(test_cases)} ({correct/len(test_cases)*100:.1f}%)")
