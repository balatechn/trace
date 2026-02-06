# Trace - Enterprise Laptop Asset Management & Location Tracking

Trace is a comprehensive enterprise web application for managing company laptop assets and tracking their real-time locations. It provides secure device registration, location monitoring, geofence alerts, and role-based access control.

## Features

- **Device Registration**: Register laptops with serial number, asset ID, and employee assignment
- **Real-time Location Tracking**: GPS, Wi-Fi, and IP-based geolocation
- **Online/Offline Status**: Monitor device connectivity in real-time
- **Interactive Map**: Visualize all devices on an interactive map
- **Geofence Alerts**: Define allowed zones and receive alerts when devices leave
- **Role-Based Access**: Super Admin, IT Admin, and Viewer roles
- **Audit Logging**: Complete audit trail of all actions
- **Remote Lock**: Remotely lock devices if compromised
- **Lightweight Agent**: Background service for Windows and Linux

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Browser   │────▶│   Next.js Web   │────▶│   FastAPI       │
│   (Dashboard)   │◀────│   Application   │◀────│   Backend       │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐                              ┌───────▼────────┐
│   Device Agent  │─────────HTTPS/TLS───────────▶│   PostgreSQL   │
│   (Laptops)     │◀────────────────────────────│   Database     │
└─────────────────┘                              └────────────────┘
```

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database**: PostgreSQL with async SQLAlchemy
- **Authentication**: JWT with refresh tokens
- **Password Hashing**: bcrypt

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Maps**: React-Leaflet with OpenStreetMap

### Device Agent
- **Language**: Python 3.8+
- **Location**: IP geolocation, Wi-Fi metadata
- **Service**: Windows Service / systemd

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations (if using Alembic)
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API URL

# Start development server
npm run dev
```

### Agent Deployment

See [Agent Installation Guide](docs/AGENT.md)

## Environment Variables

### Backend (.env)

```env
# Server
SECRET_KEY=your-super-secret-key-change-in-production
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/trace
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://trace.yourcompany.com

# Initial Admin
FIRST_SUPERUSER=admin@company.com
FIRST_SUPERUSER_PASSWORD=change-this-password
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (invalidate refresh token)

### Devices
- `GET /api/v1/devices` - List all devices
- `POST /api/v1/devices` - Register new device
- `GET /api/v1/devices/{id}` - Get device details
- `PUT /api/v1/devices/{id}` - Update device
- `DELETE /api/v1/devices/{id}` - Delete device
- `POST /api/v1/devices/{id}/lock` - Lock device remotely

### Locations
- `GET /api/v1/locations/live` - Get all device locations
- `GET /api/v1/devices/{id}/locations` - Device location history

### Agent
- `POST /api/v1/agent/register` - Register device (agent)
- `POST /api/v1/agent/ping` - Location heartbeat (agent)

### Geofences
- `GET /api/v1/geofences` - List geofences
- `POST /api/v1/geofences` - Create geofence
- `PUT /api/v1/geofences/{id}` - Update geofence
- `DELETE /api/v1/geofences/{id}` - Delete geofence

### Alerts
- `GET /api/v1/alerts` - List alerts
- `PUT /api/v1/alerts/{id}/acknowledge` - Acknowledge alert

### Users
- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

### Audit
- `GET /api/v1/audit` - Get audit logs

## User Roles

| Role | Permissions |
|------|-------------|
| **Super Admin** | Full access: create/delete admins, all device management |
| **IT Admin** | Manage devices, view locations, handle alerts |
| **Viewer** | Read-only access to devices and locations |

## Security Considerations

1. **Transport Security**: All communication uses HTTPS/TLS
2. **Authentication**: JWT tokens with short expiration (30 min)
3. **Password Storage**: bcrypt with salt
4. **Agent Authentication**: Separate long-lived tokens for devices
5. **Audit Logging**: All sensitive actions are logged
6. **CORS**: Restricted to configured origins
7. **Role-Based Access**: Enforced at API level

## Privacy & Compliance

- Location data is only collected during work hours (configurable)
- Employees should be informed about device tracking
- Audit logs maintained for compliance
- Data retention policies can be configured
- Support for GDPR data export/deletion

## Deployment

### Docker

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d
```

### Production Checklist

- [ ] Change all default passwords
- [ ] Generate a strong SECRET_KEY
- [ ] Configure proper DATABASE_URL
- [ ] Enable HTTPS (TLS certificates)
- [ ] Set up proper CORS origins
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable logging and monitoring
- [ ] Review privacy policy with legal team

## License

Proprietary - Internal Use Only

## Support

Contact IT Security team for support.
