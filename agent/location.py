"""
Trace Device Agent - Location Services
Collects device location via GPS, Wi-Fi, and IP geolocation
"""
import logging
import socket
import subprocess
import re
from typing import Optional, Tuple, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class LocationData:
    """Location information from various sources"""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_meters: Optional[float] = None
    source: str = "unknown"
    ip_address: Optional[str] = None
    wifi_ssid: Optional[str] = None
    wifi_bssid: Optional[str] = None

    def is_valid(self) -> bool:
        return self.latitude is not None and self.longitude is not None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "accuracy_meters": self.accuracy_meters,
            "source": self.source,
            "ip_address": self.ip_address,
            "wifi_ssid": self.wifi_ssid,
            "wifi_bssid": self.wifi_bssid,
        }


class LocationProvider:
    """Multi-source location provider"""

    @staticmethod
    def get_public_ip() -> Optional[str]:
        """Get the public IP address"""
        try:
            import requests
            response = requests.get('https://api.ipify.org', timeout=5)
            if response.status_code == 200:
                return response.text.strip()
        except Exception as e:
            logger.debug(f"Failed to get public IP: {e}")
        
        # Fallback: try another service
        try:
            import requests
            response = requests.get('https://ifconfig.me/ip', timeout=5)
            if response.status_code == 200:
                return response.text.strip()
        except Exception as e:
            logger.debug(f"Fallback IP lookup failed: {e}")
        
        return None

    @staticmethod
    def get_local_ip() -> Optional[str]:
        """Get the local IP address"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception as e:
            logger.debug(f"Failed to get local IP: {e}")
        return None

    @staticmethod
    def get_wifi_info_windows() -> Tuple[Optional[str], Optional[str]]:
        """Get Wi-Fi SSID and BSSID on Windows"""
        try:
            result = subprocess.run(
                ['netsh', 'wlan', 'show', 'interfaces'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            ssid = None
            bssid = None
            
            for line in result.stdout.split('\n'):
                line = line.strip()
                if line.startswith('SSID') and 'BSSID' not in line:
                    match = re.search(r':\s*(.+)', line)
                    if match:
                        ssid = match.group(1).strip()
                elif line.startswith('BSSID'):
                    match = re.search(r':\s*(.+)', line)
                    if match:
                        bssid = match.group(1).strip()
            
            return ssid, bssid
        except Exception as e:
            logger.debug(f"Failed to get Wi-Fi info: {e}")
        return None, None

    @staticmethod
    def get_wifi_info_linux() -> Tuple[Optional[str], Optional[str]]:
        """Get Wi-Fi SSID and BSSID on Linux"""
        try:
            result = subprocess.run(
                ['iwgetid', '-r'],
                capture_output=True,
                text=True,
                timeout=10
            )
            ssid = result.stdout.strip() if result.returncode == 0 else None
            
            result = subprocess.run(
                ['iwgetid', '-a'],
                capture_output=True,
                text=True,
                timeout=10
            )
            bssid = None
            if result.returncode == 0:
                match = re.search(r'Access Point:\s*([0-9A-Fa-f:]+)', result.stdout)
                if match:
                    bssid = match.group(1)
            
            return ssid, bssid
        except Exception as e:
            logger.debug(f"Failed to get Wi-Fi info: {e}")
        return None, None

    @staticmethod
    def get_wifi_info_macos() -> Tuple[Optional[str], Optional[str]]:
        """Get Wi-Fi SSID and BSSID on macOS"""
        try:
            result = subprocess.run(
                ['/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport', '-I'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            ssid = None
            bssid = None
            
            for line in result.stdout.split('\n'):
                line = line.strip()
                if line.startswith('SSID:'):
                    ssid = line.split(':', 1)[1].strip()
                elif line.startswith('BSSID:'):
                    bssid = line.split(':', 1)[1].strip()
            
            return ssid, bssid
        except Exception as e:
            logger.debug(f"Failed to get Wi-Fi info: {e}")
        return None, None

    def get_wifi_info(self) -> Tuple[Optional[str], Optional[str]]:
        """Get Wi-Fi information for current platform"""
        import platform
        system = platform.system().lower()
        
        if system == 'windows':
            return self.get_wifi_info_windows()
        elif system == 'linux':
            return self.get_wifi_info_linux()
        elif system == 'darwin':
            return self.get_wifi_info_macos()
        
        return None, None

    def get_location_from_ip(self) -> LocationData:
        """Get location from IP geolocation"""
        location = LocationData(source="ip")
        
        try:
            import geocoder
            g = geocoder.ip('me')
            
            if g.ok and g.latlng:
                location.latitude = g.latlng[0]
                location.longitude = g.latlng[1]
                location.accuracy_meters = 5000  # IP geolocation is approximate
                location.ip_address = g.ip
                logger.debug(f"IP location: {location.latitude}, {location.longitude}")
        except Exception as e:
            logger.warning(f"IP geolocation failed: {e}")
            
            # Fallback to ip-api.com
            try:
                import requests
                response = requests.get('http://ip-api.com/json/', timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'success':
                        location.latitude = data.get('lat')
                        location.longitude = data.get('lon')
                        location.accuracy_meters = 5000
                        location.ip_address = data.get('query')
            except Exception as e2:
                logger.warning(f"Fallback IP geolocation failed: {e2}")
        
        return location

    def get_location_from_wifi(self) -> LocationData:
        """Get location from Wi-Fi access point (requires Google API)"""
        location = LocationData(source="wifi")
        
        ssid, bssid = self.get_wifi_info()
        location.wifi_ssid = ssid
        location.wifi_bssid = bssid
        
        # Note: Wi-Fi based geolocation requires a geolocation API key
        # (Google Geolocation API, Mozilla Location Service, etc.)
        # For privacy and cost reasons, we fall back to IP geolocation
        
        if bssid:
            logger.debug(f"Wi-Fi BSSID: {bssid}, SSID: {ssid}")
        
        return location

    def get_location(self) -> LocationData:
        """Get the best available location"""
        # Try Wi-Fi first (for metadata)
        wifi_location = self.get_location_from_wifi()
        
        # Get IP-based location
        ip_location = self.get_location_from_ip()
        
        # Merge Wi-Fi metadata into IP location
        if ip_location.is_valid():
            ip_location.wifi_ssid = wifi_location.wifi_ssid
            ip_location.wifi_bssid = wifi_location.wifi_bssid
            if wifi_location.wifi_bssid:
                ip_location.source = "ip+wifi"
            return ip_location
        
        return wifi_location


def get_device_location() -> LocationData:
    """Convenience function to get device location"""
    provider = LocationProvider()
    return provider.get_location()
