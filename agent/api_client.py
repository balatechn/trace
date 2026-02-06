"""
Trace Device Agent - API Client
Communicates with the Trace backend server
"""
import logging
import time
from typing import Optional, Dict, Any
from dataclasses import dataclass

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from config import AgentConfig
from location import LocationData

logger = logging.getLogger(__name__)


class TraceAPIClient:
    """Client for communicating with the Trace backend API"""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.base_url = config.server_url.rstrip('/')
        self.token: Optional[str] = None
        self.session = self._create_session()
        
        # Load stored token
        stored_token = AgentConfig.get_token()
        if stored_token:
            self.token = stored_token
            logger.info("Loaded stored agent token")

    def _create_session(self) -> requests.Session:
        """Create a requests session with retry logic"""
        session = requests.Session()
        
        retries = Retry(
            total=self.config.retry_attempts,
            backoff_factor=1,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT"]
        )
        
        adapter = HTTPAdapter(max_retries=retries)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        
        # Set default headers
        session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "TraceAgent/1.0",
        })
        
        return session

    def _get_headers(self) -> Dict[str, str]:
        """Get headers with authentication"""
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def register(self, serial_number: str, hostname: str, 
                 registration_code: Optional[str] = None) -> bool:
        """
        Register the device with the server
        
        Args:
            serial_number: Device serial number
            hostname: Device hostname
            registration_code: Optional pre-shared registration code
        
        Returns:
            True if registration successful
        """
        url = f"{self.base_url}/agent/register"
        
        payload = {
            "serial_number": serial_number,
            "hostname": hostname,
        }
        
        if registration_code:
            payload["registration_code"] = registration_code
        
        try:
            logger.info(f"Registering device: {serial_number}")
            response = self.session.post(url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("agent_token")
                self.config.device_id = data.get("device_id")
                self.config.serial_number = serial_number
                
                # Save token and config
                if self.token:
                    AgentConfig.save_token(self.token)
                self.config.save()
                
                logger.info(f"Device registered successfully: {self.config.device_id}")
                return True
            else:
                logger.error(f"Registration failed: {response.status_code} - {response.text}")
                return False
                
        except requests.RequestException as e:
            logger.error(f"Registration request failed: {e}")
            return False

    def send_ping(self, location: LocationData, 
                  battery_percent: Optional[int] = None) -> bool:
        """
        Send a location ping to the server
        
        Args:
            location: Location data
            battery_percent: Optional battery percentage
        
        Returns:
            True if ping was successful
        """
        if not self.token:
            logger.warning("Cannot send ping: not registered")
            return False
        
        url = f"{self.base_url}/agent/ping"
        
        payload = {
            "latitude": location.latitude,
            "longitude": location.longitude,
            "accuracy_meters": location.accuracy_meters,
            "source": location.source,
            "ip_address": location.ip_address,
            "wifi_ssid": location.wifi_ssid,
            "wifi_bssid": location.wifi_bssid,
            "battery_percent": battery_percent,
        }
        
        try:
            response = self.session.post(
                url, 
                json=payload, 
                headers=self._get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                logger.debug(f"Ping successful: {data}")
                
                # Check for remote commands
                if data.get("command"):
                    self._handle_command(data["command"])
                
                return True
            elif response.status_code == 401:
                logger.error("Authentication failed - token may be revoked")
                self.token = None
                return False
            else:
                logger.warning(f"Ping failed: {response.status_code}")
                return False
                
        except requests.RequestException as e:
            logger.error(f"Ping request failed: {e}")
            return False

    def _handle_command(self, command: Dict[str, Any]):
        """Handle remote commands from the server"""
        cmd_type = command.get("type")
        
        logger.info(f"Received command: {cmd_type}")
        
        if cmd_type == "LOCK":
            self._execute_lock()
        elif cmd_type == "UPDATE_CONFIG":
            self._update_config(command.get("config", {}))
        elif cmd_type == "FORCE_PING":
            # Trigger immediate location update
            pass
        else:
            logger.warning(f"Unknown command type: {cmd_type}")

    def _execute_lock(self):
        """Execute device lock command"""
        import platform
        system = platform.system().lower()
        
        try:
            if system == 'windows':
                import subprocess
                subprocess.run(['rundll32.exe', 'user32.dll,LockWorkStation'])
            elif system == 'darwin':
                import subprocess
                subprocess.run([
                    'osascript', '-e',
                    'tell application "System Events" to keystroke "q" using {control down, command down}'
                ])
            elif system == 'linux':
                import subprocess
                # Try various lock commands
                for cmd in [
                    ['gnome-screensaver-command', '-l'],
                    ['xdg-screensaver', 'lock'],
                    ['dm-tool', 'lock'],
                ]:
                    try:
                        subprocess.run(cmd, timeout=5)
                        break
                    except FileNotFoundError:
                        continue
            
            logger.info("Device locked successfully")
        except Exception as e:
            logger.error(f"Failed to lock device: {e}")

    def _update_config(self, new_config: Dict[str, Any]):
        """Update agent configuration from server"""
        if "ping_interval" in new_config:
            self.config.ping_interval = new_config["ping_interval"]
        if "enable_wifi_location" in new_config:
            self.config.enable_wifi_location = new_config["enable_wifi_location"]
        if "enable_ip_location" in new_config:
            self.config.enable_ip_location = new_config["enable_ip_location"]
        
        self.config.save()
        logger.info("Configuration updated from server")

    def check_connectivity(self) -> bool:
        """Check if the server is reachable"""
        try:
            response = self.session.get(
                f"{self.base_url}/health",
                timeout=10
            )
            return response.status_code == 200
        except requests.RequestException:
            return False

    def is_registered(self) -> bool:
        """Check if the device is registered"""
        return self.token is not None and self.config.device_id is not None
