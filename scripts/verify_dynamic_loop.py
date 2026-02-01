import requests
import time
import json

API_URL = "http://localhost:3000/api/v1"

def verify_loop():
    print("🔄 Starting Dynamic Loop Verification...")

    # 1. Get initial prediction count
    try:
        res = requests.get(f"{API_URL}/predictions")
        initial_count = len(res.json()['data'])
        print(f"📊 Initial Predictions: {initial_count}")
    except Exception as e:
        print(f"❌ Failed to reach API: {e}")
        return

    # 2. Trigger Simulation (like clicking the button)
    print("🚀 Triggering 'Traffic Pulse' Simulation...")
    payload = {
        "text": "Emergent Traffic cluster detected at Verification Junction",
        "source": "simulation_console",
        "metadata": { "simulated": True, "urgent": True }
    }
    
    try:
        res = requests.post(f"{API_URL}/report", json=payload)
        if res.status_code == 201:
            print("✅ Report sent successfully.")
        else:
            print(f"❌ Report failed: {res.text}")
            return
    except Exception as e:
        print(f"❌ Failed to send report: {e}")
        return

    # 3. Wait for AI Engine (approx 3-5 seconds)
    print("⏳ Waiting for AI Engine to process...")
    time.sleep(5)

    # 4. Check for new prediction
    try:
        res = requests.get(f"{API_URL}/predictions")
        final_data = res.json()['data']
        final_count = len(final_data)
        print(f"📊 Final Predictions: {final_count}")

        if final_count > initial_count:
            print("✅ SUCCESS: AI Engine generated a new prediction dynamically!")
            # Find the new prediction
            new_pred = final_data[0] # Usually sorted by date desc
            print(f"🆕 New Prediction: {new_pred['event_type']} in {new_pred['area_name']} (Confidence: {new_pred['probability']})")
        else:
            print("⚠️ WARNING: No new prediction found. AI Engine might not be running or polling interval is too slow.")

    except Exception as e:
        print(f"❌ Failed to check predictions: {e}")

if __name__ == "__main__":
    verify_loop()
