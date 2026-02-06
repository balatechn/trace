#!/bin/bash
# Trace Agent Installer for Linux
# Run as root or with sudo

set -e

echo "============================================"
echo "  Trace Device Agent Installer"
echo "============================================"
echo

# Check for root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Please run as root or with sudo"
    exit 1
fi

# Variables
INSTALL_DIR="/opt/trace-agent"
CONFIG_DIR="/etc/trace"
SERVICE_FILE="/etc/systemd/system/trace-agent.service"

echo "Installing to: $INSTALL_DIR"
echo

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$CONFIG_DIR"

# Copy files
echo "Copying files..."
cp -r "$(dirname "$0")"/*.py "$INSTALL_DIR/"
cp "$(dirname "$0")"/requirements.txt "$INSTALL_DIR/"
cp "$(dirname "$0")"/trace-agent.service "$SERVICE_FILE"

# Set permissions
chmod 755 "$INSTALL_DIR"/*.py
chmod 700 "$CONFIG_DIR"

# Install Python dependencies
echo
echo "Installing Python dependencies..."
pip3 install -r "$INSTALL_DIR/requirements.txt" || {
    echo "WARNING: Some dependencies failed to install"
}

# Create default config
if [ ! -f "$CONFIG_DIR/agent.json" ]; then
    echo
    echo "Creating default configuration..."
    cat > "$CONFIG_DIR/agent.json" << 'EOF'
{
  "server_url": "https://trace.yourcompany.com/api/v1",
  "ping_interval": 300,
  "log_level": "INFO"
}
EOF
    chmod 600 "$CONFIG_DIR/agent.json"
    echo "Please edit $CONFIG_DIR/agent.json with your server URL"
fi

# Reload systemd and enable service
echo
echo "Configuring systemd service..."
systemctl daemon-reload
systemctl enable trace-agent.service

echo
echo "============================================"
echo "  Installation Complete!"
echo "============================================"
echo
echo "Next steps:"
echo "1. Edit $CONFIG_DIR/agent.json"
echo "   - Set server_url to your Trace server"
echo
echo "2. Start the service:"
echo "   sudo systemctl start trace-agent"
echo
echo "3. Check status:"
echo "   sudo systemctl status trace-agent"
echo
echo "4. View logs:"
echo "   sudo journalctl -u trace-agent -f"
echo
echo "5. Or run manually for testing:"
echo "   python3 $INSTALL_DIR/agent.py --show-info"
echo
