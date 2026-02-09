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
import base64
import io
import ctypes
from datetime import datetime
from pathlib import Path

import requests
import geocoder

# Optional imports for screenshot
try:
    from PIL import ImageGrab
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# For Windows message boxes
if platform.system() == 'Windows':
    import ctypes
    MessageBox = ctypes.windll.user32.MessageBoxW

# Configuration
CONFIG_FILE = Path(os.getenv('APPDATA', '.')) / 'Trace' / 'config.json'
LOG_FILE = Path(os.getenv('APPDATA', '.')) / 'Trace' / 'agent.log'

# Default settings
DEFAULT_CONFIG = {
    'server_url': 'https://trace-backend-1-aete.onrender.com/api/v1',
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
            command_id = cmd.get('id')
            command_type = cmd.get('type') or cmd.get('action')
            log(f"Received command: {command_type} (ID: {command_id})")
            
            result = None
            success = False
            
            try:
                if command_type in ['lock', 'LOCK']:
                    self.lock_device()
                    success = True
                    result = "Device locked successfully"
                elif command_type in ['unlock', 'UNLOCK']:
                    # Unlock is typically not possible remotely for security
                    result = "Unlock not supported for security reasons"
                    success = False
                elif command_type in ['restart', 'RESTART']:
                    success, result = self.restart_device()
                elif command_type in ['shutdown', 'SHUTDOWN']:
                    success, result = self.shutdown_device()
                elif command_type in ['screenshot', 'SCREENSHOT']:
                    success, result = self.take_screenshot()
                elif command_type in ['message', 'MESSAGE']:
                    message = cmd.get('payload', {}).get('message', 'Message from IT Admin')
                    title = cmd.get('payload', {}).get('title', 'Trace Admin')
                    success = self.show_message(message, title)
                    result = "Message displayed" if success else "Failed to display message"
                elif command_type in ['wipe', 'WIPE']:
                    self.wipe_device()
                    result = "Wipe command received (disabled for safety)"
                    success = False
                elif command_type in ['execute', 'EXECUTE']:
                    # Execute custom command (use with caution)
                    cmd_text = cmd.get('payload', {}).get('command', '')
                    if cmd_text:
                        success, result = self.execute_command(cmd_text)
                    else:
                        result = "No command specified"
                        success = False
                else:
                    result = f"Unknown command type: {command_type}"
                    success = False
            except Exception as e:
                result = f"Error executing command: {str(e)}"
                success = False
                log(f"Command execution error: {e}")
            
            # Report result back to server
            if command_id:
                self.report_command_result(command_id, success, result)
    
    def report_command_result(self, command_id: str, success: bool, result: str):
        """Report command execution result back to server"""
        try:
            payload = {
                'command_id': command_id,
                'status': 'executed' if success else 'failed',
                'result': result if success else None,
                'error_message': result if not success else None
            }
            
            response = requests.post(
                f"{self.config['server_url']}/agent/command-result",
                json=payload,
                headers={'Authorization': f"Bearer {self.config['agent_token']}"},
                timeout=30
            )
            
            if response.status_code == 200:
                log(f"Command result reported: {success}")
            else:
                log(f"Failed to report command result: {response.status_code}")
        except Exception as e:
            log(f"Error reporting command result: {e}")
    
    def take_screenshot(self) -> tuple:
        """Capture and upload screenshot"""
        log("SCREENSHOT COMMAND RECEIVED!")
        try:
            if not HAS_PIL:
                return False, "PIL not installed - cannot capture screenshot"
            
            # Capture screenshot
            screenshot = ImageGrab.grab()
            
            # Convert to base64 JPEG
            buffer = io.BytesIO()
            screenshot.save(buffer, format='JPEG', quality=70)
            screenshot_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            # Upload to server
            payload = {
                'screenshot': screenshot_base64,
                'timestamp': datetime.now().isoformat()
            }
            
            response = requests.post(
                f"{self.config['server_url']}/agent/screenshot",
                json=payload,
                headers={'Authorization': f"Bearer {self.config['agent_token']}"},
                timeout=60
            )
            
            if response.status_code == 200:
                log("Screenshot captured and uploaded")
                return True, "Screenshot captured successfully"
            else:
                return False, f"Failed to upload screenshot: {response.status_code}"
                
        except Exception as e:
            log(f"Screenshot error: {e}")
            return False, f"Screenshot failed: {str(e)}"
    
    def restart_device(self) -> tuple:
        """Restart the device"""
        log("RESTART COMMAND RECEIVED!")
        try:
            if platform.system() == 'Windows':
                subprocess.run('shutdown /r /t 30 /c "Remote restart initiated by IT Admin"', shell=True)
                return True, "Restart scheduled in 30 seconds"
            elif platform.system() == 'Linux':
                subprocess.run(['sudo', 'shutdown', '-r', '+1', 'Remote restart initiated'])
                return True, "Restart scheduled in 1 minute"
            elif platform.system() == 'Darwin':
                subprocess.run(['sudo', 'shutdown', '-r', '+1'])
                return True, "Restart scheduled in 1 minute"
            else:
                return False, f"Restart not supported on {platform.system()}"
        except Exception as e:
            log(f"Restart error: {e}")
            return False, f"Restart failed: {str(e)}"
    
    def shutdown_device(self) -> tuple:
        """Shutdown the device"""
        log("SHUTDOWN COMMAND RECEIVED!")
        try:
            if platform.system() == 'Windows':
                subprocess.run('shutdown /s /t 30 /c "Remote shutdown initiated by IT Admin"', shell=True)
                return True, "Shutdown scheduled in 30 seconds"
            elif platform.system() == 'Linux':
                subprocess.run(['sudo', 'shutdown', '-h', '+1', 'Remote shutdown initiated'])
                return True, "Shutdown scheduled in 1 minute"
            elif platform.system() == 'Darwin':
                subprocess.run(['sudo', 'shutdown', '-h', '+1'])
                return True, "Shutdown scheduled in 1 minute"
            else:
                return False, f"Shutdown not supported on {platform.system()}"
        except Exception as e:
            log(f"Shutdown error: {e}")
            return False, f"Shutdown failed: {str(e)}"
    
    def show_message(self, message: str, title: str = "Trace Admin") -> bool:
        """Display a message to the user"""
        log(f"MESSAGE COMMAND: {title} - {message}")
        try:
            if platform.system() == 'Windows':
                # Run in a separate thread to not block
                def show_box():
                    MessageBox(None, message, title, 0x40)  # MB_ICONINFORMATION
                threading.Thread(target=show_box, daemon=True).start()
                return True
            elif platform.system() == 'Linux':
                subprocess.Popen(['notify-send', title, message])
                return True
            elif platform.system() == 'Darwin':
                subprocess.Popen(['osascript', '-e', f'display notification "{message}" with title "{title}"'])
                return True
            else:
                log(f"Message display not supported on {platform.system()}")
                return False
        except Exception as e:
            log(f"Message display error: {e}")
            return False
    
    def execute_command(self, command: str) -> tuple:
        """Execute a custom command (use with extreme caution)"""
        log(f"EXECUTE COMMAND: {command}")
        try:
            # Security: only allow certain commands
            allowed_prefixes = ['ipconfig', 'hostname', 'whoami', 'systeminfo', 'tasklist']
            is_allowed = any(command.lower().startswith(prefix) for prefix in allowed_prefixes)
            
            if not is_allowed:
                return False, "Command not in allowed list for security reasons"
            
            result = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT, timeout=30)
            return True, result.decode('utf-8', errors='ignore')[:5000]  # Limit output size
        except subprocess.TimeoutExpired:
            return False, "Command timed out"
        except subprocess.CalledProcessError as e:
            return False, f"Command failed: {e.output.decode('utf-8', errors='ignore')[:1000]}"
        except Exception as e:
            return False, f"Error: {str(e)}"
    
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
