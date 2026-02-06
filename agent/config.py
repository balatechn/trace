"""
Trace Device Agent - Configuration
Lightweight background agent for laptop location tracking
"""
import os
import json
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

# Default configuration
DEFAULT_SERVER_URL = "https://trace.yourcompany.com/api/v1"
DEFAULT_PING_INTERVAL = 300  # 5 minutes
DEFAULT_LOG_LEVEL = "INFO"

# Config file locations
if os.name == 'nt':  # Windows
    CONFIG_DIR = Path(os.environ.get('PROGRAMDATA', 'C:\\ProgramData')) / 'Trace'
else:  # Linux/macOS
    CONFIG_DIR = Path('/etc/trace')

CONFIG_FILE = CONFIG_DIR / 'agent.json'
TOKEN_FILE = CONFIG_DIR / '.token'
LOG_FILE = CONFIG_DIR / 'agent.log'


@dataclass
class AgentConfig:
    """Agent configuration settings"""
    server_url: str = DEFAULT_SERVER_URL
    ping_interval: int = DEFAULT_PING_INTERVAL
    log_level: str = DEFAULT_LOG_LEVEL
    device_id: Optional[str] = None
    serial_number: Optional[str] = None
    enable_wifi_location: bool = True
    enable_ip_location: bool = True
    retry_attempts: int = 3
    retry_delay: int = 30
    
    @classmethod
    def load(cls) -> 'AgentConfig':
        """Load configuration from file"""
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, 'r') as f:
                    data = json.load(f)
                return cls(**data)
            except Exception as e:
                logging.warning(f"Failed to load config: {e}")
        return cls()
    
    def save(self):
        """Save configuration to file"""
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            json.dump(self.__dict__, f, indent=2)
    
    @staticmethod
    def get_token() -> Optional[str]:
        """Get stored agent token"""
        if TOKEN_FILE.exists():
            return TOKEN_FILE.read_text().strip()
        return None
    
    @staticmethod
    def save_token(token: str):
        """Save agent token securely"""
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        TOKEN_FILE.write_text(token)
        # Restrict file permissions
        if os.name != 'nt':
            os.chmod(TOKEN_FILE, 0o600)


def setup_logging(level: str = DEFAULT_LOG_LEVEL):
    """Configure logging for the agent"""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(LOG_FILE),
            logging.StreamHandler()
        ]
    )
