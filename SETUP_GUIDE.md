# Flowcus Setup Guide

Complete instructions for setting up and deploying the Flowcus application in various environments.

## Table of Contents
1. Prerequisites
2. Local Development Setup
3. Database Setup
4. Backend Configuration
5. Frontend Configuration
6. Running the Application
7. Docker Deployment
8. Cloud Deployment
9. Production Checklist
10. Troubleshooting

## Prerequisites

### Required Software
- .NET 7.0 SDK or later
- Node.js 16+ with npm or yarn
- PostgreSQL 12 or later
- Git
- A code editor (Visual Studio Code recommended)

### Required Knowledge
- Basic understanding of .NET and Angular
- SQL basics for database management
- Command line/terminal usage
- Git version control

### System Requirements
- Minimum 2GB RAM
- At least 500MB free disk space
- Windows, macOS, or Linux operating system

## Local Development Setup

### Step 1: Clone the Repository

Open your terminal and clone the project:

```bash
git clone https://github.com/axewhyzed/flowcus.git
cd flowcus
```

### Step 2: Setup PostgreSQL Database

Download and install PostgreSQL from https://www.postgresql.org/download/

After installation, create the database:

```bash
# Connect to PostgreSQL (you'll be prompted for the postgres user password)
psql -U postgres

# Create the database
CREATE DATABASE flowcus;

# Exit psql
\q
```

### Step 3: Initialize Database Schema

Navigate to the database folder and execute the schema scripts:

```bash
cd FlowCus-db
# Execute each SQL file in tables/ directory
psql -U postgres -d flowcus -f tables/userlist.sql
psql -U postgres -d flowcus -f tables/task_category.sql
psql -U postgres -d flowcus -f tables/task_subtypes.sql
psql -U postgres -d flowcus -f tables/tasks.sql
psql -U postgres -d flowcus -f tables/timetables.sql
psql -U postgres -d flowcus -f tables/timetable_items.sql
```

Verify the tables were created:

```bash
psql -U postgres -d flowcus -c "\dt"
```

### Step 4: Backend Setup

Navigate to the backend directory:

```bash
cd FlowCus-backend
```

Restore NuGet packages:

```bash
dotnet restore
```

Create or update the appsettings configuration file. If appsettings.Development.json doesn't exist, create it:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=flowcus;Username=postgres;Password=your_postgres_password"
  },
  "JwtSettings": {
    "SecretKey": "your-super-secret-key-minimum-32-characters-long-for-security",
    "ExpirationMinutes": 1440
  },
  "AuthSettings": {
    "MaxFailedAttempts": 3,
    "LockoutMinutes": 15,
    "BcryptWorkFactor": 12,
    "IpRateLimitPerMinute": 30,
    "UserRateLimitPerMinute": 10
  },
  "Cors": {
    "AllowedOrigins": "http://localhost:4200"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information"
    }
  }
}
```

Build the backend:

```bash
dotnet build
```

Run the backend:

```bash
dotnet run
```

The backend will start on http://localhost:5000 and https://localhost:5001

### Step 5: Frontend Setup

Open a new terminal window and navigate to the frontend directory:

```bash
cd FlowCus-frontend/flowcus
```

Install dependencies:

```bash
npm install
# or if you use yarn
yarn install
```

Update the API base URL if needed. Edit `src/app/core/constants/api-endpoints.ts`:

```typescript
const API_BASE_URL = 'http://localhost:5000/api';
export const API_ENDPOINTS = {
  AUTH: API_BASE_URL + '/auth',
  TASKS: API_BASE_URL + '/tasks',
  CATEGORIES: API_BASE_URL + '/categories',
  SUBTYPES: API_BASE_URL + '/subtypes',
  TIMETABLE: API_BASE_URL + '/timetable',
  DASHBOARD: API_BASE_URL + '/dashboard',
  USER: API_BASE_URL + '/user',
  ADMIN: API_BASE_URL + '/admin'
};
```

Start the development server:

```bash
ng serve
# or
npm start
```

The frontend will be available at http://localhost:4200

## Database Setup

### Database Structure

The application uses the following tables:

**userlist** - User accounts and authentication
- id (primary key)
- username (unique)
- password_hash (BCrypt encrypted)
- name (display name)
- is_admin (boolean)
- created_on (timestamp)
- updated_on (timestamp)
- failed_attempts (login attempt counter)
- lockout_until (lockout timestamp)
- is_deleted (soft delete flag)

**task_category** - Task categories for organization
- id (primary key)
- name (category name)
- created_on (timestamp)
- is_deleted (soft delete flag)

**task_subtypes** - Specific task types within categories
- id (primary key)
- user_id (foreign key to userlist)
- category_id (foreign key to task_category)
- name (subtype name)
- color_hex (color code for UI)
- icon_name (icon identifier)
- created_on (timestamp)
- is_deleted (soft delete flag)

**tasks** - User tasks
- task_id (primary key)
- created_by (foreign key to userlist)
- title (task title)
- description (task description)
- created_on (timestamp)
- updated_on (timestamp)
- is_deleted (soft delete flag)

**timetables** - Weekly schedules
- id (primary key)
- user_id (foreign key to userlist)
- name (timetable name)
- is_active (currently active timetable)
- created_on (timestamp)
- updated_on (timestamp)
- is_deleted (soft delete flag)

**timetable_items** - Scheduled time slots within timetables
- id (primary key)
- timetable_id (foreign key to timetables)
- task_category_id (foreign key to task_category)
- task_subtype_id (foreign key to task_subtypes, nullable)
- day_of_week (0-6, Monday-Sunday)
- start_time (time in HH:MM:SS format)
- end_time (time in HH:MM:SS format)
- specific_date (override date for one-time entries)
- created_on (timestamp)
- is_deleted (soft delete flag)

### Backup and Restore

Backup the database:

```bash
pg_dump -U postgres flowcus > flowcus_backup.sql
```

Restore from backup:

```bash
psql -U postgres -d flowcus < flowcus_backup.sql
```

## Backend Configuration

### appsettings.json Properties

**ConnectionStrings**
- DefaultConnection: PostgreSQL connection string with host, port, database, username, and password

**JwtSettings**
- SecretKey: Secret key for signing JWT tokens (must be at least 32 characters)
- ExpirationMinutes: Token expiration time in minutes (default: 1440 = 24 hours)

**AuthSettings**
- MaxFailedAttempts: Number of failed login attempts before lockout (default: 3)
- LockoutMinutes: Duration of account lockout in minutes (default: 15)
- BcryptWorkFactor: Password hashing strength (10-12 recommended, default: 12)
- IpRateLimitPerMinute: Rate limit for IP addresses per minute (default: 30)
- UserRateLimitPerMinute: Rate limit for user accounts per minute (default: 10)

**Cors**
- AllowedOrigins: Frontend URL(s) allowed to make requests to the API

**Logging**
- LogLevel: Set logging levels for different components

### Environment Variables

For production, use environment variables instead of appsettings.json:

```bash
# Database
export ConnectionStrings__DefaultConnection="Host=prod-db;Port=5432;Database=flowcus;Username=dbuser;Password=dbpassword"

# JWT
export JwtSettings__SecretKey="your-production-secret-key-minimum-32-characters"

# Auth
export AuthSettings__MaxFailedAttempts="3"
export AuthSettings__LockoutMinutes="30"
export AuthSettings__BcryptWorkFactor="14"

# CORS
export Cors__AllowedOrigins="https://yourdomain.com"
```

## Frontend Configuration

### Environment Files

Create environment configuration files for different deployments:

**environment.ts** (development)
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000'
};
```

**environment.prod.ts** (production)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com'
};
```

### API Configuration

Update API endpoints in `src/app/core/constants/api-endpoints.ts`:

```typescript
import { environment } from '../../environments/environment';

const API_BASE_URL = environment.apiUrl + '/api';
export const API_ENDPOINTS = {
  AUTH: API_BASE_URL + '/auth',
  TASKS: API_BASE_URL + '/tasks',
  CATEGORIES: API_BASE_URL + '/categories',
  SUBTYPES: API_BASE_URL + '/subtypes',
  TIMETABLE: API_BASE_URL + '/timetable',
  DASHBOARD: API_BASE_URL + '/dashboard',
  USER: API_BASE_URL + '/user',
  ADMIN: API_BASE_URL + '/admin'
};
```

### CORS Configuration

The frontend must be registered in the backend's CORS settings:

```json
"Cors": {
  "AllowedOrigins": "http://localhost:4200,https://yourdomain.com"
}
```

## Running the Application

### Development Mode

Terminal 1 - Start the backend:
```bash
cd FlowCus-backend
dotnet run
```

Terminal 2 - Start the frontend:
```bash
cd FlowCus-frontend/flowcus
ng serve
```

Terminal 3 (optional) - Monitor the database:
```bash
psql -U postgres -d flowcus
```

Access the application at http://localhost:4200

### Test User Account

After database initialization, create a test account through the registration page, or insert directly:

```bash
psql -U postgres -d flowcus

INSERT INTO userlist (username, password_hash, name, is_admin, created_on, updated_on, is_deleted)
VALUES ('admin', '$2a$12$...bcrypt_hash...', 'Administrator', true, now(), now(), false);
```

Note: Generate the BCrypt hash using a tool or the application's authentication service.

## Docker Deployment

### Dockerfile for Backend

Create a Dockerfile in the FlowCus-backend directory:

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY . .
RUN dotnet build -c Release
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:7.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 5000
ENTRYPOINT ["dotnet", "FlowCus.dll"]
```

Build and run:

```bash
docker build -t flowcus-backend .
docker run -p 5000:5000 -e ConnectionStrings__DefaultConnection="..." flowcus-backend
```

### Docker Compose

Create docker-compose.yml for full stack:

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: flowcus
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./FlowCus-backend
    ports:
      - "5000:5000"
    environment:
      ConnectionStrings__DefaultConnection: "Host=db;Port=5432;Database=flowcus;Username=postgres;Password=postgres"
      JwtSettings__SecretKey: "your-secret-key-here"
    depends_on:
      - db

  frontend:
    build: ./FlowCus-frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

Run with Docker Compose:

```bash
docker-compose up -d
```

## Cloud Deployment

### Azure App Service

1. Create App Service and PostgreSQL Flexible Server
2. Update connection string in App Service Configuration
3. Deploy using Azure CLI or GitHub Actions:

```bash
az webapp deployment source config-zip \
  --resource-group mygroup \
  --name myapp \
  --src deploy.zip
```

### Render.com

1. Create PostgreSQL database on Render
2. Deploy backend from GitHub to Render Web Service
3. Deploy frontend to Render Static Site
4. Update API URL in frontend environment variables

### AWS

1. Create RDS PostgreSQL instance
2. Deploy backend to Elastic Beanstalk
3. Deploy frontend to S3 + CloudFront
4. Configure security groups and IAM roles

## Production Checklist

Before deploying to production, ensure:

- Database backups are configured
- SSL/TLS certificates are installed
- JWT secret key is securely stored
- Environment variables are properly set
- Rate limiting is configured appropriately
- CORS is configured for your domain only
- Password hashing work factor is set to 12+
- Error logging is configured
- Database connection pooling is enabled
- Security headers are configured
- API documentation is available to frontend team
- Database migrations are tested
- Load testing has been performed
- Security scanning has been completed
- Monitoring and alerting are configured
- Incident response plan is in place

## Troubleshooting

### Backend Issues

**Database connection error:**
- Verify PostgreSQL is running
- Check connection string in appsettings.json
- Verify database and user exist
- Test connection: `psql -U postgres -d flowcus`

**Port already in use:**
- Change port in appsettings.json: `"Urls": "http://localhost:5001"`
- Or kill the process: `lsof -i :5000` then `kill <PID>`

**JWT errors:**
- Verify SecretKey is at least 32 characters
- Check token expiration time
- Ensure frontend sends token in Authorization header

**Rate limit locked:**
- Wait for lockout period (default 15 minutes)
- Or clear in database: `UPDATE userlist SET failed_attempts = 0, lockout_until = NULL WHERE username = 'user'`

### Frontend Issues

**Blank page or 404 error:**
- Verify ng serve is running
- Check browser console for errors
- Clear browser cache and reload
- Verify API_ENDPOINTS are correct

**API connection errors:**
- Verify backend is running on correct port
- Check CORS configuration in backend
- Verify API URL in environment files
- Check browser console for specific errors

**Time display issues:**
- Verify browser timezone is correct
- Check frontend time conversion logic
- Verify database stores times in UTC

### Database Issues

**Table doesn't exist:**
- Verify all SQL files were executed
- Check for errors during schema creation
- Re-run the schema scripts if needed

**Performance issues:**
- Check for missing indexes
- Verify query optimization
- Monitor database resource usage
- Consider connection pooling settings

### General Issues

**Logs location:**
- Backend: Console output and application event logs
- Frontend: Browser developer console (F12)
- Database: PostgreSQL logs in data directory

**Getting help:**
- Check application logs for error messages
- Review API responses with developer tools
- Consult PostgreSQL documentation
- Review Angular documentation for frontend issues

## Performance Optimization

### Backend
- Enable query result caching
- Use connection pooling
- Implement pagination for large datasets
- Monitor slow queries with EXPLAIN

### Frontend
- Lazy load modules
- Enable production build optimization: `ng build --configuration production`
- Implement virtual scrolling for large lists
- Cache API responses appropriately

### Database
- Create indexes on frequently queried columns
- Regular vacuum and analyze operations
- Monitor table sizes
- Archive old soft-deleted data periodically

## Security Best Practices

1. Always use HTTPS in production
2. Store secrets in environment variables, not in code
3. Regularly update dependencies
4. Implement API rate limiting
5. Enable database encryption at rest
6. Use strong password requirements
7. Implement audit logging
8. Regular security scanning and penetration testing
9. Keep PostgreSQL and .NET updated
10. Monitor authentication logs for suspicious activity

## Next Steps

After successful setup:
1. Create additional user accounts
2. Explore task management features
3. Create task categories and subtypes
4. Build your first timetable
5. Check dashboard for statistics
6. Review admin features if you have admin access
7. Configure backup and monitoring for production

For additional help, refer to the README.md file or contact the development team.