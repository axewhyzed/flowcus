# Flowcus Setup Guide

Complete instructions for setting up, developing, testing, and deploying the Flowcus application across all layers: Database, Backend API, Web Frontend, and Mobile (Android).

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup (PostgreSQL)](#database-setup-postgresql)
3. [Backend API Setup (.NET 8)](#backend-api-setup-net-8)
4. [Web Frontend Setup (Angular 19)](#web-frontend-setup-angular-19)
5. [Mobile Setup (React Native Android)](#mobile-setup-react-native-android)
6. [Testing & Verification](#testing--verification)
7. [Docker & Containerized Deployment](#docker--containerized-deployment)
8. [Production Deployment & Checklist](#production-deployment--checklist)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **.NET 8.0 SDK or later** (for FlowCus-backend)
- **Node.js 18.x or 20.x LTS** with npm (for Angular web frontend & React Native)
- **PostgreSQL 14 or later** (tested on PostgreSQL 14–17)
- **Git**
- **Java Development Kit (JDK) 17** & **Android SDK** (for Android app builds)
- A code editor (VS Code, Visual Studio 2022, or Android Studio)

### System Requirements
- Minimum 4GB RAM (8GB+ recommended if running backend, Angular, and Android Emulator simultaneously)
- At least 2GB free disk space
- Supported OS: Windows 10/11, macOS, Linux

---

## Database Setup (PostgreSQL)

### 1. Create the Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE flowcus;

# Exit psql
\q
```

### 2. Apply Schema & Triggers
Navigate to the `FlowCus-db` directory and execute the table and function definitions:

```bash
cd FlowCus-db

# 1. Base Tables
psql -U postgres -d flowcus -f tables/userlist.sql
psql -U postgres -d flowcus -f tables/task_category.sql
psql -U postgres -d flowcus -f tables/task_subtypes.sql
psql -U postgres -d flowcus -f tables/tasks.sql
psql -U postgres -d flowcus -f tables/timetables.sql
psql -U postgres -d flowcus -f tables/timetable_items.sql

# 2. Limit Enforcement Functions & Triggers
psql -U postgres -d flowcus -f functions/user_data_functions/enforce_subtype_limit.sql
psql -U postgres -d flowcus -f functions/user_data_functions/enforce_timetable_limit.sql
psql -U postgres -d flowcus -f functions/user_data_functions/fn_update_task.sql
```

### 3. Database Schema Highlights
- **`userlist`**: Includes `failed_attempts (int)`, `lockout_until (timestamptz)`, and `lockout_count (int)` to enforce progressive brute-force lockout tiers.
- **`tasks`**: Includes `is_completed (boolean NOT NULL DEFAULT false)` to isolate task completion from deletion (`is_deleted`), and `chk_time_order (end_time >= start_time)` to support instantaneous milestone entries.
- **`timetable_items`**: Includes `updated_on (timestamptz DEFAULT now())`.
- **Advisory Locks**: Limit triggers execute `pg_advisory_xact_lock(user_id)` to prevent race condition bypasses when creating subtypes or timetables concurrently up to the 5-item limit.

---

## Backend API Setup (.NET 8)

### 1. Restore & Configuration
Navigate to `FlowCus-backend`:

```bash
cd FlowCus-backend
dotnet restore
```

Verify or configure `appsettings.Development.json` (or `appsettings.json`):

```json
{
  "ConnectionStrings": {
    "DBLocal": "Host=localhost;Port=5432;Database=flowcus;Username=postgres;Password=your_password;"
  },
  "Jwt": {
    "Key": "your-super-secret-key-minimum-32-characters-long-for-security",
    "Issuer": "FlowcusAPI",
    "Audience": "FlowcusClient"
  },
  "AuthSettings": {
    "MaxFailedAttempts": 3,
    "BcryptWorkFactor": 12,
    "IpRateLimitPerMinute": 30,
    "UserRateLimitPerMinute": 10
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

> [!NOTE]
> The backend prioritizes `ConnectionStrings:DefaultConnection`. If empty or null, it falls back to `ConnectionStrings:DBLocal`.

### 2. Progressive Lockout Policy
FlowCus features a progressive tiered lockout algorithm:
- **Tier 1 (Attempts 1–3 fail):** Account locks for **5 minutes**.
- **Tier 2 (Attempts 4–6 fail):** Account locks for **15 minutes**.
- **Tier 3+ (Attempts 7+ fail):** Account locks for **60 minutes**, repeating on subsequent failures.
- **Reset:** Successful password authentication immediately resets both `failed_attempts` and `lockout_count` to 0.

### 3. Run the Backend
```bash
dotnet run
```
API endpoints will listen on `http://localhost:7176` (or `https://localhost:7176`).

---

## Web Frontend Setup (Angular 19)

### 1. Install Dependencies
```bash
cd FlowCus-frontend/flowcus
npm install
```

### 2. Environment Configuration
Verify `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:7176/api',
  appName: 'FlowCus'
};
```

### 3. Start Development Server
```bash
npm start
# or ng serve
```
Open your browser at `http://localhost:4200`.

---

## Mobile Setup (React Native Android)

The FlowCus Android application is located in `FlowCus-android`.

### 1. Install Dependencies
```bash
cd FlowCus-android
npm install
```

### 2. Environment Configuration
Configure `FlowCus-android/.env`:
```env
# For Android Emulator communicating with localhost backend:
API_BASE_URL=http://10.0.2.2:7176/api

# For Physical Android Device on same local network:
# API_BASE_URL=http://192.168.1.XXX:7176/api
```

### 3. Start Metro Bundler
```bash
npm start
```

### 4. Build & Launch on Android
In a separate terminal:
```bash
npm run android
```

---

## Testing & Verification

FlowCus includes automated test suites across all application tiers:

### 1. Backend Automated Tests (xUnit)
Run the 22 automated unit and integration tests covering authentication, progressive lockout tiers, task constraints, and timetable overlap logic:
```bash
cd FlowCus-backend
dotnet test FlowCus.sln
```

### 2. Web Frontend Build Verification
Verify production bundling and lazy-loaded route chunking:
```bash
cd FlowCus-frontend/flowcus
npm run build
```

### 3. Android Mobile Unit Tests & Typecheck
Verify Redux slices, components, native bridge mocks, and strict TypeScript types:
```bash
cd FlowCus-android
npm test
npx tsc --noEmit
```

---

## Docker & Containerized Deployment

### 1. Backend Dockerfile
The backend includes a production-ready multi-stage `Dockerfile`:
```bash
cd FlowCus-backend
docker build -t flowcus-backend .
docker run -p 8080:8080 \
  -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;Port=5432;Database=flowcus;Username=postgres;Password=your_password;" \
  -e Jwt__Key="production-secret-key-at-least-32-characters" \
  flowcus-backend
```

### 2. Docker Compose
Run the entire stack with Docker Compose:
```yaml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: flowcus
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./FlowCus-backend
    ports:
      - "8080:8080"
    environment:
      ConnectionStrings__DefaultConnection: "Host=db;Port=5432;Database=flowcus;Username=postgres;Password=postgrespassword;"
      Jwt__Key: "your-production-secret-key-minimum-32-characters"
      Jwt__Issuer: "FlowcusAPI"
      Jwt__Audience: "FlowcusClient"
    depends_on:
      - db

volumes:
  postgres_data:
```

Launch with:
```bash
docker-compose up -d
```

---

## Production Deployment & Checklist

Before deploying FlowCus to production:
1. **Database Secrets:** Provide connection strings via environment variables (`ConnectionStrings__DefaultConnection`). Never commit production credentials.
2. **JWT Secret:** Configure a cryptographically strong 256-bit key in `Jwt__Key`.
3. **CORS:** Ensure `Program.cs` CORS origins only whitelist your production domains (`https://flowcus.axewhyzedlabs.co.in`, `https://axewhyzed.github.io`).
4. **Timezone Header:** Clients automatically inject `X-Timezone-Offset` in minutes. Verify reverse proxies / load balancers forward this header.
5. **Rate Limiting:** Set appropriate thresholds in `AuthSettings` for public-facing deployments.
6. **HTTPS / SSL:** Terminate TLS using a reverse proxy (Nginx, Caddy, Cloudflare, or Azure App Gateway).

---

## Troubleshooting

### Backend Issues
- **Account Locked:**
  - If locked during testing, wait for the lockout period (5, 15, or 60 minutes) or reset directly in the database:
    ```sql
    UPDATE userlist SET failed_attempts = 0, lockout_until = NULL, lockout_count = 0 WHERE username = 'testuser';
    ```
- **Database Connection Refused:**
  - Verify PostgreSQL service is running and listening on port 5432.
  - Test connectivity with `psql -U postgres -d flowcus`.

### Frontend Issues
- **CORS Errors:**
  - Confirm the backend's allowed origins list contains the frontend URL and port.
- **Client Route Hydration:**
  - Authenticated routes are configured with `RenderMode.Client` in `app.routes.server.ts` to prevent SSR prerender failures for unauthenticated states.

### Android Issues
- **Cannot Connect to Backend:**
  - If running in Android Emulator, make sure `.env` points to `http://10.0.2.2:7176/api`, NOT `http://localhost:7176/api`.
  - If running on a physical Android device, connect phone and workstation to the same Wi-Fi network and set `.env` to your workstation's LAN IP address.
- **Native ScreenTimeModule Permission:**
  - Querying usage stats requires Android `PACKAGE_USAGE_STATS` permission. The user must grant "Usage Access" in Android System Settings when prompted.
