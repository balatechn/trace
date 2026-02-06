#!/usr/bin/env python3
"""
Trace Device Agent
Lightweight background agent for laptop location tracking

This agent runs as a background service and periodically reports
the device's location to the Trace server.
"""
import argparse
import logging
import signal
import sys
import time
from typing import Optional

import schedule

from config import AgentConfig, setup_logging
from location import get_device_location
from system_info import get_serial_number, get_hostname, get_battery_info, get_machine_id
from api_client import TraceAPIClient

logger = logging.getLogger(__name__)

# Global flag for graceful shutdown
running = True


def signal_handler(signum, frame):
    """Handle shutdown signals"""
    global running
    logger.info("Shutdown signal received")
    running = False


def perform_ping(client: TraceAPIClient):
    """Perform a location ping"""
    try:
        # Get current location
        location = get_device_location()
        
        if not location.is_valid():
            logger.warning("Could not determine location")
            return
        
        # Get battery info
        battery = get_battery_info()
        battery_percent = battery.get("percent") if battery else None
        
        # Send ping to server
        success = client.send_ping(location, battery_percent)
        
        if success:
            logger.info(f"Location ping sent: {location.latitude:.4f}, {location.longitude:.4f}")
        else:
            logger.warning("Failed to send location ping")
            
    except Exception as e:
        logger.error(f"Error during ping: {e}")


def register_device(client: TraceAPIClient, 
                   registration_code: Optional[str] = None) -> bool:
    """Register the device with the server"""
    serial = get_serial_number()
    
    if not serial:
        # Use machine ID as fallback
        serial = get_machine_id()
        logger.warning(f"Could not get serial number, using machine ID: {serial}")
    
    hostname = get_hostname()
    
    return client.register(serial, hostname, registration_code)


def run_agent(config: AgentConfig, registration_code: Optional[str] = None):
    """Main agent loop"""
    global running
    
    logger.info("Starting Trace Agent")
    logger.info(f"Server: {config.server_url}")
    logger.info(f"Ping interval: {config.ping_interval} seconds")
    
    # Create API client
    client = TraceAPIClient(config)
    
    # Check if we need to register
    if not client.is_registered():
        logger.info("Device not registered, attempting registration...")
        
        if not register_device(client, registration_code):
            logger.error("Failed to register device")
            # Retry registration every minute
            while running and not client.is_registered():
                logger.info("Retrying registration in 60 seconds...")
                time.sleep(60)
                if running:
                    register_device(client, registration_code)
    
    if not running:
        return
    
    logger.info(f"Device registered: {config.device_id}")
    
    # Do an initial ping
    perform_ping(client)
    
    # Schedule periodic pings
    schedule.every(config.ping_interval).seconds.do(perform_ping, client)
    
    # Main loop
    while running:
        schedule.run_pending()
        time.sleep(1)
    
    logger.info("Trace Agent stopped")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Trace Device Agent - Location tracking for enterprise laptops"
    )
    
    parser.add_argument(
        "--server", "-s",
        help="Server URL (e.g., https://trace.company.com/api/v1)",
        default=None
    )
    
    parser.add_argument(
        "--interval", "-i",
        type=int,
        help="Ping interval in seconds (default: 300)",
        default=None
    )
    
    parser.add_argument(
        "--register", "-r",
        help="Registration code for initial device registration",
        default=None
    )
    
    parser.add_argument(
        "--debug", "-d",
        action="store_true",
        help="Enable debug logging"
    )
    
    parser.add_argument(
        "--test",
        action="store_true",
        help="Run a single test ping and exit"
    )
    
    parser.add_argument(
        "--show-info",
        action="store_true",
        help="Show device information and exit"
    )
    
    args = parser.parse_args()
    
    # Load or create config
    config = AgentConfig.load()
    
    # Override with command line arguments
    if args.server:
        config.server_url = args.server
    if args.interval:
        config.ping_interval = args.interval
    if args.debug:
        config.log_level = "DEBUG"
    
    # Setup logging
    setup_logging(config.log_level)
    
    # Handle show-info
    if args.show_info:
        from system_info import get_system_info
        info = get_system_info()
        print("\n=== Device Information ===")
        print(f"Hostname: {info['hostname']}")
        print(f"Serial Number: {info['serial_number']}")
        print(f"Machine ID: {info['machine_id']}")
        print(f"\nPlatform:")
        for k, v in info['platform'].items():
            print(f"  {k}: {v}")
        if info['battery']:
            print(f"\nBattery:")
            print(f"  Percent: {info['battery']['percent']}%")
            print(f"  Plugged in: {info['battery']['power_plugged']}")
        
        print("\n=== Current Location ===")
        location = get_device_location()
        if location.is_valid():
            print(f"Latitude: {location.latitude}")
            print(f"Longitude: {location.longitude}")
            print(f"Accuracy: {location.accuracy_meters}m")
            print(f"Source: {location.source}")
            print(f"IP Address: {location.ip_address}")
            if location.wifi_ssid:
                print(f"Wi-Fi SSID: {location.wifi_ssid}")
        else:
            print("Could not determine location")
        return
    
    # Handle test mode
    if args.test:
        client = TraceAPIClient(config)
        
        if not client.is_registered():
            print("Device not registered. Use --register to register first.")
            return
        
        print("Performing test ping...")
        location = get_device_location()
        
        if location.is_valid():
            battery = get_battery_info()
            battery_percent = battery.get("percent") if battery else None
            
            success = client.send_ping(location, battery_percent)
            if success:
                print("Test ping successful!")
            else:
                print("Test ping failed")
        else:
            print("Could not determine location")
        return
    
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Windows-specific signal handling
    if sys.platform == 'win32':
        try:
            signal.signal(signal.SIGBREAK, signal_handler)
        except AttributeError:
            pass
    
    # Save updated config
    config.save()
    
    # Run the agent
    run_agent(config, args.register)


if __name__ == "__main__":
    main()
