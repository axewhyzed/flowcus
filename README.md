# Flowcus - Productivity and Task Management Application

Flowcus is a comprehensive web-based application designed to help users manage their tasks, organize their time through timetables, and monitor their productivity. The application combines task management with time-based scheduling to provide users with a complete productivity solution.

## Overview

Flowcus enables users to:
- Create and manage tasks with categorization
- Organize tasks into categories and subtypes
- Build weekly timetables with scheduled time slots
- Track current activities and focus areas
- View productivity statistics and insights
- Manage multiple timetables with activation control
- Monitor real-time task scheduling

The application is built with a robust backend (.NET Core) and modern frontend (Angular) architecture, with PostgreSQL as the database.

## Core Features

### Task Management
- Create, read, update, and delete tasks
- Assign tasks to categories and subtypes
- Track task creation and modification timestamps
- Support for task description and detailed information
- User-specific task isolation (each user can only see their own tasks)
- Soft delete functionality for data retention and audit trails

### Task Organization
- Create custom task categories
- Define task subtypes with color coding and icons
- Organize subtypes within categories for better structure
- Assign color indicators (hex colors) to subtypes for visual identification
- Set custom icons for visual representation in the interface

### Timetable Management
- Create multiple weekly timetables
- Assign task categories and subtypes to time slots
- View timetables in calendar format by day of week
- Activate and deactivate timetables (only one active timetable per user at a time)
- Add specific date overrides to scheduled time slots
- Automatic overlap prevention for scheduled items
- Time validation and format conversion (12-hour to 24-hour)

### Dashboard and Analytics
- View productivity statistics (total tasks, completed tasks, categories used)
- Monitor current activity - see what task is scheduled for the current time
- Real-time focus tracking showing active time slot information
- User statistics including name and admin status
- Time-based task recommendations based on current schedule

### User Management
- User registration and login with secure authentication
- Password hashing with BCrypt (configurable work factor)
- Account lockout after failed login attempts (configurable threshold and duration)
- Failed login attempt tracking and automatic reset on successful authentication
- User profile management
- Admin role support for system-wide user and category management

### Admin Features
- View all users in the system
- Manage task categories across the system
- Create new global task categories
- Modify user information
- Track user creation dates and activity

### Authentication and Security
- JWT (JSON Web Token) based authentication
- Role-based access control (User and Admin roles)
- IP-based and user-based rate limiting on login attempts
- Configurable rate limits to prevent brute force attacks
- Secure password storage with BCrypt
- Account lockout mechanism after failed login attempts
- Session management with configurable JWT expiration

## Technical Architecture

### Backend (.NET Core)
- ASP.NET Core 7.0 or later
- RESTful API with comprehensive endpoint coverage
- Dapper ORM for database operations
- PostgreSQL database with optimized queries
- Role-based authorization middleware
- Memory caching for rate limiting
- Structured logging and error handling
- Exception handling for database constraints and business logic errors

### Frontend (Angular)
- Angular 15+ framework
- TypeScript for type-safe development
- Responsive design for web browsers
- Service-based architecture for API communication
- Form validation on client side before submission
- Time format conversion (12-hour AM/PM to 24-hour format)
- Overlap detection for schedule conflicts
- Calendar view for weekly timetables

### Database (PostgreSQL)
- Relational schema with referential integrity
- Soft delete pattern for data retention
- Timestamp tracking (created_on, updated_on)
- Check constraints for data validation
- Foreign key relationships for data consistency
- Tables: userlist, tasks, task_category, task_subtypes, timetables, timetable_items

## Data Security

The application implements multiple layers of security:
- All user data is isolated (users can only access their own data)
- Password hashing prevents plain-text storage
- JWT tokens for stateless authentication
- Authorization checks on all protected endpoints
- Rate limiting prevents brute force attacks
- Soft deletes preserve data audit trails
- Configurable password hashing parameters

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### Tasks
- `GET /api/tasks` - List all user tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/{id}` - Get specific task
- `PUT /api/tasks/{id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task

### Task Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `GET /api/categories/{id}` - Get specific category
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Task Subtypes
- `GET /api/subtypes` - List all subtypes for user
- `POST /api/subtypes` - Create subtype
- `GET /api/subtypes/{id}` - Get specific subtype
- `PUT /api/subtypes/{id}` - Update subtype
- `DELETE /api/subtypes/{id}` - Delete subtype

### Timetables
- `GET /api/timetable` - List all user timetables
- `POST /api/timetable` - Create new timetable
- `GET /api/timetable/{id}` - Get specific timetable
- `PUT /api/timetable/{id}` - Update timetable
- `DELETE /api/timetable/{id}` - Delete timetable
- `POST /api/timetable/{id}/activate` - Activate timetable
- `POST /api/timetable/{timetableId}/items` - Add item to timetable
- `GET /api/timetable/{timetableId}/items` - Get timetable items
- `PUT /api/timetable/items/{id}` - Update timetable item
- `DELETE /api/timetable/items/{id}` - Delete timetable item

### Dashboard
- `GET /api/dashboard/stats` - Get user statistics
- `GET /api/dashboard/now` - Get current scheduled task

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `POST /api/user/change-password` - Change password

### Admin
- `GET /api/admin/users` - List all users (admin only)
- `GET /api/admin/users/{id}` - Get specific user (admin only)
- `POST /api/admin/categories` - Create global category (admin only)
- `GET /api/admin/categories` - List all categories (admin only)
- `PUT /api/admin/users/{id}` - Update user details (admin only)
- `DELETE /api/admin/users/{id}` - Delete user (admin only)

## Configuration

Configuration is managed through:
- `appsettings.json` - Default settings
- `appsettings.{Environment}.json` - Environment-specific settings
- Environment variables - For sensitive information (database connection, JWT secret)

Key configuration options:
- Database connection string
- JWT secret and expiration time
- BCrypt work factor (password hashing strength)
- Rate limit thresholds (IP-based and user-based)
- CORS settings for frontend domain
- Logging levels

## Performance Considerations

- Queries are optimized with proper indexing
- Soft delete pattern allows for efficient filtering
- JWT authentication enables stateless API design
- Overlap detection uses database-level queries for efficiency
- Rate limiting prevents abuse and system overload

## Support and Documentation

- API documentation available through Swagger/OpenAPI (when enabled)
- Database schema documentation in FlowCus-db folder
- Setup instructions in SETUP_GUIDE.md
- Code follows standard naming conventions and is well-structured for maintainability

## Future Enhancements

Potential features for future versions:
- Task priorities and due dates
- Recurring timetables
- Team collaboration and shared timetables
- Mobile application support
- Advanced analytics and reporting
- Integration with calendar applications
- Email notifications for upcoming tasks
- Task history and audit logs
- Custom time zones and DST handling

## License

This project is provided as-is. Review LICENSE file for details.

## Support

For issues, bugs, or feature requests, please refer to the project documentation or contact the development team.