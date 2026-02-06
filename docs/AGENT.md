# Trace Agent Installation Guide

The Trace Agent is a lightweight background service that runs on managed laptops to report their location to the Trace server.

## Overview

The agent:
- Runs silently in the background
- Reports location every 5 minutes (configurable)
- Uses IP geolocation and Wi-Fi metadata
- Supports Windows and Linux
- Can be remotely configured from the server

## System Requirements

### Windows
- Windows 10/11 or Windows Server 2016+
- Python 3.8 or higher
- Administrator access for installation

### Linux
- Ubuntu 18.04+, Debian 10+, RHEL 8+, or similar
- Python 3.8 or higher
- Root access for installation
- systemd for service management

## Installation

### Windows Installation

1. **Download the agent package** from your IT department or extract from source

2. **Run the installer as Administrator**:
   ```cmd
   install-windows.bat
   ```

3. **Configure the agent**:
   Open `C:\ProgramData\Trace\agent.json` and set:
   ```json
   {
     "server_url": "https://trace.yourcompany.com/api/v1",
     "ping_interval": 300
   }
   ```

4. **Start the service**:
   ```cmd
   net start TraceAgent
   ```

### Linux Installation

1. **Download and extract the agent**:
   ```bash
   sudo mkdir -p /opt/trace-agent
   sudo tar -xzf trace-agent.tar.gz -C /opt/trace-agent
   ```

2. **Run the installer**:
   ```bash
   sudo /opt/trace-agent/install-linux.sh
   ```

3. **Configure the agent**:
   ```bash
   sudo nano /etc/trace/agent.json
   ```
   
   Set your server URL:
   ```json
   {
     "server_url": "https://trace.yourcompany.com/api/v1",
     "ping_interval": 300
   }
   ```

4. **Start the service**:
   ```bash
   sudo systemctl start trace-agent
   sudo systemctl status trace-agent
   ```

## Manual Testing

Before enabling as a service, you can test the agent manually:

```bash
# Show device information
python agent.py --show-info

# Run with debug logging
python agent.py --debug

# Perform a single test ping
python agent.py --test
```

## Configuration Options

The configuration file (`agent.json`) supports these options:

| Option | Default | Description |
|--------|---------|-------------|
| `server_url` | Required | Trace server API URL |
| `ping_interval` | 300 | Seconds between location reports |
| `log_level` | INFO | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `enable_wifi_location` | true | Include Wi-Fi metadata |
| `enable_ip_location` | true | Enable IP geolocation |
| `retry_attempts` | 3 | Number of retry attempts on failure |
| `retry_delay` | 30 | Seconds between retries |

Example configuration:

```json
{
  "server_url": "https://trace.yourcompany.com/api/v1",
  "ping_interval": 300,
  "log_level": "INFO",
  "enable_wifi_location": true,
  "enable_ip_location": true,
  "retry_attempts": 3,
  "retry_delay": 30
}
```

## Device Registration

On first run, the agent will automatically register with the server using:
- Device serial number (from BIOS/firmware)
- Hostname
- MAC address (fallback identifier)

If your server requires a registration code:

```bash
python agent.py --register YOUR-REGISTRATION-CODE
```

## Service Management

### Windows

```cmd
# Start service
net start TraceAgent

# Stop service
net stop TraceAgent

# Check status
sc query TraceAgent

# View logs
type C:\ProgramData\Trace\agent.log
```

### Linux

```bash
# Start service
sudo systemctl start trace-agent

# Stop service
sudo systemctl stop trace-agent

# Check status
sudo systemctl status trace-agent

# View logs
sudo journalctl -u trace-agent -f

# Or
cat /etc/trace/agent.log
```

## Uninstallation

### Windows

```cmd
# Stop service
net stop TraceAgent

# Uninstall service
python "C:\Program Files\Trace Agent\windows_service.py" --uninstall

# Remove files
rmdir /s "C:\Program Files\Trace Agent"
rmdir /s "C:\ProgramData\Trace"
```

### Linux

```bash
# Stop and disable service
sudo systemctl stop trace-agent
sudo systemctl disable trace-agent

# Remove files
sudo rm /etc/systemd/system/trace-agent.service
sudo rm -rf /opt/trace-agent
sudo rm -rf /etc/trace

# Reload systemd
sudo systemctl daemon-reload
```

## Troubleshooting

### Agent won't start

1. Check Python is installed:
   ```bash
   python --version  # or python3 --version
   ```

2. Verify dependencies are installed:
   ```bash
   pip install -r requirements.txt
   ```

3. Check logs for errors:
   - Windows: `C:\ProgramData\Trace\agent.log`
   - Linux: `/etc/trace/agent.log`

### Cannot connect to server

1. Verify server URL is correct
2. Check network connectivity
3. Verify firewall allows HTTPS (port 443)
4. Test with curl:
   ```bash
   curl https://trace.yourcompany.com/api/v1/health
   ```

### Location not updating

1. Run with debug mode:
   ```bash
   python agent.py --debug
   ```

2. Check if device is registered:
   ```bash
   python agent.py --show-info
   ```

3. Verify internet connectivity for IP geolocation

### Permission errors

- Windows: Run as Administrator
- Linux: Run with sudo or as root

## Security Notes

1. **Token Storage**: Agent tokens are stored securely:
   - Windows: `C:\ProgramData\Trace\.token`
   - Linux: `/etc/trace/.token` (mode 600)

2. **Config Protection**: Configuration files contain sensitive data and should have restricted permissions

3. **Transport**: All communication uses HTTPS

4. **Token Revocation**: Tokens can be revoked from the admin dashboard if a device is compromised

## Network Requirements

The agent requires outbound HTTPS access to:
- Your Trace server (port 443)
- IP geolocation services (api.ipify.org, ip-api.com)

## Privacy Notice

This agent collects:
- Device IP address
- Approximate location (from IP)
- Wi-Fi network name (SSID) and access point ID
- Battery status
- Device hostname and serial number

Collected data is transmitted only to your organization's Trace server.
