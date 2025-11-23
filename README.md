# FlowCus

**FlowCus** is a modern, high-performance productivity application designed to help users manage their tasks, flow, and schedules with precision. Built with the latest web technologies, it offers a seamless experience for tracking tasks, organizing categories, and planning timetables.

## 🚀 Key Features

### 📝 Comprehensive Task Management
* **Smart Task Tracking**: Create, edit, and manage tasks with ease.
* **Categorization**: Organize tasks into **Categories** and **Subtypes** for granular control over your workflow.
* **Prioritization**: Set priority levels to focus on what matters most.
* **Time Tracking**: Define start and end times for tasks to monitor your schedule effectively.

### 📅 Advanced Scheduling
* **Timetables**: Plan your days with structured timetables.
* **Timetable Items**: Break down your schedule into actionable items.
* **Dashboard Overview**: Get a bird's-eye view of your productivity and upcoming activities.

### 🔐 Enterprise-Grade Security
* **Secure Authentication**: robust JWT-based authentication with **automatic token refreshing** and HttpOnly cookie support.
* **Rate Limiting**: Built-in protection against brute-force attacks with IP and user-based rate limits.
* **Data Integrity**: Database-level validation ensures your data is always consistent and accurate.
* **Encrypted Configuration**: Sensitive connection strings are encrypted at rest using AES-256.

### 👤 User & Admin Management
* **User Profiles**: Manage personal settings and profile details.
* **Admin Capabilities**: Dedicated user management features for administrators.

---

## 🛠️ Technology Stack

FlowCus relies on a cutting-edge, high-performance stack:

* **Frontend**: [Angular 19](https://angular.io/) (Latest Standalone Component Architecture)
* **Backend**: [.NET 8](https://dotnet.microsoft.com/) Web API
* **Database**: [PostgreSQL](https://www.postgresql.org/) with Dapper for high-performance data access
* **Styling**: Modern CSS with responsive design principles

---

## ⚡ Getting Started

### Prerequisites
* Node.js (v18+)
* .NET 8 SDK
* PostgreSQL

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/axewhyzed/flowcus.git](https://github.com/axewhyzed/flowcus.git)
    cd flowcus
    ```

2.  **Setup Database**
    * Execute the SQL scripts located in `FlowCus-db/` to set up tables and functions.
    * Update your connection string in `appsettings.json`.

3.  **Run Backend**
    ```bash
    cd FlowCus-backend
    dotnet run
    ```

4.  **Run Frontend**
    ```bash
    cd FlowCus-frontend/flowcus
    npm install
    npm start
    ```

---

## 📄 License

This project is licensed under the MIT License.