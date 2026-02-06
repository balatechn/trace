"""
Update device location with correct coordinates
"""
import requests

SERVER_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@yourcompany.com"
ADMIN_PASSWORD = "Admin123!"

# Chennai coordinates (from user's Google Maps link)
NEW_LATITUDE = 13.0674
NEW_LONGITUDE = 80.2376

def main():
    # Login as admin
    print("Logging in as admin...")
    login_res = requests.post(f"{SERVER_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get devices
    devices_res = requests.get(f"{SERVER_URL}/devices?page=1&per_page=20", headers=headers)
    devices = devices_res.json()["devices"]
    
    if not devices:
        print("No devices found!")
        return
    
    device = devices[0]
    device_id = device["id"]
    print(f"Device: {device['device_name']} ({device['serial_number']})")
    print(f"Current location: {device.get('last_latitude')}, {device.get('last_longitude')}")
    
    # The agent token was generated during registration
    # We need to get it from the database or re-register
    # For now, let's update via a direct PATCH if the API supports it
    
    # Try to update device with location
    update_res = requests.patch(f"{SERVER_URL}/devices/{device_id}", headers=headers, json={
        "last_latitude": NEW_LATITUDE,
        "last_longitude": NEW_LONGITUDE
    })
    
    if update_res.status_code == 200:
        print(f"✅ Location updated to: {NEW_LATITUDE}, {NEW_LONGITUDE}")
    else:
        print(f"Update via PATCH failed: {update_res.status_code}")
        print("Trying alternative method...")
        
        # If PATCH doesn't support location, we might need to use the agent ping
        # But we don't have the token stored. Let's check if we can use admin override.
        print(f"Note: Location can only be updated by the device agent sending pings.")
        print(f"You can run test_ping.py again to update the location.")

if __name__ == "__main__":
    main()
