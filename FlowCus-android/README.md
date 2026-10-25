# FlowCus Android Application

The mobile companion application for Flowcus, built with React Native, TypeScript, Redux Toolkit, React Navigation, and Native Android (Kotlin) modules.

---

## Features

### 1. Productivity Dashboard
- **Dynamic Greetings:** Contextual time-based greetings ("Good morning", "Good afternoon", "Good evening").
- **Productivity Metrics:** Real-time analytics synchronized with backend API:
  - Daily Average focus hours
  - Completion Rate percentage
  - Completed task count (not a focus-session count)
  - Streak Days counter
- **Analytics Focus Duration:** The seven-day focus chart and average use completed tasks with valid start/end times; completion streaks use each task's completion date, including unscheduled tasks.
- **Active Focus Card:** Identifies what task or scheduled block is currently active, with direct fallback to active timetable schedules and a "Free time!" resting state.
- **Active Tasks Counter:** Displays pending uncompleted tasks count.

### 2. Focus Session & Pomodoro Timer
- **Background-Safe Epoch Math:** Timer relies on epoch target calculation (`targetEndTime - Date.now()`), preventing time drift when the app is placed in the background or paused by Android power management.
- **Duration Presets:** Quick selection chips for 15 min, 25 min, 45 min, and 60 min sessions, or custom duration input.
- **Session Controls:** Start, Pause, Resume, and Cancel actions.
- **Auto-Logging:** When a session reaches 00:00, the device triggers haptic vibration and automatically records the completed session to the backend via `createTask`.

### 3. Task Management
- **Completion Checkbox:** Instant toggle between active and completed states with checkmark feedback.
- **Strikethrough Typography:** Completed tasks render with clear strikethrough styling and subdued opacity.
- **Status Filter Chips:** Filter tasks instantly across `All`, `Active`, and `Completed`.
- **Category Badging:** Visual pill tags showing the task's assigned category.
- **Deletion with Confirmation:** Soft-deletes tasks using `DELETE /api/tasks/{id}` following a native user confirmation alert.

### 4. Subtypes & Limit Management
- **Active Limit Tracker:** Live indicator tracking the user's active subtype usage (e.g. `3/5 Used`).
- **Enforcement Alerts:** Alerts the user immediately if they attempt to exceed the 5 active subtype database limit.
- **Custom Subtypes:** Color picker and icon assignment linked to parent categories.
- **Deletion:** Easy subtype removal with instant list refresh.

### 5. Weekly Timetable
- **Weekly Schedule View:** Browse schedule blocks day by day (Monday through Sunday).
- **Subtype Selection:** Chip selector to assign specific subtypes to time slots.
- **Conflict Prevention:** Native alerts preventing overlapping time blocks.

### 6. Settings & Session Management
- **Account Context:** Displays logged-in user name, username, and role.
- **Server Gateway:** Displays current API base endpoint.
- **Secure Logout:** Clears stored JWT token and user credentials from `AsyncStorage`, returning the user to the login screen.

### 7. Native Screen Time Module (Kotlin)
- **Background Thread Processing:** Usage querying and app icon extraction run asynchronously on a background worker thread (`Thread { ... }.start()`), avoiding Android UI main thread drops.
- **Bitmap Downsampling:** Application icons are scaled down to 64x64 pixels before Base64 encoding, reducing memory usage and bridge serialization overhead.
- **Permission Handling:** Prompts user for Android `PACKAGE_USAGE_STATS` access.

---

## Project Structure

```
FlowCus-android/
├── android/
│   └── app/src/main/java/com/flowcus/
│       ├── MainActivity.kt
│       ├── MainApplication.kt
│       ├── ScreenTimeModule.kt        <-- Native Kotlin usage stats bridge
│       └── ScreenTimePackage.kt
├── src/
│   ├── components/
│   │   ├── navigation/
│   │   │   ├── DrawerNavigator.tsx    <-- Side drawer navigation
│   │   │   └── StackNavigator.tsx     <-- Screen routing & auth flow
│   │   ├── task/
│   │   │   └── TaskItem.tsx
│   │   └── timetable/
│   ├── native/
│   │   └── ScreenTimeModule.ts        <-- TypeScript interface for Kotlin module
│   ├── redux/
│   │   ├── slices/
│   │   │   ├── auth.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── subtypes.ts            <-- Subtypes state & limit tracking
│   │   │   ├── tasks.ts               <-- Tasks state & toggle complete
│   │   │   └── timetables.ts
│   │   └── store.ts
│   ├── screens/
│   │   ├── FocusSession.tsx           <-- Epoch-based focus timer
│   │   ├── HomeScreen.tsx             <-- Dashboard & stats
│   │   ├── LoginScreen.tsx
│   │   ├── SettingsScreen.tsx         <-- Settings & logout
│   │   ├── SubtypesScreen.tsx         <-- Subtypes manager
│   │   ├── TasksScreen.tsx            <-- Task list & filters
│   │   └── TimetableScreen.tsx
│   └── services/
│       └── apiClient.ts               <-- Axios HTTP client with interceptors
├── __tests__/
│   └── App.test.tsx
├── jest.config.js                     <-- Configured with React Native ESM transforms
├── jest.setup.js                      <-- Comprehensive native mocks
├── package.json
└── tsconfig.json
```

---

## Setup & Running

### Prerequisites
- Node.js 18+ or 20+
- JDK 17
- Android SDK (API 34+ recommended)
- Android Emulator or physical device connected via USB debugging

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
Create or edit `.env` in the `FlowCus-android` root:
```env
# For Android Emulator:
API_BASE_URL=http://10.0.2.2:7176/api

# For Physical Device (replace with your local workstation IP):
# API_BASE_URL=http://192.168.1.50:7176/api
```

`API_BASE_URL` is the environment variable read by the app. Debug builds allow local HTTP for emulator/device development. Release builds require an HTTPS URL; the app rejects an unset or insecure release URL.

### Release signing

Release APK/AAB tasks fail unless all of these are provided through environment variables or Gradle properties:

```text
FLOWCUS_RELEASE_STORE_FILE
FLOWCUS_RELEASE_STORE_PASSWORD
FLOWCUS_RELEASE_KEY_ALIAS
FLOWCUS_RELEASE_KEY_PASSWORD
```

Keep the keystore and passwords in your deployment secret store. Do not commit them or use the generated Android debug key to sign a release.

### Timetable reminders

Android may ask for notification and exact-alarm access when you create a timetable block. Weekly reminders are restored after device reboot. If access is denied, the schedule remains saved and you can grant access in Android Settings later.

### 3. Start Metro
```bash
npm start
```

### 4. Build and Run on Android
In another terminal:
```bash
npm run android
```

---

## Testing & Quality Assurance

### Run Jest Tests
```bash
npm test
```
Executes unit tests and component render verification using preconfigured native module mocks.

### Strict TypeScript Check
```bash
npx tsc --noEmit
```
Verifies full TypeScript type compliance across all components, navigation props, Redux slices, and native module bridges.

### Android Verification Standard

For Android code changes, source review, the complete Jest suite, the TypeScript check above, and native Gradle unit tests (`./gradlew testDebugUnitTest` from the `android` directory) are the required verification. A physical device or emulator run is not required for completion.
