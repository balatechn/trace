"""
Trace Agent for Windows
Automatically tracks laptop location and reports to the Trace server.
This can be compiled to an EXE using PyInstaller.
"""
import os
import sys
import json
import time
import socket
import platform
import threading
import subprocess
from datetime import datetime
from pathlib import Path

import requests
import geocoder

# Configuration
CONFIG_FILE = Path(os.getenv('APPDATA', '.')) / 'Trace' / 'config.json'
LOG_FILE = Path(os.getenv('APPDATA', '.')) / 'Trace' / 'agent.log'

# Default settings
DEFAULT_CONFIG = {
    'server_url': 'http://192.168.10.70:8000/api/v1',
    'ping_interval': 30,  # 30 seconds for testing
    'serial_number': '',
    'asset_id': '',
    'agent_token': '',
    'device_id': '',
}


def log(message: str):
    """Log message to file and console"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_msg = f"[{timestamp}] {message}"
    print(log_msg)
    try:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(LOG_FILE, 'a') as f:
            f.write(log_msg + '\n')
    except:
        pass


def load_config() -> dict:
    """Load configuration from file"""
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                return {**DEFAULT_CONFIG, **config}
        except:
            pass
    return DEFAULT_CONFIG.copy()


def save_config(config: dict):
    """Save configuration to file"""
    try:
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        log(f"Failed to save config: {e}")


def get_serial_number() -> str:
    """Get computer serial number"""
    try:
        if platform.system() == 'Windows':
            output = subprocess.check_output(
                'wmic bios get serialnumber',
                shell=True,
                stderr=subprocess.DEVNULL
            ).decode().strip()
            lines = output.split('\n')
            if len(lines) > 1:
                return lines[1].strip()
        elif platform.system() == 'Linux':
            # Try multiple methods
            try:
                with open('/sys/class/dmi/id/product_serial', 'r') as f:
                    return f.read().strip()
            except:
                pass
            try:
                output = subprocess.check_output(
                    ['sudo', 'dmidecode', '-s', 'system-serial-number'],
                    stderr=subprocess.DEVNULL
                ).decode().strip()
                return output
            except:
                pass
        elif platform.system() == 'Darwin':
            output = subprocess.check_output(
                ['system_profiler', 'SPHardwareDataType'],
                stderr=subprocess.DEVNULL
            ).decode()
            for line in output.split('\n'):
                if 'Serial Number' in line:
                    return line.split(':')[1].strip()
    except Exception as e:
        log(f"Failed to get serial number: {e}")
    
    # Fallback to hostname
    return socket.gethostname()


def get_mac_address() -> str:
    """Get MAC address of primary network interface"""
    try:
        import uuid
        mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0, 48, 8)][::-1])
        return mac
    except:
        return None


def get_ip_address() -> str:
    """Get public IP address"""
    try:
        response = requests.get('https://api.ipify.org?format=json', timeout=10)
        return response.json().get('ip')
    except:
        try:
            response = requests.get('https://httpbin.org/ip', timeout=10)
            return response.json().get('origin', '').split(',')[0].strip()
        except:
            return None


def get_location() -> tuple:
    """Get location from IP geolocation"""
    try:
        # Use geocoder for IP-based location
        g = geocoder.ip('me')
        if g.ok:
            return g.lat, g.lng, 1000.0, 'IP'  # latitude, longitude, accuracy, source
    except Exception as e:
        log(f"Geocoder failed: {e}")
    
    # Fallback to ip-api.com
    try:
        response = requests.get('http://ip-api.com/json/', timeout=10)
        data = response.json()
        if data.get('status') == 'success':
            return data['lat'], data['lon'], 5000.0, 'IP'
    except Exception as e:
        log(f"ip-api failed: {e}")
    
    return None, None, None, None


def get_system_info() -> dict:
    """Get system information"""
    return {
        'device_name': socket.gethostname(),
        'manufacturer': get_manufacturer(),
        'model': get_model(),
        'os_name': platform.system(),
        'os_version': platform.version(),
        'mac_address': get_mac_address(),
        'agent_version': '1.0.0',
    }


def get_manufacturer() -> str:
    """Get computer manufacturer"""
    try:
        if platform.system() == 'Windows':
            output = subprocess.check_output(
                'wmic computersystem get manufacturer',
                shell=True,
                stderr=subprocess.DEVNULL
            ).decode().strip()
            lines = output.split('\n')
            if len(lines) > 1:
                return lines[1].strip()
    except:
        pass
    return platform.system()


def get_model() -> str:
    """Get computer model"""
    try:
        if platform.system() == 'Windows':
            output = subprocess.check_output(
                'wmic computersystem get model',
                shell=True,
                stderr=subprocess.DEVNULL
            ).decode().strip()
            lines = output.split('\n')
            if len(lines) > 1:
                return lines[1].strip()
    except:
        pass
    return 'Unknown'


def get_battery_info() -> tuple:
    """Get battery level and charging status"""
    try:
        import psutil
        battery = psutil.sensors_battery()
        if battery:
            return battery.percent, battery.power_plugged
    except:
        pass
    return None, None


class TraceAgent:
    def __init__(self):
        self.config = load_config()
        self.running = False
        
    def register(self) -> bool:
        """Register device with the server"""
        if not self.config['serial_number']:
            self.config['serial_number'] = get_serial_number()
            
        if not self.config['asset_id']:
            # Use serial number as asset ID if not configured
            self.config['asset_id'] = self.config['serial_number']
        
        system_info = get_system_info()
        
        payload = {
            'serial_number': self.config['serial_number'],
            'asset_id': self.config['asset_id'],
            **system_info
        }
        
        log(f"Registering device: {self.config['serial_number']}")
        
        try:
            response = requests.post(
                f"{self.config['server_url']}/agent/register",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.config['agent_token'] = data['agent_token']
                self.config['device_id'] = str(data['device_id'])
                save_config(self.config)
                log(f"Registration successful! Device ID: {self.config['device_id']}")
                return True
            elif response.status_code == 400:
                # Already registered, try to use existing token
                log("Device already registered")
                if self.config['agent_token']:
                    return True
                else:
                    log("No token stored. Please contact IT admin.")
                    return False
            else:
                log(f"Registration failed: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            log(f"Cannot connect to server: {self.config['server_url']}")
            return False
        except Exception as e:
            log(f"Registration error: {e}")
            return False
    
    def send_ping(self) -> bool:
        """Send location ping to server"""
        if not self.config['agent_token']:
            log("No agent token. Need to register first.")
            return False
        
        lat, lng, accuracy, source = get_location()
        ip_address = get_ip_address()
        battery_level, is_charging = get_battery_info()
        
        payload = {
            'latitude': lat,
            'longitude': lng,
            'accuracy': accuracy,
            'location_source': source,
            'ip_address': ip_address,
            'battery_level': battery_level,
            'is_charging': is_charging,
            'agent_version': '1.0.0'
        }
        
        try:
            response = requests.post(
                f"{self.config['server_url']}/agent/ping",
                json=payload,
                headers={'Authorization': f"Bearer {self.config['agent_token']}"},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                log(f"Ping sent. Location: {lat}, {lng}")
                
                # Handle commands from server
                if data.get('commands'):
                    self.handle_commands(data['commands'])
                    
                return True
            elif response.status_code == 401:
                log("Token expired. Re-registering...")
                self.config['agent_token'] = ''
                save_config(self.config)
                return self.register() and self.send_ping()
            else:
                log(f"Ping failed: {response.status_code}")
                return False
                
        except Exception as e:
            log(f"Ping error: {e}")
            return False
    
    def handle_commands(self, commands: list):
        """Handle commands from server"""
        for cmd in commands:
            log(f"Received command: {cmd}")
            
            if cmd.get('action') == 'lock':
                self.lock_device()
            elif cmd.get('action') == 'wipe':
                self.wipe_device()
    
    def lock_device(self):
        """Lock the device"""
        log("LOCK COMMAND RECEIVED!")
        try:
            if platform.system() == 'Windows':
                subprocess.run('rundll32.exe user32.dll,LockWorkStation', shell=True)
            elif platform.system() == 'Linux':
                subprocess.run(['loginctl', 'lock-session'])
            elif platform.system() == 'Darwin':
                subprocess.run(['/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession', '-suspend'])
        except Exception as e:
            log(f"Failed to lock device: {e}")
    
    def wipe_device(self):
        """Wipe device data (DANGEROUS - placeholder only)"""
        log("WIPE COMMAND RECEIVED!")
        log("WARNING: Wipe functionality is disabled for safety.")
        # In production, this would securely erase data
        # DO NOT implement actual wipe without proper safety measures
    
    def run(self):
        """Main agent loop"""
        log("=" * 50)
        log("Trace Agent Starting...")
        log(f"Server: {self.config['server_url']}")
        log(f"Serial: {get_serial_number()}")
        log("=" * 50)
        
        # Register if needed
        if not self.config['agent_token']:
            if not self.register():
                log("Registration failed. Will retry...")
        
        self.running = True
        
        while self.running:
            try:
                # Send ping
                if self.config['agent_token']:
                    self.send_ping()
                else:
                    # Try to register again
                    self.register()
                
                # Wait for next ping
                time.sleep(self.config['ping_interval'])
                
            except KeyboardInterrupt:
                log("Shutting down...")
                break
            except Exception as e:
                log(f"Error in main loop: {e}")
                time.sleep(60)  # Wait before retry
        
        log("Agent stopped.")
    
    def stop(self):
        """Stop the agent"""
        self.running = False


def configure_agent():
    """Interactive configuration"""
    print("\n" + "=" * 50)
    print("  Trace Agent Configuration")
    print("=" * 50)
    
    config = load_config()
    
    print(f"\nCurrent configuration:")
    print(f"  Server URL: {config['server_url']}")
    print(f"  Serial Number: {config['serial_number'] or get_serial_number()}")
    print(f"  Asset ID: {config['asset_id'] or 'Auto'}")
    print(f"  Ping Interval: {config['ping_interval']} seconds")
    
    print("\nEnter new values (press Enter to keep current):\n")
    
    server = input(f"Server URL [{config['server_url']}]: ").strip()
    if server:
        config['server_url'] = server
    
    asset_id = input(f"Asset ID [{config['asset_id'] or 'Auto'}]: ").strip()
    if asset_id:
        config['asset_id'] = asset_id
    
    interval = input(f"Ping Interval (seconds) [{config['ping_interval']}]: ").strip()
    if interval and interval.isdigit():
        config['ping_interval'] = int(interval)
    
    save_config(config)
    print("\nConfiguration saved!")
    print(f"Config file: {CONFIG_FILE}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Trace Agent for device tracking')
    parser.add_argument('--configure', action='store_true', help='Configure the agent')
    parser.add_argument('--server', type=str, help='Server URL')
    parser.add_argument('--asset-id', type=str, help='Asset ID')
    parser.add_argument('--once', action='store_true', help='Send one ping and exit')
    
    args = parser.parse_args()
    
    if args.configure:
        configure_agent()
        return
    
    # Override config from command line
    config = load_config()
    if args.server:
        config['server_url'] = args.server
        save_config(config)
    if args.asset_id:
        config['asset_id'] = args.asset_id
        save_config(config)
    
    agent = TraceAgent()
    
    if args.once:
        if not agent.config['agent_token']:
            agent.register()
        agent.send_ping()
    else:
        agent.run()


if __name__ == '__main__':
    main()
