#!/opt/anaconda3/bin/python3
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import pickle
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split

# 1. Load Data & Preprocessing
print("Loading data for visualization...")
try:
    df_civic = pd.read_csv('vadodara_civic_text_dataset.csv')
    df_complaints = pd.read_csv('vadodara_complaints.csv')
except FileNotFoundError:
    print("Error: Files not found.")
    exit()

label_mapping = {
    'Garbage': 'garbage_overflow', 'Sanitation': 'garbage_overflow', 'Overflowing dustbin': 'garbage_overflow',
    'Burning garbage': 'garbage_overflow', 'Garbage not collected': 'garbage_overflow',
    'Traffic': 'traffic_jam', 'Traffic jam': 'traffic_jam', 'Wrong side driving': 'traffic_jam', 'Illegal parking': 'traffic_jam',
    'Streetlight': 'streetlight_failure', 'Street Lights': 'streetlight_failure', 'Light not working': 'streetlight_failure',
    'Dark spot': 'streetlight_failure', 'Blinking light': 'streetlight_failure', 'Pole damaged': 'streetlight_failure',
    'Waterlogging': 'waterlogging', 'Drainage': 'waterlogging', 'Clogged drain': 'waterlogging', 'Overflowing manhole': 'waterlogging',
    'Encroachment': 'construction_related', 'Road': 'construction_related', 'Roads': 'construction_related',
    'Potholes': 'construction_related', 'Resurfacing needed': 'construction_related', 'Illegal construction': 'construction_related',
    'Footpath blocked': 'construction_related', 'Broken divider': 'construction_related', 'Open manhole': 'construction_related',
    'Stray Animals': 'noise/irrelevant', 'Cattle on road': 'noise/irrelevant', 'Stray dog menace': 'noise/irrelevant',
    'Dead animal on road': 'noise/irrelevant', 'Water': 'noise/irrelevant', 'Water Supply': 'noise/irrelevant',
    'No water supply': 'noise/irrelevant', 'Contaminated water': 'noise/irrelevant', 'Low pressure': 'noise/irrelevant',
    'Pipeline leakage': 'noise/irrelevant', 'Pollution': 'noise/irrelevant', 'Bad smell': 'noise/irrelevant',
    'Hawkers on road': 'noise/irrelevant', 'Traffic signal not working': 'traffic_jam', 'Illegal speed breaker': 'construction_related',
}

data = []
for _, row in df_civic.iterrows():
    data.append({'text': row['text'], 'label': label_mapping.get(row['category'], 'noise/irrelevant')})

for _, row in df_complaints.iterrows():
    cat = row['category']
    sub_cat = row['sub_category']
    if sub_cat in label_mapping: label = label_mapping[sub_cat]
    elif cat in label_mapping: label = label_mapping[cat]
    else: label = 'noise/irrelevant'
    data.append({'text': row['description'], 'label': label})

synthetic_data = [
    ("Heavy rain warning issued for Vadodara", "weather_alert"),
    ("Thunderstorm alert: stay indoors", "weather_alert"),
    ("IMD predicts cyclonic storm approaching Gujarat coast", "weather_alert"),
    ("Red alert for heavy rainfall", "weather_alert"),
    ("Heatwave warning: temperatures to cross 45 degrees", "weather_alert"),
    ("Flash flood warning", "weather_alert"),
    ("Barish aa rahi hai, Waghodia me paani bhar sakta hai", "weather_alert"),
    ("Strong winds expected tonight", "weather_alert"),
    ("Weather forecast: heavy showers", "weather_alert"),
    ("Alert: Cyclone warning", "weather_alert"),
    ("Road digging work started on Alkapuri main road", "construction_related"),
    ("Fiber laying construction on Ajwa Road", "construction_related"),
    ("Bridge construction causing diversions", "construction_related"),
    ("Metro rail work in progress", "construction_related"),
    ("Building material dumped on roadside", "construction_related"),
    ("Potholes everywhere in Karelibaug", "construction_related"),
    ("Road resurfacing pending", "construction_related"),
    ("Manjalpur dustbin overflow ho raha hai", "garbage_overflow"),
    ("Kachra peti full hai", "garbage_overflow"),
    ("Garbage truck did not come today", "garbage_overflow"),
    ("Dustbins flowing over on the street", "garbage_overflow"),
    ("Pile of trash near market", "garbage_overflow"),
    ("Garbage burning near school", "garbage_overflow"),
    ("Gotri road jam hai", "traffic_jam"),
    ("Huge traffic at Genda circle", "traffic_jam"),
    ("Fass gaya hu traffic me", "traffic_jam"),
    ("Traffic is not moving at all", "traffic_jam"),
    ("Stuck in traffic for 1 hour", "traffic_jam"),
    ("Heavy congestion on highway", "traffic_jam"),
    (" bumper to bumper traffic", "traffic_jam"),
    ("Streetlight blink ho rahi hai – Ajwa Road", "streetlight_failure"),
    ("Andhera hai road pe, light band hai", "streetlight_failure"),
    ("Street lights not working in Atladara", "streetlight_failure"),
    ("Pani bhar gaya hai society me", "waterlogging"),
    ("Water logging near railway station", "waterlogging"),
    ("Knee deep water in Karelibaug", "waterlogging"),
    ("Road is flooded with rainwater", "waterlogging"),
]

for _ in range(20):
    for text, label in synthetic_data:
        data.append({'text': text, 'label': label})

df = pd.DataFrame(data)

_, X_test, _, y_test = train_test_split(df['text'], df['label'], test_size=0.1, random_state=42)

with open('civic_classifier_model.pkl', 'rb') as f:
    model = pickle.load(f)

y_pred = model.predict(X_test)

# --- 1. Confusion Matrix ---
labels = sorted(list(set(y_test)))
cm = confusion_matrix(y_test, y_pred, labels=labels)

plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', xticklabels=labels, yticklabels=labels, cmap='Blues')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Actual vs Predicted - Confusion Matrix')
plt.xticks(rotation=45, ha='right')
plt.tight_layout()
plt.savefig('civic_model_confusion_matrix.png')
print("Heatmap saved as 'civic_model_confusion_matrix.png'")

# --- 2. Line Graph (Actual vs Predicted Counts) ---
plt.figure(figsize=(12, 6))

# Calculate counts
actual_counts = pd.Series(y_test).value_counts().sort_index()
predicted_counts = pd.Series(y_pred).value_counts().sort_index()

# Align indices to ensure plotting works even if some classes are missing in one set (unlikely with this data)
all_labels = sorted(list(set(actual_counts.index) | set(predicted_counts.index)))
actual_counts = actual_counts.reindex(all_labels, fill_value=0)
predicted_counts = predicted_counts.reindex(all_labels, fill_value=0)

# Plot
plt.plot(all_labels, actual_counts.values, marker='o', linestyle='-', linewidth=2, label='Actual Count', color='blue')
plt.plot(all_labels, predicted_counts.values, marker='x', linestyle='--', linewidth=2, label='Predicted Count', color='red')

plt.xlabel('Categories')
plt.ylabel('Number of Samples')
plt.title('Actual vs Predicted Counts per Category')
plt.xticks(rotation=45, ha='right')
plt.legend()
plt.grid(True, linestyle='--', alpha=0.7)
plt.tight_layout()
plt.savefig('civic_model_line_graph.png')
print("Line graph saved as 'civic_model_line_graph.png'")
