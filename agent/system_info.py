"""
Trace Device Agent - System Utilities
Collects device system information
"""
import os
import platform
import logging
import socket
import uuid
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def get_hostname() -> str:
    """Get the device hostname"""
    return socket.gethostname()


def get_platform_info() -> Dict[str, str]:
    """Get platform information"""
    return {
        "system": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "processor": platform.processor(),
    }


def get_serial_number_windows() -> Optional[str]:
    """Get serial number on Windows"""
    try:
        import subprocess
        result = subprocess.run(
            ['wmic', 'bios', 'get', 'serialnumber'],
            capture_output=True,
            text=True,
            timeout=10
        )
        lines = [l.strip() for l in result.stdout.strip().split('\n') if l.strip()]
        if len(lines) > 1:
            serial = lines[1]
            if serial and serial != 'SerialNumber':
                return serial
    except Exception as e:
        logger.debug(f"WMIC serial lookup failed: {e}")
    
    # Fallback using PowerShell
    try:
        import subprocess
        result = subprocess.run(
            ['powershell', '-Command', 
             '(Get-WmiObject win32_bios).SerialNumber'],
            capture_output=True,
            text=True,
            timeout=10
        )
        serial = result.stdout.strip()
        if serial:
            return serial
    except Exception as e:
        logger.debug(f"PowerShell serial lookup failed: {e}")
    
    return None


def get_serial_number_linux() -> Optional[str]:
    """Get serial number on Linux"""
    paths = [
        '/sys/class/dmi/id/product_serial',
        '/sys/class/dmi/id/chassis_serial',
        '/sys/class/dmi/id/board_serial',
    ]
    
    for path in paths:
        try:
            if os.path.exists(path):
                with open(path, 'r') as f:
                    serial = f.read().strip()
                    if serial and serial != 'None':
                        return serial
        except PermissionError:
            logger.debug(f"Permission denied reading {path}")
        except Exception as e:
            logger.debug(f"Failed to read {path}: {e}")
    
    # Try dmidecode
    try:
        import subprocess
        result = subprocess.run(
            ['sudo', 'dmidecode', '-s', 'system-serial-number'],
            capture_output=True,
            text=True,
            timeout=10
        )
        serial = result.stdout.strip()
        if serial and serial not in ['None', 'Not Specified']:
            return serial
    except Exception as e:
        logger.debug(f"dmidecode failed: {e}")
    
    return None


def get_serial_number_macos() -> Optional[str]:
    """Get serial number on macOS"""
    try:
        import subprocess
        result = subprocess.run(
            ['system_profiler', 'SPHardwareDataType'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        for line in result.stdout.split('\n'):
            if 'Serial Number' in line:
                parts = line.split(':')
                if len(parts) > 1:
                    return parts[1].strip()
    except Exception as e:
        logger.debug(f"system_profiler failed: {e}")
    
    # Alternative method
    try:
        import subprocess
        result = subprocess.run(
            ['ioreg', '-l'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        import re
        match = re.search(r'"IOPlatformSerialNumber"\s*=\s*"([^"]+)"', result.stdout)
        if match:
            return match.group(1)
    except Exception as e:
        logger.debug(f"ioreg failed: {e}")
    
    return None


def get_serial_number() -> Optional[str]:
    """Get the device serial number"""
    system = platform.system().lower()
    
    if system == 'windows':
        return get_serial_number_windows()
    elif system == 'linux':
        return get_serial_number_linux()
    elif system == 'darwin':
        return get_serial_number_macos()
    
    return None


def get_machine_id() -> str:
    """Get a unique machine identifier"""
    # Try to get a stable hardware-based ID
    serial = get_serial_number()
    if serial:
        return serial
    
    # Fallback to MAC address based UUID
    try:
        mac = uuid.getnode()
        return f"MAC-{mac:012x}"
    except Exception:
        pass
    
    # Last resort: hostname
    return f"HOST-{get_hostname()}"


def get_battery_info() -> Optional[Dict[str, Any]]:
    """Get battery information"""
    try:
        import psutil
        battery = psutil.sensors_battery()
        if battery:
            return {
                "percent": battery.percent,
                "power_plugged": battery.power_plugged,
                "seconds_left": battery.secsleft if battery.secsleft != -1 else None,
            }
    except Exception as e:
        logger.debug(f"Failed to get battery info: {e}")
    return None


def get_network_interfaces() -> Dict[str, Dict[str, Any]]:
    """Get network interface information"""
    interfaces = {}
    try:
        import psutil
        addrs = psutil.net_if_addrs()
        stats = psutil.net_if_stats()
        
        for name, addr_list in addrs.items():
            if name in stats:
                interfaces[name] = {
                    "is_up": stats[name].isup,
                    "speed": stats[name].speed,
                    "addresses": []
                }
                for addr in addr_list:
                    if addr.family == socket.AF_INET:
                        interfaces[name]["addresses"].append({
                            "family": "IPv4",
                            "address": addr.address,
                            "netmask": addr.netmask,
                        })
    except Exception as e:
        logger.debug(f"Failed to get network interfaces: {e}")
    return interfaces


def get_system_info() -> Dict[str, Any]:
    """Get comprehensive system information"""
    return {
        "hostname": get_hostname(),
        "serial_number": get_serial_number(),
        "machine_id": get_machine_id(),
        "platform": get_platform_info(),
        "battery": get_battery_info(),
    }
