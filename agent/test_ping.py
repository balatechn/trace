"""
Test script to simulate agent ping for a device
This makes the device show as Online in the dashboard
"""
import requests
import sys

# Configuration
SERVER_URL = "http://localhost:8000/api/v1"
SERIAL_NUMBER = "PF50AX1B"  # Must match the device in the database
ASSET_ID = "Laptop-001"     # Must match the device in the database

def register_device():
    """Register the agent with the server"""
    url = f"{SERVER_URL}/agent/register"
    payload = {
        "serial_number": SERIAL_NUMBER,
        "asset_id": ASSET_ID,
        "device_name": "BALA Laptop",
        "manufacturer": "Dell",
        "model": "Latitude 5520",
        "os_name": "Windows",
        "os_version": "11",
        "agent_version": "1.0.0"
    }
    
    print(f"Registering device: {SERIAL_NUMBER} / {ASSET_ID}")
    response = requests.post(url, json=payload, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Registration successful!")
        print(f"   Device ID: {data.get('device_id')}")
        return data.get('agent_token')
    else:
        print(f"❌ Registration failed: {response.status_code}")
        print(f"   {response.text}")
        return None

def send_ping(token: str):
    """Send a location ping to update device status"""
    url = f"{SERVER_URL}/agent/ping"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "latitude": 13.0674,   # Chennai, India (from user's location)
        "longitude": 80.2376,
        "accuracy": 10.0,
        "location_source": "IP",
        "ip_address": "192.168.1.100",
        "battery_level": 85.0,
        "is_charging": False,
        "agent_version": "1.0.0"
    }
    
    print(f"Sending location ping...")
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    
    if response.status_code == 200:
        print(f"✅ Ping successful! Device is now ONLINE")
        print(f"   Location: {payload['latitude']}, {payload['longitude']}")
    else:
        print(f"❌ Ping failed: {response.status_code}")
        print(f"   {response.text}")

if __name__ == "__main__":
    print("=" * 50)
    print("  Trace Agent Simulator")
    print("=" * 50)
    print()
    
    # Step 1: Register
    token = register_device()
    
    if token:
        print()
        # Step 2: Send ping
        send_ping(token)
        print()
        print("🎉 Refresh the Devices page to see the device Online!")
    else:
        print()
        print("Note: If already registered, you need the stored token.")
        print("Try running the real agent or contact your admin.")
