"""
Trace Device Agent - Windows Service
Runs the agent as a Windows background service
"""
import sys
import os
import time
import logging

# Add the agent directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import win32serviceutil
    import win32service
    import win32event
    import servicemanager
except ImportError:
    print("pywin32 is required to run as a Windows service")
    print("Install with: pip install pywin32")
    sys.exit(1)

from config import AgentConfig, setup_logging, LOG_FILE
from api_client import TraceAPIClient
from location import get_device_location
from system_info import get_serial_number, get_hostname, get_battery_info, get_machine_id


class TraceAgentService(win32serviceutil.ServiceFramework):
    """Windows Service for Trace Agent"""
    
    _svc_name_ = "TraceAgent"
    _svc_display_name_ = "Trace Device Location Agent"
    _svc_description_ = "Reports device location to the Trace asset management server"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.running = True
        
    def SvcStop(self):
        """Stop the service"""
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        win32event.SetEvent(self.stop_event)
        self.running = False

    def SvcDoRun(self):
        """Run the service"""
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        
        try:
            self.main()
        except Exception as e:
            servicemanager.LogErrorMsg(f"Service error: {e}")
        
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STOPPED,
            (self._svc_name_, '')
        )

    def main(self):
        """Main service loop"""
        # Load config
        config = AgentConfig.load()
        setup_logging(config.log_level)
        
        logger = logging.getLogger(__name__)
        logger.info("Trace Agent Service starting")
        
        # Create API client
        client = TraceAPIClient(config)
        
        # Register if needed
        if not client.is_registered():
            serial = get_serial_number() or get_machine_id()
            hostname = get_hostname()
            
            if not client.register(serial, hostname):
                logger.error("Failed to register device")
                # Continue trying to register
        
        last_ping_time = 0
        
        while self.running:
            # Check for stop signal
            result = win32event.WaitForSingleObject(self.stop_event, 1000)
            if result == win32event.WAIT_OBJECT_0:
                break
            
            # Check if it's time to ping
            current_time = time.time()
            if current_time - last_ping_time >= config.ping_interval:
                try:
                    if not client.is_registered():
                        serial = get_serial_number() or get_machine_id()
                        hostname = get_hostname()
                        client.register(serial, hostname)
                    
                    if client.is_registered():
                        location = get_device_location()
                        if location.is_valid():
                            battery = get_battery_info()
                            battery_percent = battery.get("percent") if battery else None
                            client.send_ping(location, battery_percent)
                            logger.debug("Location ping sent")
                        else:
                            logger.warning("Could not determine location")
                    
                    last_ping_time = current_time
                    
                except Exception as e:
                    logger.error(f"Ping error: {e}")
        
        logger.info("Trace Agent Service stopped")


def install_service():
    """Install the service"""
    try:
        win32serviceutil.InstallService(
            TraceAgentService._svc_name_,
            TraceAgentService._svc_name_,
            TraceAgentService._svc_display_name_,
            startType=win32service.SERVICE_AUTO_START,
            description=TraceAgentService._svc_description_
        )
        print(f"Service '{TraceAgentService._svc_display_name_}' installed successfully")
        return True
    except Exception as e:
        print(f"Failed to install service: {e}")
        return False


def uninstall_service():
    """Uninstall the service"""
    try:
        win32serviceutil.RemoveService(TraceAgentService._svc_name_)
        print(f"Service '{TraceAgentService._svc_display_name_}' removed successfully")
        return True
    except Exception as e:
        print(f"Failed to remove service: {e}")
        return False


if __name__ == '__main__':
    if len(sys.argv) == 1:
        # Running as a service
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(TraceAgentService)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        # Handle command line
        if sys.argv[1] in ('--install', 'install'):
            install_service()
        elif sys.argv[1] in ('--uninstall', 'remove', 'uninstall'):
            uninstall_service()
        elif sys.argv[1] in ('--start', 'start'):
            win32serviceutil.StartService(TraceAgentService._svc_name_)
            print("Service started")
        elif sys.argv[1] in ('--stop', 'stop'):
            win32serviceutil.StopService(TraceAgentService._svc_name_)
            print("Service stopped")
        elif sys.argv[1] in ('--restart', 'restart'):
            win32serviceutil.RestartService(TraceAgentService._svc_name_)
            print("Service restarted")
        else:
            win32serviceutil.HandleCommandLine(TraceAgentService)
