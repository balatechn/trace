# Trace Security Guidelines

This document outlines security best practices for deploying and operating the Trace asset management system.

## Security Architecture

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Backend   │────▶│  Database   │
│  (JWT+CSRF) │◀────│  (Validate) │◀────│  (Hashed)   │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent     │────▶│   Backend   │────▶│  Database   │
│ (Bearer JWT)│◀────│  (Validate) │◀────│  (Token)    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Token Types

| Token Type | Lifetime | Purpose |
|------------|----------|---------|
| Access Token | 30 minutes | API authentication |
| Refresh Token | 7 days | Obtain new access tokens |
| Agent Token | 365 days | Device authentication |

## Deployment Security Checklist

### Prerequisites

- [ ] **HTTPS Only**: Deploy with TLS 1.2+ certificates
- [ ] **Reverse Proxy**: Use nginx/Apache as reverse proxy
- [ ] **Firewall**: Configure firewall rules (see below)
- [ ] **WAF**: Consider Web Application Firewall for public deployments

### Server Hardening

1. **Generate Strong Secret Key**:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

2. **Database Security**:
   - Use strong passwords for database users
   - Enable SSL for database connections
   - Restrict database network access
   - Regular backups with encryption

3. **Environment Variables**:
   ```bash
   # Never commit these to source control
   SECRET_KEY=generated-secret-key
   DATABASE_URL=postgresql+asyncpg://user:strong-password@localhost/trace
   ```

4. **File Permissions**:
   ```bash
   # Backend
   chmod 600 .env
   
   # Agent configs
   chmod 700 /etc/trace
   chmod 600 /etc/trace/.token
   ```

### Network Configuration

**Firewall Rules**:

```bash
# Allow HTTPS
ufw allow 443/tcp

# Allow HTTP (redirect to HTTPS)
ufw allow 80/tcp

# PostgreSQL (localhost only)
ufw deny 5432/tcp

# Block all other inbound
ufw default deny incoming
ufw default allow outgoing
```

**nginx Configuration**:

```nginx
server {
    listen 80;
    server_name trace.yourcompany.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name trace.yourcompany.com;

    ssl_certificate /etc/ssl/certs/trace.crt;
    ssl_certificate_key /etc/ssl/private/trace.key;
    
    # Strong SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Authentication Security

### Password Policy

The system enforces:
- Minimum 8 characters
- Stored with bcrypt (cost factor 12)
- No password history (consider implementing)

**Recommendations**:
- Integrate with corporate SSO/SAML
- Enable MFA for admin accounts
- Implement account lockout after failed attempts

### JWT Security

- Tokens are signed with HS256 (HMAC-SHA256)
- Short access token lifetime (30 minutes)
- Refresh tokens are single-use
- Tokens can be revoked server-side

### Agent Authentication

- Agents receive long-lived tokens after registration
- Token is tied to specific device (serial number)
- Tokens can be revoked from admin dashboard
- Consider certificate-based authentication for higher security

## API Security

### Rate Limiting

Implement rate limiting at the application or nginx level:

```python
# Example: FastAPI rate limiting
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/auth/login")
@limiter.limit("5/minute")
async def login():
    pass
```

### CORS Configuration

```python
ALLOWED_ORIGINS = [
    "https://trace.yourcompany.com",
]

# Never use * in production
```

### Input Validation

- All inputs are validated with Pydantic schemas
- SQL queries use parameterized statements (SQLAlchemy ORM)
- File uploads are restricted and validated

## Data Security

### Data at Rest

1. **Database Encryption**:
   - Enable PostgreSQL TDE if available
   - Or use full-disk encryption (LUKS, BitLocker)

2. **Backup Encryption**:
   ```bash
   pg_dump trace | gpg --encrypt -r backup@company.com > backup.sql.gpg
   ```

3. **Sensitive Data**:
   - Passwords: bcrypt hashed
   - Tokens: stored as salted hashes (recommended)
   - Locations: plain text (consider encryption)

### Data in Transit

- All API communication over HTTPS
- Agent-to-server communication encrypted
- Database connections use SSL

### Data Retention

Configure automatic data cleanup:

```sql
-- Example: Delete location history older than 90 days
DELETE FROM location_history 
WHERE timestamp < NOW() - INTERVAL '90 days';
```

## Privacy Compliance

### GDPR Considerations

1. **Legal Basis**: Document legitimate interest for employee device tracking
2. **Transparency**: Inform employees about tracking
3. **Data Subject Rights**:
   - Implement data export (API endpoint)
   - Implement data deletion (API endpoint)
4. **Data Minimization**: Only collect necessary location data
5. **Retention Limits**: Configure automatic deletion

### Employee Notice

Sample notice (customize for your jurisdiction):

> "Company laptops are equipped with location tracking software for asset management and security purposes. Location data is collected periodically during business hours and is accessible only to authorized IT personnel. You may request a copy of your location data by contacting IT."

## Incident Response

### Security Event Monitoring

Monitor for:
- Failed login attempts (brute force)
- Token revocations
- Unusual location patterns
- Geofence violations

### Log Retention

- Audit logs: 1 year minimum
- Security events: 2 years
- Location data: Per retention policy

### Incident Procedures

1. **Compromised Device**:
   - Immediately lock device via dashboard
   - Revoke agent token
   - Track last known location
   - Notify security team

2. **Compromised Admin Account**:
   - Disable account immediately
   - Rotate SECRET_KEY (invalidates all tokens)
   - Audit recent actions
   - Reset all admin passwords

3. **Data Breach**:
   - Activate incident response plan
   - Preserve logs and evidence
   - Notify affected parties per regulations
   - Report to authorities if required

## Agent Security

### Secure Deployment

1. **Code Signing**: Sign agent executables
2. **Secure Distribution**: Distribute via trusted channels
3. **Integrity Checks**: Verify checksums before installation

### Agent Hardening

- Run with minimal privileges where possible
- Token stored with restricted file permissions
- No sensitive data logged

### Certificate Pinning (Optional)

For high-security deployments, implement certificate pinning:

```python
# In agent code
EXPECTED_CERT_HASH = "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

def verify_cert(cert):
    import hashlib
    cert_hash = hashlib.sha256(cert).digest()
    return cert_hash == base64.b64decode(EXPECTED_CERT_HASH.split('/')[1])
```

## Regular Security Tasks

### Daily
- [ ] Review security alerts
- [ ] Check for failed login patterns

### Weekly
- [ ] Review audit logs
- [ ] Check for unusual activity

### Monthly
- [ ] Review user access rights
- [ ] Rotate service credentials
- [ ] Test backup restoration

### Quarterly
- [ ] Security assessment
- [ ] Update dependencies
- [ ] Review access permissions
- [ ] Penetration testing

### Annually
- [ ] Full security audit
- [ ] Policy review
- [ ] Disaster recovery test
- [ ] Certificate renewal

## Dependency Security

### Regular Updates

```bash
# Python
pip install --upgrade pip
pip install pip-audit
pip-audit

# Node.js
npm audit
npm audit fix
```

### Vulnerability Scanning

```bash
# Use tools like:
# - Snyk
# - Dependabot (GitHub)
# - OWASP Dependency-Check
```

## Contact

Security issues should be reported to:
- Email: security@yourcompany.com
- Do not disclose vulnerabilities publicly
