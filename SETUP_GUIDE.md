# FlowCus - Configuration

## 🚀 LOCAL SETUP INSTRUCTIONS

### Step 1: Update Configuration Files

#### appsettings.Development.json (already updated with placeholders)
```json
{
  "ConnectionStrings": {
    "DBLocal": "User ID=postgres;Password=YOUR_LOCAL_DB_PASSWORD;Host=localhost;Port=5432;Database=flowcus_dev;"
  },
  "Jwt": {
    "Key": "dev-jwt-key-for-testing-min-32-characters-long-replace-in-prod"
  }
}
```

**What to do:**
- Replace `YOUR_LOCAL_DB_PASSWORD` with your actual local PostgreSQL password
- Replace `flowcus_dev` with your actual database name
- Keep the JWT Key as-is for local development

#### appsettings.Production.json (template - DO NOT COMMIT)
```json
{
  "ConnectionStrings": {
    "DBLocal": "User ID=postgres;Password=YOUR_PRODUCTION_DB_PASSWORD;Host=your-production-host.com;Port=5432;Database=flowcus_prod;"
  },
  "Jwt": {
    "Key": "generate-a-strong-random-key-minimum-32-characters-use-openssl"
  }
}
```

**What to do:**
- ✅ File is in `.gitignore` (won't be committed)
- Replace with your ACTUAL production values
- Generate strong JWT key: `openssl rand -base64 32`
- Verify `.gitignore` has `appsettings.Production.json` ← IT DOES ✓

---

## 🧪 TESTING CHECKLIST

### Admin Lockout Testing
```
1. Login with wrong password 3 times
   Expected: Account locked, message shown
2. Try 4th attempt immediately
   Expected: Error (account locked)
3. Wait 2 minutes (or 15 for production)
   Expected: Can login again
```

### Dashboard Testing
```
1. Login and navigate to /dashboard
   Expected: 
   - Greeting "Hello, [username]" shows
   - Admin badge appears (if admin user)
   - Today's schedule displays
   - Today's tasks display
```

### Timetable Operations
```
1. Create timetable from /timetables
   Expected: New timetable appears in list
2. Add item with time 10:00 → 11:00
   Expected: Item created
3. Try add overlapping item 10:30 → 11:00
   Expected: Error "overlaps with existing event"
4. Update timetable name
   Expected: Name changes using PUT endpoint
5. Delete timetable
   Expected: Timetable soft-deleted, items cleaned up
```

### Admin User Management
```
1. Go to /users (admin only)
2. Create user with password: testuser/Test@1234
   Expected: User created, can login
3. Update user to admin
   Expected: User gets admin badge
4. Delete user
   Expected: User marked as deleted, can't login
```

---

## 🔑 Environment Variables Reference

### Required for Development
```
DBLocal={connection_string}
Jwt:Key={jwt_secret}
ENCRYPTION_KEY={encryption_key}
```

### Required for Production
```
Environment=Production
DBLocal={prod_connection_string}
Jwt:Key={prod_jwt_secret}
ENCRYPTION_KEY={prod_encryption_key}
AuthSettings:LockoutMinutes=15    ← Stricter in production
```

---