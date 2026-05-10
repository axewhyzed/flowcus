# FlowCus Manual Testing Guide

This guide covers the non-Android FlowCus application: Angular frontend, ASP.NET Core backend, and PostgreSQL database behavior. It is written as a manual QA checklist with sample data and expected outcomes.

## Scope

Included:
- Web authentication and session behavior
- Admin and standard-user authorization
- Dashboard
- Task categories
- Task subcategories
- Tasks
- Timetables and timetable items
- User profile
- Admin user management
- API and database validation paths
- Cross-user isolation, deletion behavior, and responsive UI checks

Excluded:
- `FlowCus-android`

## Test Environment Assumptions

Use these URLs unless your local setup differs:

| Surface | URL |
|---|---|
| Frontend | `http://localhost:4200` |
| Backend API | `https://localhost:<backend-port>/api` or `http://localhost:<backend-port>/api` |
| Database | PostgreSQL database with tables from `FlowCus-db/tables` and functions/triggers from `FlowCus-db/functions` |

Backend config values that affect expected results:

| Setting | Default in code | Behavior |
|---|---:|---|
| `AuthSettings:MaxFailedAttempts` | `3` | Account locks after 3 failed password attempts |
| `AuthSettings:LockoutMinutes` | `2` | Locked account rejects login for about 2 minutes |
| `AuthSettings:IpRateLimitPerMinute` | `30` | More than 30 login attempts per minute from one IP returns `429` |
| `AuthSettings:UserRateLimitPerMinute` | `10` | More than 10 login attempts per minute for one username returns `429` |
| `Jwt` expiry | 7 days | Login token and cookie expire after 7 days |
| Subtype limit | 5 active subtypes per user | Enforced by DB trigger |
| Timetable limit | 5 active/non-deleted timetables per user | Enforced by DB trigger |

## Canonical Sample Data

Create or confirm these accounts before running the test suite.

| Role | Username | Password | Name |
|---|---|---|---|
| Admin | `qa_admin` | `AdminPass123!` | `QA Admin` |
| Standard user A | `qa_user_a` | `UserPass123!` | `QA User A` |
| Standard user B | `qa_user_b` | `UserPass123!` | `QA User B` |

Create these global categories as admin:

| Category | Description | Color | Icon |
|---|---|---|---|
| `Work` | Professional tasks and planning | `#2563EB` | `fa-solid fa-briefcase` |
| `Study` | Learning and revision | `#16A34A` | `fa-solid fa-book` |
| `Fitness` | Exercise and health routines | `#DC2626` | `fa-solid fa-dumbbell` |
| `Personal` | Personal errands and life admin | `#9333EA` | `fa-solid fa-home` |
| `Meeting` | Calls and scheduled meetings | `#F59E0B` | `fa-solid fa-calendar` |

Create these subcategories while logged in as `qa_user_a`:

| Subcategory | Parent category |
|---|---|
| `Deep Work` | `Work` |
| `Email` | `Work` |
| `Algorithms` | `Study` |
| `Cardio` | `Fitness` |
| `Errands` | `Personal` |

Use these task samples:

| Title | Description | Category | Subcategory | Start | End |
|---|---|---|---|---|---|
| `Draft sprint plan` | `Write goals and blockers` | `Work` | `Deep Work` | Today `09:00` | Today `10:30` |
| `Review algorithms notes` | `Dynamic programming recap` | `Study` | `Algorithms` | Today `18:00` | Today `19:00` |
| `Grocery run` | `Buy vegetables and milk` | `Personal` | `Errands` | Tomorrow `17:30` | Tomorrow `18:00` |
| `No-time task` | `Task without schedule` | `Work` | None | blank | blank |

Use these timetable samples:

| Timetable | Active |
|---|---|
| `QA Weekday Routine` | Yes |
| `QA Weekend Routine` | No |

Use these timetable block samples:

| Timetable | Day | Category | Subcategory | Start | End |
|---|---|---|---|---|---|
| `QA Weekday Routine` | Monday | `Work` | `Deep Work` | `9:00 AM` | `11:00 AM` |
| `QA Weekday Routine` | Monday | `Meeting` | None | `11:00 AM` | `12:00 PM` |
| `QA Weekday Routine` | Monday | `Study` | `Algorithms` | `6:00 PM` | `7:00 PM` |
| `QA Weekday Routine` | Tuesday | `Fitness` | `Cardio` | `7:00 AM` | `8:00 AM` |

## Result Status Legend

Use this column while testing:

| Mark | Meaning |
|---|---|
| Pass | Behavior matches expected outcome |
| Fail | Behavior differs from expected outcome |
| Blocked | Cannot test because setup, dependency, or environment is unavailable |
| N/A | Case does not apply to this environment |

## Authentication And Session Tests

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| AUTH-001 | Login page loads unauthenticated | Open `/login` in a fresh browser session | Login form shows username and password fields; protected nav is not shown |  |
| AUTH-002 | Protected route redirects guest | Open `/dashboard` while logged out | Browser redirects to `/login` with a `returnUrl` query param |  |
| AUTH-003 | Required username validation | Submit login with blank username and any password | Username required message appears; request is not sent |  |
| AUTH-004 | Required password validation | Submit login with `qa_user_a` and blank password | Password required message appears; request is not sent |  |
| AUTH-005 | Minimum password validation | Submit `qa_user_a` / `12345` | Submit remains disabled or validation prevents login because password length is less than 6 |  |
| AUTH-006 | Valid user login | Submit `qa_user_a` / `UserPass123!` | Success toast appears; user lands on `/dashboard`; auth token is stored; HttpOnly cookie is set by API |  |
| AUTH-007 | Valid admin login | Submit `qa_admin` / `AdminPass123!` | Dashboard loads; Admin badge appears where applicable; Admin Mode toggle is available in the header |  |
| AUTH-008 | Invalid password | Submit `qa_user_a` / `WrongPass123!` | Error toast or login error shows `Invalid credentials.`; user remains on login page |  |
| AUTH-009 | Unknown username | Submit `missing_user` / `UserPass123!` | Error shows invalid credentials; no details reveal whether username exists |  |
| AUTH-010 | Account lockout after failures | Attempt wrong password for `qa_user_a` 3 times | Fourth attempt with correct password before lockout expiry fails as invalid credentials |  |
| AUTH-011 | Lockout expiry | Wait about 2 minutes after AUTH-010, then login correctly | Login succeeds; failed attempts reset |  |
| AUTH-012 | IP login rate limit | Send more than 30 login attempts within 1 minute from same IP | API returns `429` with `Too many requests. Please try again later.` |  |
| AUTH-013 | Username login rate limit | Send more than 10 attempts within 1 minute for `qa_user_a` | API returns `429` |  |
| AUTH-014 | Session restore after refresh | Login, refresh `/dashboard` | User stays authenticated; `/api/auth/me` restores user state |  |
| AUTH-015 | Logout | Click Logout | Cookie is cleared by API; token is removed from local storage; redirected to `/login`; protected pages redirect |  |
| AUTH-016 | Logout endpoint requires auth | Call `POST /api/auth/logout` without token/cookie | API returns `401` |  |
| AUTH-017 | Expired/invalid token handling | Manually set an invalid `auth_token`, open `/dashboard` | API returns `401`; app clears token and redirects to login |  |
| AUTH-018 | Deleted user token invalidation | Login as a test user, delete that user as admin, reuse old token | API rejects token because user no longer exists |  |
| AUTH-019 | Role change invalidates old role token | Login as admin, have another admin remove admin rights, call admin endpoint with old token | API rejects token because role claim no longer matches DB role |  |
| AUTH-020 | Cookie and bearer auth both work | Login via UI, then call an API with the stored bearer token; also call with only cookie | Both authenticated requests succeed when token/cookie is valid |  |

## Navigation And Layout Tests

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| NAV-001 | Default route | Open `/` as authenticated user | Redirects to `/dashboard` |  |
| NAV-002 | Wildcard route | Open `/not-a-real-page` as authenticated user | Redirects to `/dashboard` |  |
| NAV-003 | Header links for standard user | Login as `qa_user_a` | Header shows Dashboard, Tasks, Task Category, Timetables, Profile; User Management is hidden |  |
| NAV-004 | Header links for admin mode off | Login as `qa_admin` with Admin Mode off | User Management is hidden |  |
| NAV-005 | Header links for admin mode on | Toggle Admin Mode on | User Management appears |  |
| NAV-006 | Direct admin route as standard user | Login as `qa_user_a`, open `/users` | User is redirected to dashboard; admin page does not render |  |
| NAV-007 | Mobile menu | Narrow viewport under 768px, login, tap menu button | Mobile nav opens/closes and links navigate correctly |  |
| NAV-008 | Active link styling | Navigate across main pages | Current page link receives active styling |  |
| NAV-009 | Header greeting | Login as user with name `QA User A` | Header greets `QA User A`; fallback is username if name is blank |  |

## Dashboard Tests

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| DASH-001 | Dashboard initial load | Login as `qa_user_a`, open `/dashboard` | Greeting uses user name; today's date appears; main cards render |  |
| DASH-002 | Admin badge | Login as `qa_admin` | Dashboard shows Admin badge |  |
| DASH-003 | Standard user has no admin badge | Login as `qa_user_a` | Dashboard does not show Admin badge |  |
| DASH-004 | Today tasks list | Create task scheduled today | Task appears in Today's Tasks sorted by start time |  |
| DASH-005 | Future task excluded from today | Create task scheduled tomorrow | Task does not appear in Today's Tasks |  |
| DASH-006 | Task without start time excluded from today list | Create `No-time task` | It counts in pending tasks API but does not appear in Today's Tasks list |  |
| DASH-007 | Today's schedule from active timetable | Activate timetable with a block for current day | Today's Schedule shows the active timetable's blocks for today |  |
| DASH-008 | Inactive timetable ignored | Put a current-day block only in inactive timetable | Dashboard does not show that block |  |
| DASH-009 | Empty schedule state | No active timetable or no blocks today | Shows `No events scheduled for today` |  |
| DASH-010 | Quick Task button | Click Quick Task | Navigates to `/tasks?action=create` and opens new task modal |  |
| DASH-011 | View Full Schedule button | Click View Full Schedule | Navigates to `/timetables` |  |
| DASH-012 | Current focus API with no block | Call `GET /api/dashboard/now` outside any active block | Returns message `No task scheduled right now. Free time!` |  |
| DASH-013 | Current focus API during active block | Add active timetable block covering current UTC time/day | Returns that timetable item with task name/color |  |
| DASH-014 | Cross-user dashboard isolation | Login as `qa_user_b` with no data | User B does not see User A tasks or timetable blocks |  |

## Category Tests

Categories are global and only admins can create, update, and delete them through the API. The UI exposes category editing in admin-specific flows, but direct API authorization must also be tested.

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| CAT-001 | List categories as standard user | Login as `qa_user_a`, open Task Category page | Active global categories are visible |  |
| CAT-002 | List categories as admin | Login as `qa_admin` | Active global categories are visible |  |
| CAT-003 | Create category as admin | Name `Reading`, color `#0EA5E9`, icon `fa-solid fa-book-open` | Category appears in list, sorted by name |  |
| CAT-004 | Create category with blank name | Admin submits blank or spaces | Warning shown in UI or API returns `400` with category name required |  |
| CAT-005 | Create duplicate active category | Admin creates another `Work` | API returns `409`; user sees conflict/error toast |  |
| CAT-006 | Create category as standard user via API | `POST /api/task-category` as `qa_user_a` | API returns `403` |  |
| CAT-007 | Edit category as admin | Rename `Reading` to `Reading QA`; change color | Category updates everywhere categories are loaded |  |
| CAT-008 | Edit category with duplicate name | Rename `Reading QA` to `Work` | API returns `409`; existing data unchanged |  |
| CAT-009 | Edit category as standard user via API | `PUT /api/task-category/{id}` as `qa_user_a` | API returns `403` |  |
| CAT-010 | Delete unused category as admin | Delete `Reading QA` when unused | Category disappears; API returns success |  |
| CAT-011 | Delete category used by task | Try deleting `Work` after creating a task using it | API returns `400` with `Category is still used...`; category remains visible |  |
| CAT-012 | Delete category used by subtype | Try deleting `Study` while `Algorithms` subtype exists | API returns `400`; category remains visible |  |
| CAT-013 | Delete category used by timetable item | Try deleting `Meeting` after adding a meeting block | API returns `400`; category remains visible |  |
| CAT-014 | Delete non-existent category | `DELETE /api/task-category/999999` as admin | API returns `404` |  |
| CAT-015 | Soft-deleted categories hidden | Soft delete a test category | It no longer appears in category selectors/lists |  |
| CAT-016 | Recreate soft-deleted category name | Delete `Reading QA`, create `Reading QA` again | New active category is allowed because uniqueness applies to non-deleted rows |  |
| CAT-017 | Invalid color format | Enter `blue` or `#XYZXYZ` in color text field | UI accepts text but browser color input may normalize; verify display does not break; DB has no strict color constraint |  |
| CAT-018 | Long category name | Create a name over 120 characters via API | DB/API rejects due column limit or returns database error; UI should remain usable |  |

## Subcategory Tests

Subcategories are per-user and can only reference active global categories.

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| SUB-001 | List own subcategories | Login as `qa_user_a` | Shows only User A subcategories |  |
| SUB-002 | Cross-user isolation | Login as `qa_user_b` | User B does not see User A subcategories |  |
| SUB-003 | Create valid subcategory | User B creates `Planning` under `Work` | Subcategory appears for User B only |  |
| SUB-004 | Create blank subcategory name | Submit blank name | UI warning or API `400` with subtype name required |  |
| SUB-005 | Create without category | Submit name with category `0` | UI warning or API `400` selected category does not exist |  |
| SUB-006 | Create duplicate name for same user | User A creates another `Deep Work` | API returns `409`; duplicate not added |  |
| SUB-007 | Same subtype name for different users | User B creates `Deep Work` | Succeeds because uniqueness is per user |  |
| SUB-008 | Create sixth subtype | User A already has 5 active subtypes; create `Reading` | DB trigger rejects; API returns error; subtype count remains 5 |  |
| SUB-009 | Delete then create replacement | User A deletes `Errands`, then creates `Reading` | Create succeeds because deleted subtype no longer counts toward active limit |  |
| SUB-010 | Edit subtype name | Rename `Email` to `Inbox` | Updated name appears in subcategory list and task/timetable selectors |  |
| SUB-011 | Edit subtype parent category | Move `Inbox` from `Work` to `Personal` | Subcategory appears under Personal; Work selector no longer lists it |  |
| SUB-012 | Edit subtype to duplicate name | Rename `Inbox` to `Deep Work` | API returns `409`; old name remains |  |
| SUB-013 | Get another user's subtype by ID | As User B call `GET /api/task-subtype/{userASubtypeId}` | API returns `404` |  |
| SUB-014 | Update another user's subtype | As User B call `PUT /api/task-subtype/{userASubtypeId}` | API returns `404` |  |
| SUB-015 | Delete another user's subtype | As User B call `DELETE /api/task-subtype/{userASubtypeId}` | API returns `404` |  |
| SUB-016 | Delete subtype used by active task | Delete `Deep Work` after tasks use it | Current service soft-deletes subtype without reference check; subtype disappears from selectors; existing tasks may show blank subcategory name |  |
| SUB-017 | Delete subtype used by timetable item | Delete `Algorithms` after timetable item uses it | Subtype disappears from selectors; timetable item may show category fallback or blank subtype depending join result |  |
| SUB-018 | Invalid category reference via API | Create subtype with `categoryId: 999999` | API returns `400` selected category does not exist |  |

## Task Tests

Tasks belong to the current user. Category is required. Subcategory is optional but, when present, must belong to the current user and selected category.

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| TASK-001 | Empty task list | Login as new `qa_user_b`, open `/tasks` | Empty state shows `No tasks yet` |  |
| TASK-002 | Open create modal | Click Add Task | New Task modal opens with default start time now and end time 30 minutes later |  |
| TASK-003 | Create valid task with subtype | Use `Draft sprint plan` sample | Success toast; task card appears with title, description, category, subcategory, start/end |  |
| TASK-004 | Create valid task without subtype | Use `No-time task` sample with category only | Task creates successfully; no subcategory pill is shown |  |
| TASK-005 | Missing title | Blank title and valid category | UI warning `Please enter a title and select a category.`; no API request or no record created |  |
| TASK-006 | Missing category | Valid title but category `0` | UI warning; no task created |  |
| TASK-007 | Start after end | Start today `11:00`, end today `10:00` | API rejects with `Task start time must be before end time.` |  |
| TASK-008 | Start equals end | Start today `10:00`, end today `10:00` | API rejects with `Task start time must be before end time.` |  |
| TASK-009 | End without start | Set only end time via API | Allowed by service/DB because order check only applies when both exist; task is created |  |
| TASK-010 | Start without end | Set only start time via API | Allowed; duration remains null |  |
| TASK-011 | Invalid category ID via API | `taskCategoryId: 999999` | API returns `400` selected category does not exist |  |
| TASK-012 | Invalid subtype ID via API | Valid category but `taskSubtypeId: 999999` | API returns `400` selected task subtype does not exist |  |
| TASK-013 | Subtype from different category | Category `Work`, subtype `Algorithms` | API returns `400` selected subtype does not belong to chosen category |  |
| TASK-014 | Subtype from another user | As User B use User A subtype ID | API returns `400` selected task subtype does not exist |  |
| TASK-015 | Priority valid via API | Create with `priority: 5` | Task is created; priority sort can place it above lower priority tasks |  |
| TASK-016 | Priority below range via API | Create with `priority: 0` | DB rejects with check constraint; API returns `400` |  |
| TASK-017 | Priority above range via API | Create with `priority: 6` | DB rejects with check constraint; API returns `400` |  |
| TASK-018 | Search by title | Search `sprint` | `Draft sprint plan` appears; unrelated tasks hidden |  |
| TASK-019 | Search by description | Search `dynamic` | `Review algorithms notes` appears |  |
| TASK-020 | Search case-insensitive | Search `SPRINT` | Same result as lowercase |  |
| TASK-021 | Filter by category | Select `Work` | Only Work tasks are visible |  |
| TASK-022 | No filter results | Search unlikely string `zzzz-no-match` | Shows `No tasks match your filters` and Clear filters button |  |
| TASK-023 | Clear filters | Click Clear filters | Search and category reset; tasks reappear |  |
| TASK-024 | Sort newest first | Select Newest First | Most recently created task appears first |  |
| TASK-025 | Sort oldest first | Select Oldest First | Oldest created task appears first |  |
| TASK-026 | Sort by priority | Create tasks priority 1 and 5 via API, select Priority | Priority 5 appears before priority 1; null priority sorts as 0 |  |
| TASK-027 | Edit task title and description | Open task, change title to `Draft sprint plan v2` | Success toast; card updates |  |
| TASK-028 | Edit task category and subtype | Change Work/Deep Work task to Study/Algorithms | Task updates; pills reflect new category/subcategory |  |
| TASK-029 | Edit task to invalid subtype/category mismatch via API | `PUT` Work category with Algorithms subtype | API returns `400`; old task unchanged |  |
| TASK-030 | Delete task cancel | Click Delete, cancel confirmation | Task remains |  |
| TASK-031 | Delete task confirm | Click Delete, confirm | Task disappears; subsequent `GET /api/tasks/{id}` returns `404` |  |
| TASK-032 | Delete another user's task | As User B delete User A task ID | API returns `404`; User A task remains |  |
| TASK-033 | Get another user's task | As User B call `GET /api/tasks/{userATaskId}` | API returns `404` |  |
| TASK-034 | Update another user's task | As User B call `PUT /api/tasks/{userATaskId}` | API returns `404` |  |
| TASK-035 | Deleted tasks hidden | Delete a task, reload `/tasks` | Soft-deleted task is not listed |  |
| TASK-036 | Long title | Submit title over 200 characters via API | DB rejects due column limit or API returns database error |  |
| TASK-037 | Special characters | Title `Plan & review <QA> "FlowCus"` | Task saves and displays safely without breaking layout |  |

## Timetable Tests

Each user can have up to 5 non-deleted timetables. Only one timetable can be active per user.

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| TT-001 | Empty timetable list | Login as new user, open `/timetables` | Empty state shows `No timetables yet` |  |
| TT-002 | Create inactive timetable | Name `QA Weekend Routine`, active unchecked | Timetable appears without Active badge |  |
| TT-003 | Create active timetable | Name `QA Weekday Routine`, active checked | Timetable appears with Active badge; any previous active timetable is inactive |  |
| TT-004 | Create blank timetable | Submit blank name | UI warning `Timetable name is required`; no timetable created |  |
| TT-005 | Create sixth timetable | Create 5 active/non-deleted timetables, then a sixth | DB trigger rejects; API returns error; list remains at 5 |  |
| TT-006 | Delete then create replacement | Delete one of five timetables, create a new one | New timetable is created |  |
| TT-007 | Activate inactive timetable | Click Activate on `QA Weekend Routine` | Weekend routine shows Active; weekday routine no longer active |  |
| TT-008 | Edit timetable name | Rename to `QA Weekday Routine v2` | List and selected panel show new name |  |
| TT-009 | Edit active flag off | Edit active timetable and uncheck active | Timetable becomes inactive; there may be no active timetable |  |
| TT-010 | Edit inactive flag on | Edit inactive timetable and check active | It becomes active and other user's timetables are unaffected |  |
| TT-011 | Delete timetable cancel | Click Delete and cancel | Timetable and its items remain |  |
| TT-012 | Delete timetable confirm | Confirm delete selected timetable | Timetable disappears; selected pane closes; its items are soft-deleted |  |
| TT-013 | Get another user's timetable | As User B call `GET /api/timetable/{userATimetableId}` | API returns `404` |  |
| TT-014 | Activate another user's timetable | As User B call activate on User A timetable ID | API returns `404` |  |
| TT-015 | Delete another user's timetable | As User B delete User A timetable ID | API returns `404`; User A timetable remains |  |
| TT-016 | Timetable list ordering | Create two timetables at different times | Newest appears first |  |

## Timetable Item Tests

Timetable item days use `0 = Sunday` through `6 = Saturday`. The UI only allows 30-minute increments, but the API accepts valid `HH:mm:ss` values.

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| TTI-001 | Add valid block | Monday Work/Deep Work `9:00 AM` to `11:00 AM` | Block appears under Monday with category/subcategory/time |  |
| TTI-002 | Add adjacent block | Monday Meeting `11:00 AM` to `12:00 PM` | Succeeds because end equals next start is not overlap |  |
| TTI-003 | Add overlapping start | Add Monday Study `10:30 AM` to `11:30 AM` | UI or API rejects overlap |  |
| TTI-004 | Add overlapping end | Add Monday Study `8:30 AM` to `9:30 AM` | UI or API rejects overlap |  |
| TTI-005 | Add containing overlap | Add Monday Study `8:00 AM` to `12:30 PM` | UI or API rejects overlap |  |
| TTI-006 | Add contained overlap | Existing `9:00 AM-11:00 AM`; add `9:30 AM-10:00 AM` | UI or API rejects overlap |  |
| TTI-007 | Same time different day | Add Tuesday Work `9:00 AM` to `11:00 AM` | Succeeds because overlap check is per day |  |
| TTI-008 | Same time different timetable | Add same Monday time in another timetable | Succeeds because overlap check is per timetable |  |
| TTI-009 | Missing category | Submit item with category `0` | UI warning or API `400` task category required |  |
| TTI-010 | Missing start time | Submit with blank start | UI warning `Please fill all required fields` |  |
| TTI-011 | Missing end time | Submit with blank end | UI warning `Please fill all required fields` |  |
| TTI-012 | Start equals end | `9:00 AM` to `9:00 AM` | UI warning/API `400` start time must be before end time |  |
| TTI-013 | Start after end | `11:00 AM` to `9:00 AM` | UI warning/API `400` start time must be before end time |  |
| TTI-014 | Invalid day below range | API payload `dayOfWeek: -1` | API returns `400` day must be between 0 and 6 |  |
| TTI-015 | Invalid day above range | API payload `dayOfWeek: 7` | API returns `400` day must be between 0 and 6 |  |
| TTI-016 | Invalid category ID | API payload `taskCategoryId: 999999` | API returns `400` selected category does not exist |  |
| TTI-017 | Invalid subtype ID | API payload `taskSubtypeId: 999999` | API returns `400` selected subtype does not exist |  |
| TTI-018 | Subtype category mismatch | Category Work with subtype Algorithms | API returns `400` subtype does not belong to chosen category |  |
| TTI-019 | Subtype from another user | User B uses User A subtype ID | API returns `400` subtype does not exist |  |
| TTI-020 | Create item in another user's timetable | User B posts item with User A timetable ID | API returns `403` |  |
| TTI-021 | Load another user's timetable items | User B calls `GET /api/timetable/{userATimetableId}/items` | API returns an empty list because ownership join does not match |  |
| TTI-022 | Edit block time valid | Change Monday Work block to `8:00 AM-9:00 AM` | Block updates and moves/sorts correctly |  |
| TTI-023 | Edit block to overlap another block | Change Monday block to overlap Meeting block | UI or API rejects overlap; old times remain |  |
| TTI-024 | Edit block category | Change Work block to Fitness/Cardio | Card shows Fitness/Cardio and category color |  |
| TTI-025 | Delete block cancel | Click delete and cancel | Block remains |  |
| TTI-026 | Delete block confirm | Confirm delete | Block disappears and is not returned by reload |  |
| TTI-027 | Delete another user's block | User B calls delete on User A item ID | API returns `404`; User A block remains |  |
| TTI-028 | Update another user's block | User B calls update on User A item ID | API returns `404`; User A block unchanged |  |
| TTI-029 | Daily total calculation | Monday has 2h Work and 1h Meeting | Monday summary shows `3h 0m` |  |
| TTI-030 | Empty day state | View a day with no blocks | Desktop shows `Free`; mobile shows `Nothing scheduled for <day>` |  |
| TTI-031 | Mobile day tabs | Narrow viewport, switch day tabs | Only selected day's blocks appear; totals update |  |
| TTI-032 | Time format conversion midnight | API item `00:00:00-00:30:00` | UI displays `12:00 AM - 12:30 AM` |  |
| TTI-033 | Time format conversion noon | API item `12:00:00-12:30:00` | UI displays `12:00 PM - 12:30 PM` |  |
| TTI-034 | API non-30-minute time | API item `09:15:00-09:45:00` | API accepts if valid and non-overlapping; UI displays it when loaded, but edit dropdown may not contain exact value |  |
| TTI-035 | Specific date optional via API | Include `specificDate` with otherwise valid item | API stores item; UI primarily groups by day of week and does not expose specific date editing |  |

## Profile Tests

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| PROF-001 | Load profile | Login as `qa_user_a`, open `/user` | Username, user ID, full name, and account status render |  |
| PROF-002 | Username read-only | Try to edit username field | Field is disabled; username cannot be changed |  |
| PROF-003 | User ID read-only | Try to edit user ID field | Field is disabled |  |
| PROF-004 | Update name valid | Change name to `QA User A Updated` | Success toast; header greeting updates after auth state refresh or next login |  |
| PROF-005 | Update name blank | Clear name and save | Button disabled or warning `Name is required`; API rejects blank name |  |
| PROF-006 | Reset profile form | Change name locally, click Reset | Original server value reloads |  |
| PROF-007 | Admin status display | Login as admin and open profile | Shows Administrator account type and Admin pill |  |
| PROF-008 | Standard status display | Login as standard user | Shows Standard User; no admin pill |  |
| PROF-009 | Change password success via API | `POST /api/auth/change-password` with current `UserPass123!`, new `UserPass456!` | API returns success; old password no longer works; new password works |  |
| PROF-010 | Change password wrong current | Current `WrongPass123!`, new valid password | API returns `401` current password incorrect |  |
| PROF-011 | Change password too short | Current valid, new `12345` | API returns `400` min length message |  |
| PROF-012 | Change password blank | Blank current or new password | API returns `400` required message |  |

## Admin User Management Tests

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| ADMIN-001 | Admin page access | Login as `qa_admin`, enable Admin Mode, open `/users` | User table loads |  |
| ADMIN-002 | Standard user blocked from admin page | Login as `qa_user_a`, open `/users` | Redirected to dashboard |  |
| ADMIN-003 | Standard user blocked from admin API | As `qa_user_a`, call `GET /api/admin/users` | API returns `403` |  |
| ADMIN-004 | List users hides password hashes | Inspect `GET /api/admin/users` response | Response includes id, username, name, createdOn, isAdmin; no passwordHash |  |
| ADMIN-005 | Search users by username | Type `qa_user` | Only matching usernames remain visible |  |
| ADMIN-006 | Search users by name | Type `admin` | `qa_admin` remains visible |  |
| ADMIN-007 | Create standard user | Username `qa_created_user`, password `CreatedPass123!`, name `Created User`, admin unchecked | User appears in table as User; can log in |  |
| ADMIN-008 | Create admin user | Username `qa_created_admin`, password `CreatedAdmin123!`, admin checked | User appears as Admin; can access admin page after login |  |
| ADMIN-009 | Create user blank username | Blank username | UI warning or API `400` username required |  |
| ADMIN-010 | Create user blank password | New user with blank password | UI warning or API `400` username and password required |  |
| ADMIN-011 | Create duplicate username | Create `qa_user_a` again | API returns `409` username exists |  |
| ADMIN-012 | Edit user name | Edit `qa_created_user` name to `Created User Updated` | Table updates with new name |  |
| ADMIN-013 | Edit user password | Set password to `CreatedPass456!` | Old password fails; new password succeeds |  |
| ADMIN-014 | Promote user to admin | Check Admin for `qa_created_user` | User role becomes Admin; old token should be invalid until re-login due role validation |  |
| ADMIN-015 | Demote admin when another admin exists | Uncheck Admin for `qa_created_admin` while `qa_admin` exists | Succeeds |  |
| ADMIN-016 | Cannot demote last admin | Try to remove admin rights from the only active admin account | API returns `400` cannot remove admin rights from last admin |  |
| ADMIN-017 | No-op update | API `PUT /api/admin/users/{id}` with no name, password, or isAdmin | API returns `400` no fields to update |  |
| ADMIN-018 | Edit current user disabled in UI | View row for logged-in admin | Edit button is disabled for own account |  |
| ADMIN-019 | Delete current user disabled in UI | View row for logged-in admin | Delete button is disabled for own account |  |
| ADMIN-020 | Delete self via API | Call `DELETE /api/admin/users/{currentAdminId}` | API returns `400` cannot delete own account |  |
| ADMIN-021 | Delete standard user | Delete `qa_created_user` | User disappears; cannot log in |  |
| ADMIN-022 | Cannot delete last admin | Try to delete the only remaining admin | API returns `400` cannot delete last admin |  |
| ADMIN-023 | Delete missing user | `DELETE /api/admin/users/999999` | API returns `404` because no row is updated |  |
| ADMIN-024 | Get user by ID | `GET /api/admin/users/{qa_user_a_id}` | Returns user details without password hash |  |
| ADMIN-025 | Get missing user | `GET /api/admin/users/999999` | API returns `404` |  |

## Authorization And API Isolation Tests

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| API-001 | Unauthenticated protected endpoint | Call `GET /api/tasks` without token/cookie | API returns `401` |  |
| API-002 | Standard endpoint with valid user | Call `GET /api/tasks` as `qa_user_a` | API returns only User A tasks |  |
| API-003 | Admin-only category create as user | `POST /api/task-category` as standard user | API returns `403` |  |
| API-004 | Admin-only category create as admin | Same request as admin | API returns success or validation error based on payload |  |
| API-005 | Admin-only users as user | `GET /api/admin/users` as standard user | API returns `403` |  |
| API-006 | Cross-user task isolation | Use User B token against User A task IDs | Get/update/delete return `404` |  |
| API-007 | Cross-user timetable isolation | Use User B token against User A timetable IDs | Get/update/delete/activate return `404` |  |
| API-008 | Cross-user item creation blocked | User B posts item into User A timetable | API returns `403` |  |
| API-009 | Cross-user subtype isolation | User B gets/updates/deletes User A subtype | API returns `404` |  |
| API-010 | Deleted user cannot authenticate | Admin deletes a user; try logging in as deleted user | Login returns invalid credentials |  |
| API-011 | Deleted records hidden from list endpoints | Soft-delete task/timetable/subtype/category | Corresponding list endpoint excludes deleted records |  |

## Database Constraint Tests

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| DB-001 | Unique active usernames | Create duplicate username | Unique constraint/API conflict prevents duplicate |  |
| DB-002 | Category active unique name | Create duplicate active category | Partial unique index prevents duplicate active name |  |
| DB-003 | Soft-deleted category name can be reused | Delete test category, recreate same name | Recreate succeeds |  |
| DB-004 | Subtype unique per user | Same user duplicate subtype name | Partial unique index prevents duplicate |  |
| DB-005 | Subtype name reused after delete | Delete subtype, recreate same name | Recreate succeeds |  |
| DB-006 | Subtype maximum active count | Insert sixth active subtype for one user | Trigger raises exception; API surfaces error |  |
| DB-007 | Timetable maximum active count | Insert sixth non-deleted timetable for one user | Trigger raises exception; API surfaces error |  |
| DB-008 | One active timetable per user | Activate a timetable while another is active | Service deactivates others; unique index remains satisfied |  |
| DB-009 | Task priority check low | Insert priority `0` | DB rejects |  |
| DB-010 | Task priority check high | Insert priority `6` | DB rejects |  |
| DB-011 | Task time order check | Insert task with end before start | DB rejects |  |
| DB-012 | Task duration generated column | Insert task `09:00-10:30` | `duration_seconds` is `5400` |  |
| DB-013 | Timetable item day check | Insert day `8` | DB rejects |  |
| DB-014 | Timetable item time order check | Insert `10:00-09:00` | DB rejects |  |
| DB-015 | Foreign key task category | Insert task with missing category ID | DB rejects |  |
| DB-016 | Foreign key task subtype | Insert task with missing subtype ID | DB rejects |  |
| DB-017 | User cascade impact | Physically delete user row in isolated test DB only | Related rows cascade because FKs use `ON DELETE CASCADE` where defined |  |
| DB-018 | Soft delete preferred path | Delete through API | `is_deleted = TRUE`; row remains in DB and is hidden by queries |  |

## Error Handling And Toast Tests

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| ERR-001 | API validation error toast | Submit invalid task time | Error toast shows backend message |  |
| ERR-002 | Conflict error toast | Create duplicate category or user | Error toast shows conflict message |  |
| ERR-003 | Forbidden error toast | Standard user calls admin action from API/UI if exposed | Error handling shows access forbidden where request is made outside login |  |
| ERR-004 | Unauthorized redirect | Expire token, open protected page | Redirect to login; no infinite loop |  |
| ERR-005 | Network error | Stop backend, perform a data load | Toast shows network error or generic failure; page does not crash |  |
| ERR-006 | Login errors are local to login page | Wrong password | Login page shows error; global interceptor does not redirect unnecessarily |  |
| ERR-007 | Confirmation cancel | Cancel delete dialogs on task/category/subtype/timetable/item/user | No delete request or data change occurs |  |

## Responsive And Browser UI Tests

| ID | Test case | Sample data / steps | Expected outcome | Status |
|---|---|---|---|---|
| UI-001 | Desktop dashboard | Width >= 1024px | Dashboard cards display in two columns without overlap |  |
| UI-002 | Mobile dashboard | Width around 375px | Cards stack; buttons remain tappable; no text overlaps |  |
| UI-003 | Desktop task grid | Many tasks on 1440px width | Cards form responsive grid; title truncation works |  |
| UI-004 | Mobile task modal | Open task modal on 375px width | Modal fits viewport and scrolls; buttons remain accessible |  |
| UI-005 | Desktop timetable columns | Open selected timetable on desktop | Seven day columns render; content is scrollable if needed |  |
| UI-006 | Mobile timetable selection | Open timetable on mobile | List hides after selection; back button returns to timetable list |  |
| UI-007 | Mobile timetable day tabs | Switch Monday/Tuesday/etc. | Active tab styling moves and content changes |  |
| UI-008 | Category cards long text | Create long category name/description | Text truncates or wraps without breaking cards |  |
| UI-009 | User management table mobile | Narrow viewport | Table remains usable or scrollable; controls do not overlap |  |
| UI-010 | Login page mobile | Open `/login` on mobile | Login form centered and usable; left marketing panel is hidden |  |
| UI-011 | Login page desktop | Open `/login` on desktop | Left panel and right form appear; form fields are accessible |  |
| UI-012 | Header mobile menu after navigation | Open menu, click a link | Menu closes after navigation |  |

## Regression Smoke Test

Run this shorter checklist before every release:

| ID | Steps | Expected outcome | Status |
|---|---|---|---|
| SMOKE-001 | Login as `qa_admin` | Dashboard loads and Admin Mode is available |  |
| SMOKE-002 | Create a category as admin | Category appears in lists |  |
| SMOKE-003 | Login as `qa_user_a` | Standard dashboard loads; no User Management link |  |
| SMOKE-004 | Create a subcategory under the new category | Subcategory appears only for User A |  |
| SMOKE-005 | Create a task with category/subcategory | Task card appears |  |
| SMOKE-006 | Edit and delete the task | Edit persists; delete hides task |  |
| SMOKE-007 | Create active timetable | Timetable appears active |  |
| SMOKE-008 | Add non-overlapping timetable block | Block appears under selected day |  |
| SMOKE-009 | Attempt overlapping block | App rejects overlap |  |
| SMOKE-010 | Open dashboard after timetable setup | Today's active schedule appears if the block is for current day |  |
| SMOKE-011 | Update profile name | Name update succeeds |  |
| SMOKE-012 | Logout | Protected route redirects to login |  |

## Known Behavior To Watch Closely

- The README mentions `POST /api/auth/register`, but the implemented endpoint requires an authenticated admin. User creation is also implemented under `POST /api/admin/users` and `POST /api/users` for admins.
- Dashboard date and current-focus logic use UTC in the backend. Manual testers in non-UTC time zones should verify whether "today" and "current time" match product expectations.
- Task priority exists in the backend/model but is not exposed in the current task form.
- Timetable item `specificDate` exists in the backend/model but is not exposed in the current UI.
- The UI only offers 30-minute time choices for timetable blocks, while the API can accept other valid `HH:mm:ss` times.
- Deleting subcategories does not currently block when tasks or timetable items reference them. Existing rows may display without the deleted subtype name.
- Category management exists both as a standalone Task Categories page and inside the Task Category/Task Types page. Authorization is enforced by the backend; verify UI access according to intended product routing.
