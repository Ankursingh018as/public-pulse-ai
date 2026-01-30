#!/opt/anaconda3/bin/python3
import pandas as pd
import numpy as np
import re
import pickle
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB, ComplementNB
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# 1. Load Data
print("Loading datasets...")
try:
    df_civic = pd.read_csv('vadodara_civic_text_dataset.csv')
    df_complaints = pd.read_csv('vadodara_complaints.csv')
except FileNotFoundError:
    print("Error: files not found. Please ensure 'vadodara_civic_text_dataset.csv' and 'vadodara_complaints.csv' are in the current directory.")
    exit()

# 2. Define Mapping
# User Labels: garbage_overflow, traffic_jam, streetlight_failure, waterlogging, construction_related, weather_alert, noise/irrelevant

label_mapping = {
    # Valid Mappings
    'Garbage': 'garbage_overflow',
    'Sanitation': 'garbage_overflow',
    'Overflowing dustbin': 'garbage_overflow',
    'Burning garbage': 'garbage_overflow',
    'Garbage not collected': 'garbage_overflow',
    
    'Traffic': 'traffic_jam',
    'Traffic jam': 'traffic_jam',
    'Wrong side driving': 'traffic_jam',
    'Illegal parking': 'traffic_jam',
    
    'Streetlight': 'streetlight_failure',
    'Street Lights': 'streetlight_failure',
    'Light not working': 'streetlight_failure',
    'Dark spot': 'streetlight_failure',
    'Blinking light': 'streetlight_failure',
    'Pole damaged': 'streetlight_failure',
    
    'Waterlogging': 'waterlogging',
    'Drainage': 'waterlogging',
    'Clogged drain': 'waterlogging',
    'Overflowing manhole': 'waterlogging',
    
    'Encroachment': 'construction_related',
    'Road': 'construction_related',
    'Roads': 'construction_related',
    'Potholes': 'construction_related',
    'Resurfacing needed': 'construction_related',
    'Illegal construction': 'construction_related',
    'Footpath blocked': 'construction_related',
    'Broken divider': 'construction_related',
    'Open manhole': 'construction_related',
    
    # Everything else maps to 'noise/irrelevant'
    'Stray Animals': 'noise/irrelevant',
    'Cattle on road': 'noise/irrelevant',
    'Stray dog menace': 'noise/irrelevant',
    'Dead animal on road': 'noise/irrelevant',
    'Water': 'noise/irrelevant',
    'Water Supply': 'noise/irrelevant',
    'No water supply': 'noise/irrelevant',
    'Contaminated water': 'noise/irrelevant',
    'Low pressure': 'noise/irrelevant',
    'Pipeline leakage': 'noise/irrelevant',
    'Pollution': 'noise/irrelevant',
    'Bad smell': 'noise/irrelevant',
    'Hawkers on road': 'noise/irrelevant',
    'Traffic signal not working': 'traffic_jam',
    'Illegal speed breaker': 'construction_related',
}

# 3. Prepare Data
data = []

# Process Civic Text Dataset
for _, row in df_civic.iterrows():
    text = row['text']
    cat = row['category']
    label = label_mapping.get(cat, 'noise/irrelevant')
    data.append({'text': text, 'label': label})

# Process Complaints Dataset
for _, row in df_complaints.iterrows():
    text = row['description']
    cat = row['category']
    sub_cat = row['sub_category']
    
    if sub_cat in label_mapping:
        label = label_mapping[sub_cat]
    elif cat in label_mapping:
        label = label_mapping[cat]
    else:
        label = 'noise/irrelevant'
        
    data.append({'text': text, 'label': label})

# 4. Data Augmentation (Synthetic Data)
# Added more variations and duplicates for weight
synthetic_data = [
    # weather_alert
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
    
    # construction_related
    ("Road digging work started on Alkapuri main road", "construction_related"),
    ("Fiber laying construction on Ajwa Road", "construction_related"),
    ("Bridge construction causing diversions", "construction_related"),
    ("Metro rail work in progress", "construction_related"),
    ("Building material dumped on roadside", "construction_related"),
    ("Potholes everywhere in Karelibaug", "construction_related"),
    ("Road resurfacing pending", "construction_related"),
    
    # garbage_overflow
    ("Manjalpur dustbin overflow ho raha hai", "garbage_overflow"),
    ("Kachra peti full hai", "garbage_overflow"),
    ("Garbage truck did not come today", "garbage_overflow"),
    ("Dustbins flowing over on the street", "garbage_overflow"),
    ("Pile of trash near market", "garbage_overflow"),
    ("Garbage burning near school", "garbage_overflow"),
    
    # traffic_jam
    ("Gotri road jam hai", "traffic_jam"),
    ("Huge traffic at Genda circle", "traffic_jam"),
    ("Fass gaya hu traffic me", "traffic_jam"),
    ("Traffic is not moving at all", "traffic_jam"),
    ("Stuck in traffic for 1 hour", "traffic_jam"),
    ("Heavy congestion on highway", "traffic_jam"),
    (" bumper to bumper traffic", "traffic_jam"),
    
    # streetlight_failure
    ("Streetlight blink ho rahi hai – Ajwa Road", "streetlight_failure"),
    ("Andhera hai road pe, light band hai", "streetlight_failure"),
    ("Street lights not working in Atladara", "streetlight_failure"),
    
    # waterlogging
    ("Pani bhar gaya hai society me", "waterlogging"),
    ("Water logging near railway station", "waterlogging"),
    ("Knee deep water in Karelibaug", "waterlogging"),
    ("Road is flooded with rainwater", "waterlogging"),
]

# Oversample synthetic data (repeat 20 times to boost signal)
for _ in range(20):
    for text, label in synthetic_data:
        data.append({'text': text, 'label': label})

# Create DataFrame
df = pd.DataFrame(data)
print(f"Total samples: {len(df)}")
print(df['label'].value_counts())

# 5. Train Model
X_train, X_test, y_train, y_test = train_test_split(df['text'], df['label'], test_size=0.1, random_state=42) # reduced test size to keep more for training

# Pipeline: TF-IDF -> ComplementNB (Better for imbalanced data)
model = make_pipeline(TfidfVectorizer(ngram_range=(1,3)), ComplementNB()) # Used ngram 1-3 to catch phrases like "overflow ho raha hai"

print("\nTraining model...")
model.fit(X_train, y_train)

# 6. Evaluate
print("\nEvaluating model...")
predicted = model.predict(X_test)
print(classification_report(y_test, predicted))

# 7. Save Model
print("Saving model artifacts...")
with open('civic_classifier_model.pkl', 'wb') as f:
    pickle.dump(model, f)

print("Done! Model saved to 'civic_classifier_model.pkl'")
