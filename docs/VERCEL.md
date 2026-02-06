# Deploying Trace to Vercel

This guide covers deploying the Trace application to Vercel with serverless functions.

## Architecture on Vercel

```
┌─────────────────────────────────────────────────────────┐
│                      Vercel                              │
│  ┌─────────────────┐     ┌─────────────────────────┐    │
│  │   Next.js App   │     │   Python Serverless     │    │
│  │   (Frontend)    │────▶│   Functions (Backend)   │    │
│  └─────────────────┘     └───────────┬─────────────┘    │
└──────────────────────────────────────│──────────────────┘
                                       │
                          ┌────────────▼────────────┐
                          │   Vercel Postgres       │
                          │   (or Neon/Supabase)    │
                          └─────────────────────────┘
```

## Prerequisites

1. [Vercel Account](https://vercel.com/signup)
2. [Vercel CLI](https://vercel.com/cli) installed: `npm i -g vercel`
3. GitHub repository with your code

## Option 1: Monorepo Deployment (Recommended)

Deploy both frontend and backend from a single repository.

### Step 1: Restructure as Monorepo

Your current structure works! Vercel will deploy each folder separately.

### Step 2: Set Up Vercel Postgres

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** → **Create Database** → **Postgres**
3. Name it `trace-db` and create
4. Copy the connection strings from the **Quickstart** tab

### Step 3: Deploy Backend

```bash
cd backend

# Login to Vercel
vercel login

# Deploy (first time - creates project)
vercel

# Set environment variables
vercel env add SECRET_KEY production
vercel env add DATABASE_URL production
vercel env add ALLOWED_ORIGINS production
vercel env add FIRST_SUPERUSER production
vercel env add FIRST_SUPERUSER_PASSWORD production

# Deploy to production
vercel --prod
```

**Environment Variables for Backend:**

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | Your 64-character secret key |
| `DATABASE_URL` | `postgres://...` from Vercel Postgres |
| `ALLOWED_ORIGINS` | `https://your-frontend.vercel.app` |
| `FIRST_SUPERUSER` | `admin@yourcompany.com` |
| `FIRST_SUPERUSER_PASSWORD` | Strong password |

### Step 4: Deploy Frontend

```bash
cd frontend

# Deploy
vercel

# Set the API URL to your backend
vercel env add NEXT_PUBLIC_API_URL production
# Value: https://your-backend.vercel.app/api/v1

# Deploy to production
vercel --prod
```

### Step 5: Configure Domains (Optional)

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Domains**
3. Add your custom domains:
   - `trace.yourcompany.com` → Frontend
   - `api.trace.yourcompany.com` → Backend

## Option 2: Single Project with API Routes

Convert FastAPI endpoints to Next.js API routes for simpler deployment.

### Create API Route Proxy

Create `frontend/src/app/api/[...path]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://your-backend.vercel.app';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/', '');
  const response = await fetch(`${BACKEND_URL}/api/v1/${path}`, {
    headers: request.headers,
  });
  return NextResponse.json(await response.json(), { status: response.status });
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.replace('/api/', '');
  const body = await request.json();
  const response = await fetch(`${BACKEND_URL}/api/v1/${path}`, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body),
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
```

## Option 3: Use Vercel's Python Runtime Directly

For simpler backends, use Vercel's native Python support.

### Adapt Backend Structure

```
backend/
├── api/
│   ├── index.py           # Main entry point
│   ├── auth.py            # /api/auth endpoints
│   ├── devices.py         # /api/devices endpoints
│   └── ...
├── requirements.txt
└── vercel.json
```

### Example: api/index.py

```python
from fastapi import FastAPI
from mangum import Mangum

app = FastAPI()

@app.get("/api/health")
def health():
    return {"status": "ok"}

# Import and include routers
from app.api.routes import auth, devices
app.include_router(auth.router, prefix="/api/v1")
app.include_router(devices.router, prefix="/api/v1")

# Handler for Vercel
handler = Mangum(app)
```

## Database Setup

### Using Neon (Recommended)

[Neon](https://neon.tech) offers serverless PostgreSQL with fast cold starts, perfect for Vercel.

**Step 1: Create Neon Account & Project**

1. Sign up at [neon.tech](https://neon.tech) (free tier available)
2. Click **New Project**
3. Name: `trace-db`
4. Region: Choose closest to your Vercel region (e.g., `us-east-2`)
5. Click **Create Project**

**Step 2: Get Connection String**

1. In your Neon dashboard, go to **Connection Details**
2. Select **Pooled connection** (recommended for serverless)
3. Copy the connection string

It looks like:
```
postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Step 3: Configure Vercel**

```bash
# In your backend project
vercel env add NEON_DATABASE_URL production
# Paste the connection string when prompted
```

Or in Vercel Dashboard → Your Project → Settings → Environment Variables:

| Name | Value |
|------|-------|
| `NEON_DATABASE_URL` | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |

**Step 4: Run Migrations**

```bash
# Locally, set the connection string
export NEON_DATABASE_URL="postgresql://..."

cd backend
pip install -r requirements.txt
alembic upgrade head
```

### Using Vercel Postgres (Alternative)

1. Vercel Dashboard → Storage → Create Database → Postgres
2. Connection string auto-added as `POSTGRES_URL`
3. The backend auto-detects this variable

### Using Supabase (Alternative)

1. Sign up at [supabase.com](https://supabase.com)
2. Create a project
3. Get connection string from Settings → Database
4. Set as `NEON_DATABASE_URL` in Vercel (same format)

## Running Migrations

Since Vercel is serverless, run migrations locally or via CI/CD:

```bash
# Install dependencies locally
cd backend
pip install -r requirements.txt

# Set the production DATABASE_URL
export DATABASE_URL="postgres://..."

# Run Alembic migrations
alembic upgrade head
```

### GitHub Actions for Migrations

Create `.github/workflows/migrate.yml`:

```yaml
name: Run Migrations

on:
  push:
    branches: [main]
    paths:
      - 'backend/alembic/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run migrations
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          cd backend
          alembic upgrade head
```

## Environment Variables Summary

### Backend (Vercel Project)

```
SECRET_KEY=your-super-secret-key-64-chars
DATABASE_URL=postgres://user:pass@host/db
POSTGRES_URL=postgres://user:pass@host/db (if using Vercel Postgres)
ALLOWED_ORIGINS=https://trace-frontend.vercel.app
FIRST_SUPERUSER=admin@company.com
FIRST_SUPERUSER_PASSWORD=secure-password
```

### Frontend (Vercel Project)

```
NEXT_PUBLIC_API_URL=https://trace-backend.vercel.app/api/v1
```

## Cold Start Optimization

Vercel serverless functions have cold starts. To minimize:

1. **Keep functions small** - Split large routers
2. **Use edge functions** for simple endpoints
3. **Lazy load imports** where possible

```python
# Lazy load heavy dependencies
def get_heavy_service():
    from services.heavy import HeavyService
    return HeavyService()
```

## Monitoring & Logs

1. **Vercel Dashboard** → Your Project → **Logs**
2. **Functions** → See execution times and errors
3. **Analytics** (Pro plan) → Performance metrics

## Troubleshooting

### "Function Timeout"
- Vercel Hobby: 10s limit, Pro: 60s
- For long operations, use background jobs (Vercel Cron or external)

### "Module Not Found"
- Ensure `requirements.txt` lists all dependencies
- Check Python version compatibility

### "Cold Start Slow"
- Reduce dependencies
- Use Vercel's Edge Runtime for simple endpoints

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check if SSL is required (`?sslmode=require`)
- Ensure IP allowlist includes Vercel (0.0.0.0/0 for serverless)

## Production Checklist

- [ ] Set strong `SECRET_KEY`
- [ ] Configure production database
- [ ] Set `ALLOWED_ORIGINS` to your frontend domain
- [ ] Enable Vercel Analytics (optional)
- [ ] Set up custom domains
- [ ] Configure Vercel Firewall rules
- [ ] Test all API endpoints
- [ ] Verify agent connectivity
- [ ] Set up monitoring alerts

## Cost Considerations

| Tier | Frontend Builds | Serverless Functions | Database |
|------|-----------------|---------------------|----------|
| Hobby (Free) | 100/day | 100 GB-hrs/month | Vercel Postgres Starter |
| Pro ($20/mo) | Unlimited | 1000 GB-hrs/month | Additional storage |

For production with many devices, consider Pro plan or external database.

## Alternative: Separate Deployments

For better scaling, deploy separately:

- **Frontend** → Vercel
- **Backend** → Railway, Render, or Fly.io
- **Database** → Neon, Supabase, or managed PostgreSQL

This gives more control over the backend and avoids serverless limitations.
