# Flowcus - Productivity and Task Management Application

Flowcus is a comprehensive cross-platform productivity and task management system designed to help users organize their time, execute deep focus sessions, schedule weekly timetables, and monitor real-time productivity. The system integrates a robust ASP.NET Core 10 backend, a modern Angular 19 web application, a full-featured React Native Android mobile client, and a PostgreSQL database.

---

## Architecture Overview

```
                      ┌─────────────────────────────────────────┐
                      │           PostgreSQL Database           │
                      │  - Row-level user isolation             │
                      │  - Advisory transaction locks           │
                      │  - Strict check constraints & triggers  │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │       ASP.NET Core 10 Web API            │
                      │  - Dapper ORM + Npgsql 10.0              │
                      │  - Progressive account lockout          │
                      │  - Timezone-aware date calculations     │
                      │  - Per-request session-version checks   │
                      └────────────┬───────────────┬────────────┘
                                   │               │
                 ┌─────────────────┘               └─────────────────┐
                 ▼                                                   ▼
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│     Angular 19 Web Client       │                 │   React Native Android Client   │
│  - Standalone lazy components   │                 │  - Redux Toolkit state store    │
│  - Client hydration routing     │                 │  - Background-safe Focus Timer  │
│  - Automatic timezone headers   │                 │  - Native Kotlin ScreenTime     │
│  - Task completion & filters    │                 │  - Task & Subtype managers      │
└─────────────────────────────────┘                 └─────────────────────────────────┘
```

---

## Core Features & Capabilities

### 1. Task Management
- **Task Lifecycle:** Dedicated `is_completed` boolean, `completed_on` transition timestamp, and `PATCH /api/tasks/{id}/toggle-complete` endpoint. Task completion does **not** soft-delete the record, preserving analytics and audit history.
- **Dedicated Deletion:** `DELETE /api/tasks/{id}` performs soft-deletion (`is_deleted = true`), completely separating completion from removal.
- **Categorization & Subtypes:** Tasks can be organized under global administrative categories and customized personal subtypes with hex colors and icons.
- **Flexible Scheduling:** Start and end timestamps support zero-duration events (`end_time >= start_time`), enabling instantaneous check-ins and milestones alongside scheduled blocks.
- **Priority & Filtering:** Priority levels (1-5) and multi-state status filters (`All`, `Active`, `Completed`).
- **Partial Updates:** `PATCH /api/tasks/{id}` updates only supplied fields; explicit null clears nullable fields, and ownership/reference checks run before saving.
- **Retry-Safe Creation:** `POST /api/tasks` accepts an optional `Idempotency-Key` to safely retry identical create requests.

### 2. Focus Sessions & Mobile Productivity
- **Background-Safe Focus Timer:** Android client features a robust timer driven by epoch math (`targetEndTime - Date.now()`), impervious to Android OS background throttling and pause drift.
- **Preset & Custom Durations:** Quick-select focus blocks (15m, 25m, 45m, 60m) or custom durations.
- **Auto-Logging:** Completed focus sessions automatically synchronize to the backend as logged tasks.
- **Native Android Screen Time Integration:** Kotlin `ScreenTimeModule` queries device usage stats in background threads with 64x64 icon downsampling, eliminating UI thread stutters.

### 3. Timetable & Weekly Scheduling
- **Weekly and One-Off Scheduling:** Users can configure up to 5 non-deleted timetables with single-active enforcement per user. Date-specific blocks appear separately and do not repeat weekly.
- **Concurrency Protection:** PostgreSQL advisory transaction locks (`pg_advisory_xact_lock(user_id)`) prevent race conditions when creating timetables or subtypes up to the limit of 5.
- **Overlap Detection:** Database and service-level validation prevents overlapping time blocks within the same timetable and day.
- **Timezone Synchronization:** Browser requests send the IANA timezone in `X-Timezone-Id` (for example, `Asia/Kolkata`) and retain `X-Timezone-Offset` for older-server compatibility. The API uses the IANA timezone for date-sensitive operations and falls back to the legacy offset when the header is omitted.

### 4. Authentication, Security & Progressive Lockout
- **Progressive Account Lockout:** Protects accounts against brute-force attacks via tiered lockouts:
  - **Tier 1 (Attempts 1–3):** 5-minute lockout upon 3 consecutive failures.
  - **Tier 2 (Attempts 4–6):** 15-minute lockout upon 3 additional failures.
  - **Tier 3+ (Attempts 7+):** 60-minute lockout repeating on each subsequent failure until successful authentication resets both `failed_attempts` and `lockout_count` to 0.
- **Session Revocation:** JWTs carry a database-backed token version checked on every authenticated request; logout, password changes, role changes, and deletion revoke existing sessions.
- **Browser CSRF Protection:** Web requests use the HttpOnly `auth_session` cookie plus an XSRF token/header and trusted Origin check. Native clients continue to use bearer tokens.
- **Rate Limiting:** Atomic database-backed IP-level (30 requests/min) and normalized-username (10 requests/min) windows shared across API instances.
- **Password Security:** BCrypt password hashing with configurable work factor.

---

## API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate user; native clients receive bearer token; browser cookie mode receives user and CSRF token |
| `GET` | `/api/auth/csrf` | Retrieve the CSRF token for an existing cookie session |
| `POST` | `/api/auth/register` | Register new user account |
| `GET` | `/api/auth/me` | Retrieve currently authenticated user context |
| `POST` | `/api/auth/logout` | Invalidate session and clear authentication cookie |

### Tasks (`/api/tasks`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | List user tasks with optional category filter |
| `POST` | `/api/tasks` | Create a task; optional `Idempotency-Key` makes identical retries return the original task id |
| `GET` | `/api/tasks/{id}` | Retrieve specific task details |
| `PUT` | `/api/tasks/{id}` | Update task details |
| `PATCH` | `/api/tasks/{id}` | Apply a validated partial update; explicit null clears nullable fields |
| `PATCH` | `/api/tasks/{id}/toggle-complete` | Toggle `is_completed` flag between true and false |
| `DELETE` | `/api/tasks/{id}` | Soft-delete task |

### Task Categories (`/api/task-category`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/task-category` | List all global categories |
| `POST` | `/api/task-category` | Create global category (Admin only) |
| `PUT` | `/api/task-category/{id}` | Update global category (Admin only) |
| `DELETE` | `/api/task-category/{id}` | Soft-delete category (Admin only) |

### Task Subtypes (`/api/task-subtype`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/task-subtype` | List user's subtypes |
| `POST` | `/api/task-subtype` | Create custom subtype (max 5 active per user) |
| `PUT` | `/api/task-subtype/{id}` | Update custom subtype |
| `DELETE` | `/api/task-subtype/{id}` | Soft-delete subtype |

### Timetables & Items (`/api/timetable`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/timetable` | List user timetables |
| `POST` | `/api/timetable` | Create new timetable (max 5 active per user) |
| `GET` | `/api/timetable/{id}` | Retrieve specific timetable with items |
| `PUT` | `/api/timetable/{id}` | Update timetable metadata |
| `POST` | `/api/timetable/{id}/activate` | Activate timetable (deactivates other user timetables) |
| `DELETE` | `/api/timetable/{id}` | Soft-delete timetable and associated items |
| `POST` | `/api/timetable/{timetableId}/items` | Add scheduled item to timetable |
| `PUT` | `/api/timetable/items/{id}` | Update timetable item |
| `DELETE` | `/api/timetable/items/{id}` | Delete timetable item |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/stats` | Retrieve daily average focus time, completion rate, completed-task count, streak days, and pending tasks |
| `GET` | `/api/dashboard/now` | Retrieve current scheduled task/block based on UTC now and active timetable |

---

## Verification & Testing

Every layer of FlowCus includes dedicated test suites and build verifications:

### 1. Backend Automated Tests (xUnit)
```bash
cd FlowCus-backend
dotnet test FlowCus.sln
```
*Validates task validation, priority bounds (1-5), zero-duration acceptance, timetable overlap logic, and progressive lockout transitions (Tier 1: 5m, Tier 2: 15m, Tier 3+: 60m).*

### 2. Angular Frontend Build & Typecheck
```bash
cd FlowCus-frontend/flowcus
npm run build
```
*Verifies standalone route lazy-loading, client-hydration modes, bundle size budgets, and TypeScript compilation.*

### 3. Android React Native Tests & Typecheck
```bash
cd FlowCus-android
npm test
npx tsc --noEmit
```
*Runs Jest unit and snapshot tests with mocked native modules, Redux store verification, and strict TypeScript check.*

---

## Configuration & Environment Variables

### Backend Configuration (`appsettings.json` / Environment Variables)
- `ConnectionStrings:DefaultConnection`: PostgreSQL connection string for a least-privilege non-superuser role.
- `Jwt:Key`: Secret key for JWT signing (minimum 32 UTF-8 bytes; the tracked placeholder is rejected).
- `Jwt:Issuer`: `FlowcusAPI`
- `Jwt:Audience`: `FlowcusClient`
- `AuthSettings:MaxFailedAttempts`: `3`
- `AuthSettings:FirstLockoutMinutes`: `5`
- `AuthSettings:SecondLockoutMinutes`: `15`
- `AuthSettings:MaxLockoutMinutes`: `60`
- `AuthSettings:BcryptWorkFactor`: `12`
- `AuthSettings:IpRateLimitPerMinute`: `30`
- `AuthSettings:UserRateLimitPerMinute`: `10`

### Frontend Configuration (`environment.ts`)
- `apiUrl`: `http://localhost:7176/api` (Development) or production API domain.

### Mobile Configuration (`.env`)
- `API_BASE_URL`: API gateway endpoint (e.g., `http://10.0.2.2:7176/api` for Android Emulator or `http://<your-lan-ip>:7176/api` for physical device).

---

## Documentation Links

- [Setup Guide (Local, Docker & Production)](./SETUP_GUIDE.md)
- [Comprehensive Manual & Automation Testing Guide](./TESTING.md)
- [Android Mobile App Documentation](./FlowCus-android/README.md)
- [Database Schema Definitions](./FlowCus-db/)
