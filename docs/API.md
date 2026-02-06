# Trace API Documentation

This document describes the REST API endpoints for the Trace asset management system.

## Base URL

```
Production: https://trace.yourcompany.com/api/v1
Development: http://localhost:8000/api/v1
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication.

### Obtaining Tokens

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Using Tokens

Include the access token in the Authorization header:

```http
GET /devices
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### Refreshing Tokens

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

## Endpoints

### Authentication

#### Login
```http
POST /auth/login
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | User email |
| password | string | Yes | User password |

**Response:** `200 OK`
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

#### Refresh Token
```http
POST /auth/refresh
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refresh_token | string | Yes | Valid refresh token |

#### Get Current User
```http
GET /auth/me
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@company.com",
  "full_name": "John Doe",
  "role": "admin",
  "department": "IT",
  "is_active": true
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer {token}
```

---

### Devices

#### List Devices
```http
GET /devices
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| skip | int | Offset for pagination (default: 0) |
| limit | int | Number of results (default: 100, max: 1000) |
| status | string | Filter by status: online, offline, lost |
| department | string | Filter by department |
| search | string | Search by hostname, serial, asset ID |

**Response:** `200 OK`
```json
{
  "devices": [
    {
      "id": "uuid",
      "serial_number": "ABC123",
      "hostname": "LAPTOP-001",
      "asset_id": "IT-2024-001",
      "status": "online",
      "is_locked": false,
      "employee_name": "John Doe",
      "department": "Engineering",
      "last_seen": "2024-01-15T10:30:00Z",
      "last_location": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "accuracy_meters": 100
      }
    }
  ],
  "total": 150
}
```

#### Get Device
```http
GET /devices/{device_id}
Authorization: Bearer {token}
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "serial_number": "ABC123",
  "hostname": "LAPTOP-001",
  "asset_id": "IT-2024-001",
  "model": "Dell Latitude 5520",
  "status": "online",
  "is_locked": false,
  "employee_name": "John Doe",
  "employee_email": "john@company.com",
  "department": "Engineering",
  "os_info": "Windows 11 Pro",
  "agent_version": "1.0.0",
  "last_seen": "2024-01-15T10:30:00Z",
  "enrolled_at": "2024-01-01T09:00:00Z",
  "last_location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy_meters": 100,
    "source": "ip+wifi",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Create Device (Manual Registration)
```http
POST /devices
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "serial_number": "ABC123",
  "hostname": "LAPTOP-001",
  "asset_id": "IT-2024-001",
  "employee_name": "John Doe",
  "employee_email": "john@company.com",
  "department": "Engineering",
  "model": "Dell Latitude 5520"
}
```

**Required Role:** admin, super_admin

#### Update Device
```http
PUT /devices/{device_id}
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "asset_id": "IT-2024-001",
  "employee_name": "Jane Doe",
  "employee_email": "jane@company.com",
  "department": "Marketing"
}
```

**Required Role:** admin, super_admin

#### Delete Device
```http
DELETE /devices/{device_id}
Authorization: Bearer {token}
```

**Required Role:** super_admin

#### Lock Device
```http
POST /devices/{device_id}/lock
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "reason": "Device reported stolen"
}
```

**Required Role:** admin, super_admin

#### Unlock Device
```http
POST /devices/{device_id}/unlock
Authorization: Bearer {token}
```

**Required Role:** admin, super_admin

---

### Locations

#### Get Live Locations
```http
GET /locations/live
Authorization: Bearer {token}
```

Returns the latest location for all online devices.

**Response:** `200 OK`
```json
{
  "locations": [
    {
      "device_id": "uuid",
      "device_name": "LAPTOP-001",
      "latitude": 37.7749,
      "longitude": -122.4194,
      "accuracy_meters": 100,
      "source": "ip+wifi",
      "timestamp": "2024-01-15T10:30:00Z",
      "employee_name": "John Doe",
      "department": "Engineering"
    }
  ]
}
```

#### Get Device Location History
```http
GET /devices/{device_id}/locations
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| start_date | datetime | Start of date range (ISO 8601) |
| end_date | datetime | End of date range (ISO 8601) |
| limit | int | Maximum results (default: 1000) |

**Response:** `200 OK`
```json
{
  "device_id": "uuid",
  "locations": [
    {
      "latitude": 37.7749,
      "longitude": -122.4194,
      "accuracy_meters": 100,
      "source": "ip+wifi",
      "ip_address": "203.0.113.1",
      "wifi_ssid": "Company-WiFi",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Geofences

#### List Geofences
```http
GET /geofences
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| is_active | bool | Filter by active status |
| department | string | Filter by department |

**Response:** `200 OK`
```json
{
  "geofences": [
    {
      "id": "uuid",
      "name": "Main Office",
      "description": "Headquarters building",
      "fence_type": "circle",
      "center_latitude": 37.7749,
      "center_longitude": -122.4194,
      "radius_meters": 500,
      "is_active": true,
      "alert_on_exit": true,
      "alert_on_enter": false,
      "department": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Geofence
```http
POST /geofences
Authorization: Bearer {token}
```

**Request Body (Circle):**
```json
{
  "name": "Main Office",
  "description": "Headquarters building",
  "fence_type": "circle",
  "center_latitude": 37.7749,
  "center_longitude": -122.4194,
  "radius_meters": 500,
  "alert_on_exit": true,
  "alert_on_enter": false,
  "department": null
}
```

**Request Body (Polygon):**
```json
{
  "name": "Campus Area",
  "fence_type": "polygon",
  "polygon_coordinates": [
    {"lat": 37.775, "lng": -122.420},
    {"lat": 37.775, "lng": -122.415},
    {"lat": 37.770, "lng": -122.415},
    {"lat": 37.770, "lng": -122.420}
  ],
  "alert_on_exit": true
}
```

**Required Role:** admin, super_admin

#### Update Geofence
```http
PUT /geofences/{geofence_id}
Authorization: Bearer {token}
```

#### Delete Geofence
```http
DELETE /geofences/{geofence_id}
Authorization: Bearer {token}
```

**Required Role:** super_admin

---

### Alerts

#### List Alerts
```http
GET /alerts
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| severity | string | Filter: critical, high, medium, low |
| is_resolved | bool | Filter by resolved status |
| device_id | uuid | Filter by device |
| skip | int | Pagination offset |
| limit | int | Results per page |

**Response:** `200 OK`
```json
{
  "alerts": [
    {
      "id": "uuid",
      "device_id": "uuid",
      "device_name": "LAPTOP-001",
      "alert_type": "geofence_exit",
      "severity": "high",
      "title": "Device left Main Office",
      "description": "LAPTOP-001 exited the Main Office geofence",
      "is_resolved": false,
      "created_at": "2024-01-15T10:30:00Z",
      "resolved_at": null,
      "resolved_by": null
    }
  ],
  "total": 25
}
```

#### Get Alert
```http
GET /alerts/{alert_id}
Authorization: Bearer {token}
```

#### Acknowledge Alert
```http
PUT /alerts/{alert_id}/acknowledge
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "notes": "Verified with employee, authorized travel"
}
```

---

### Users

#### List Users
```http
GET /users
Authorization: Bearer {token}
```

**Required Role:** admin, super_admin

**Response:** `200 OK`
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@company.com",
      "full_name": "John Admin",
      "role": "admin",
      "department": "IT",
      "is_active": true,
      "last_login": "2024-01-15T08:00:00Z",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 10
}
```

#### Create User
```http
POST /users
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "email": "newuser@company.com",
  "password": "secure-password",
  "full_name": "New User",
  "role": "viewer",
  "department": "HR"
}
```

**Required Role:** super_admin (for creating admins), admin (for creating viewers)

#### Update User
```http
PUT /users/{user_id}
Authorization: Bearer {token}
```

#### Delete User
```http
DELETE /users/{user_id}
Authorization: Bearer {token}
```

**Required Role:** super_admin

---

### Audit Logs

#### List Audit Logs
```http
GET /audit
Authorization: Bearer {token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| action | string | Filter by action type |
| user_id | uuid | Filter by user |
| start_date | datetime | Start of date range |
| end_date | datetime | End of date range |
| skip | int | Pagination offset |
| limit | int | Results per page |

**Required Role:** admin, super_admin

**Response:** `200 OK`
```json
{
  "logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_email": "admin@company.com",
      "action": "device.lock",
      "target_type": "device",
      "target_id": "uuid",
      "description": "Locked device LAPTOP-001",
      "ip_address": "10.0.0.50",
      "user_agent": "Mozilla/5.0...",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 500
}
```

---

### Agent Endpoints

These endpoints are used by the device agent, not the web dashboard.

#### Register Device
```http
POST /agent/register
```

**Request Body:**
```json
{
  "serial_number": "ABC123",
  "hostname": "LAPTOP-001",
  "registration_code": "optional-code"
}
```

**Response:** `200 OK`
```json
{
  "device_id": "uuid",
  "agent_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

#### Send Location Ping
```http
POST /agent/ping
Authorization: Bearer {agent_token}
```

**Request Body:**
```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "accuracy_meters": 100,
  "source": "ip+wifi",
  "ip_address": "203.0.113.1",
  "wifi_ssid": "Company-WiFi",
  "wifi_bssid": "00:11:22:33:44:55",
  "battery_percent": 85
}
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "command": null
}
```

**Response with Command:**
```json
{
  "status": "ok",
  "command": {
    "type": "LOCK",
    "issued_at": "2024-01-15T10:30:00Z"
  }
}
```

---

## Error Responses

### Error Format

```json
{
  "detail": "Error message here"
}
```

### Common Status Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid or expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 422 | Validation Error - Request body validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Validation Error Response

```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| /auth/login | 5 requests/minute |
| /agent/ping | 60 requests/minute per device |
| General API | 100 requests/minute per user |

---

## Webhooks (Future)

Webhook support for real-time notifications is planned for a future release.

Planned events:
- `device.offline` - Device goes offline
- `device.location` - New location received
- `alert.created` - New alert generated
- `geofence.violation` - Device exits/enters geofence
