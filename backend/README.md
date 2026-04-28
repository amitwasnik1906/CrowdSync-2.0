# CrowdSync Backend

Smart Bus Occupancy Monitoring & Tracking System — Backend API

CrowdSync is an intelligent transportation solution that integrates computer vision–based passenger counting with GPS-enabled bus tracking to provide real-time updates on bus location, occupancy levels, and route information.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma (v7)
- **Real-Time:** Socket.io (WebSocket)
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcryptjs

## Project Structure

```
backend/
├── server.js                            # Entry point (Express + Socket.io)
├── scripts/
│   └── oauth-init.js                    # One-time Google Drive OAuth setup
├── prisma/
│   ├── schema.prisma                    # Database schema (10 models)
│   ├── prisma.config.ts                 # Prisma 7 configuration
│   ├── seed.js                          # Database seeder
│   └── migrations/                      # Migration files
└── src/
    ├── config/
    │   └── prisma.js                    # Prisma client singleton
    ├── utils/
    │   └── response.js                  # Standard API response helpers
    ├── services/
    │   └── driveService.js              # Google Drive OAuth client (folder + image upload)
    ├── middleware/
    │   ├── auth.js                      # JWT authentication & role-based authorization
    │   ├── upload.js                    # multer (in-memory, 5 MB / image, 10 max)
    │   └── errorHandler.js              # Global error handler
    ├── controllers/
    │   ├── authController.js            # Parent OTP login, Admin login/register
    │   ├── parentController.js          # Parent CRUD & linked students
    │   ├── studentController.js         # Student CRUD & attendance history
    │   ├── busController.js             # Bus CRUD, driver assignment, location, route
    │   ├── busLocationController.js     # GPS location updates
    │   ├── driverController.js          # Driver CRUD
    │   ├── attendanceController.js      # Student entry/exit marking
    │   ├── routeController.js           # Bus route polyline management
    │   └── notificationController.js    # Push notifications to parents
    ├── routes/
    │   ├── auth.js
    │   ├── parents.js
    │   ├── students.js
    │   ├── buses.js
    │   ├── drivers.js
    │   ├── attendance.js
    │   ├── routes.js
    │   └── notifications.js
    └── websocket/
        └── socket.js                    # Socket.io event handlers
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL running locally or remotely

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the `backend/` folder. Copy `sample.env` and fill in the blanks:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/crowdsync"
PORT=5000
JWT_SECRET="your-secret-key"

# Google Drive — OAuth user delegation (used for face-image uploads)
GOOGLE_OAUTH_CLIENT_SECRET_PATH=E:\path\to\client_secret.json
GOOGLE_OAUTH_TOKEN_PATH=E:\path\to\token.json
DRIVE_PARENT_FOLDER_ID=<Drive folder ID from the URL>
```

### Google Drive setup (one-time)

The student/driver create endpoints upload face images to Google Drive. The flow uses your personal Google account via OAuth (no Workspace required).

1. **Cloud Console → APIs & Services → OAuth consent screen** → User Type **External** → fill name + support email → add your Gmail under **Test users** → add scope `https://www.googleapis.com/auth/drive` → Save.
2. **Cloud Console → APIs & Services → Credentials → + Create credentials → OAuth client ID** → Application type **Desktop app** → download the JSON and save it at the path you set in `GOOGLE_OAUTH_CLIENT_SECRET_PATH`.
3. Run the consent flow once:
   ```bash
   node scripts/oauth-init.js
   ```
   A browser opens, you sign in and click **Allow**, and the resulting refresh token is written to `GOOGLE_OAUTH_TOKEN_PATH`.

> While the OAuth consent screen is in **Testing** mode, Google revokes the refresh token after 7 days. If uploads start failing with auth errors, re-run `node scripts/oauth-init.js`.

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed the database (creates default admin + sample data)
npm run seed
```

### Run the Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

The server starts at `http://localhost:5000`.

## Default Credentials

After seeding:


| Role   | Email / Phone                                     | Password  |
| ------ | ------------------------------------------------- | --------- |
| Admin  | [admin@crowdsync.com](mailto:admin@crowdsync.com) | admin123  |
| Parent | +1234567890                                       | OTP-based |


## API Documentation

All endpoints are prefixed with `/api`.

### Authentication


| Method | Endpoint                   | Description                    | Access |
| ------ | -------------------------- | ------------------------------ | ------ |
| POST   | `/api/auth/parent/login`   | Parent login via OTP           | Public |
| POST   | `/api/auth/admin/login`    | Admin login (email + password) | Public |
| POST   | `/api/auth/admin/register` | Register new admin             | Public |


**Parent Login Flow:**

1. Send `{ "phone": "+1234567890" }` → receives OTP (logged to console in dev)
2. Send `{ "phone": "+1234567890", "otp": "123456" }` → receives JWT token

**Admin Login:**

```json
{ "email": "admin@crowdsync.com", "password": "admin123" }
```

### Parents


| Method | Endpoint                    | Description           | Access        |
| ------ | --------------------------- | --------------------- | ------------- |
| GET    | `/api/parents/:id`          | Get parent profile    | Authenticated |
| GET    | `/api/parents/:id/students` | Get parent's students | Authenticated |
| POST   | `/api/parents`              | Create parent         | Admin         |
| PUT    | `/api/parents/:id`          | Update parent         | Admin         |
| DELETE | `/api/parents/:id`          | Delete parent         | Admin         |


### Students


| Method | Endpoint                              | Description                                 | Access        |
| ------ | ------------------------------------- | ------------------------------------------- | ------------- |
| GET    | `/api/students/:studentId/attendance` | Get attendance history                      | Authenticated |
| POST   | `/api/students`                       | Create student (multipart, see notes below) | Admin         |
| GET    | `/api/students/:id`                   | Get student details                         | Admin         |
| PUT    | `/api/students/:id`                   | Update student                              | Admin         |
| DELETE | `/api/students/:id`                   | Delete student                              | Admin         |


**`POST /api/students` request shape (multipart/form-data):**

| Field        | Type   | Notes                                                         |
| ------------ | ------ | ------------------------------------------------------------- |
| `name`       | text   | required                                                      |
| `class`      | text   | required                                                      |
| `parentId`   | text   | required, integer                                             |
| `busId`      | text   | required, integer                                             |
| `images`     | file[] | one or more image files (≥1 required, image/*, ≤5 MB each)    |

`faceId` is **not** sent by the client. The server creates a Drive folder, uploads the images into it, and stores the Drive folder ID as `Student.faceId`.


### Buses


| Method | Endpoint                             | Description             | Access        |
| ------ | ------------------------------------ | ----------------------- | ------------- |
| POST   | `/api/buses`                         | Create bus              | Admin         |
| GET    | `/api/buses`                         | List all buses          | Admin         |
| GET    | `/api/buses/:id`                     | Get bus details         | Authenticated |
| PUT    | `/api/buses/:busId/assign-driver`    | Assign driver to bus    | Admin         |
| DELETE | `/api/buses/:id`                     | Delete bus              | Admin         |
| GET    | `/api/buses/:busId/location`         | Get live bus location   | Authenticated |
| GET    | `/api/buses/:busId/route`            | Get bus route polyline  | Authenticated |
| GET    | `/api/buses/:busId/location-history` | Get location history    | Authenticated |
| GET    | `/api/buses/:busId/attendance`       | Get bus attendance      | Admin         |
| POST   | `/api/buses/location`                | Update bus GPS location | Bus System    |


**`DELETE /api/buses/:id` behavior:**

- Returns **409** if any students are still assigned to the bus — reassign them first via `PUT /api/students/:id`.
- Otherwise unassigns the driver, deletes the bus's `BusRoute`, deletes its `Attendance` rows, and then deletes the bus itself, all in one transaction.
- Attendance history for that bus is permanently lost — there is no soft-delete / archive flag.


### Drivers


| Method | Endpoint           | Description                                | Access        |
| ------ | ------------------ | ------------------------------------------ | ------------- |
| POST   | `/api/drivers`     | Create driver (multipart, see notes below) | Admin         |
| GET    | `/api/drivers`     | List drivers                               | Admin         |
| GET    | `/api/drivers/:id` | Get driver                                 | Authenticated |
| PUT    | `/api/drivers/:id` | Update driver                              | Admin         |
| DELETE | `/api/drivers/:id` | Delete driver                              | Admin         |


**`POST /api/drivers` request shape (multipart/form-data):** `name`, `phone`, `licenseNumber`, optional `busId`, plus one or more `images` files (same rules as students). `faceId` is generated server-side as the Drive folder ID.


### Attendance


| Method | Endpoint                | Description            | Access     |
| ------ | ----------------------- | ---------------------- | ---------- |
| POST   | `/api/attendance/entry` | Mark student boarding  | Bus System |
| POST   | `/api/attendance/exit`  | Mark student alighting | Bus System |


### Routes


| Method | Endpoint             | Description      | Access |
| ------ | -------------------- | ---------------- | ------ |
| POST   | `/api/routes`        | Create bus route | Admin  |
| PUT    | `/api/routes/:busId` | Update bus route | Admin  |


### Notifications


| Method | Endpoint                | Description                 | Access        |
| ------ | ----------------------- | --------------------------- | ------------- |
| POST   | `/api/notify`           | Send notification to parent | Bus System    |
| GET    | `/api/notify/:parentId` | Get parent's notifications  | Authenticated |


## WebSocket Events

Connect to the server using Socket.io client at `http://localhost:5000`.

### Client → Server


| Event         | Payload    | Description                       |
| ------------- | ---------- | --------------------------------- |
| `joinBus`     | `busId`    | Subscribe to a bus's live updates |
| `leaveBus`    | `busId`    | Unsubscribe from a bus's updates  |
| `joinParent`  | `parentId` | Subscribe to parent notifications |
| `leaveParent` | `parentId` | Unsubscribe from notifications    |


### Server → Client


| Event               | Payload                                            | Description                  |
| ------------------- | -------------------------------------------------- | ---------------------------- |
| `busLocationUpdate` | `{ busId, latitude, longitude, speed, timestamp }` | Real-time bus location       |
| `studentEntry`      | `{ studentId, studentName, busId, time, locationName }` | Student boarded the bus      |
| `studentExit`       | `{ studentId, studentName, busId, time, locationName }` | Student exited the bus       |
| `notification`      | `{ id, title, body, type, createdAt }`             | Push notification for parent |


## Authorization Roles


| Role         | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| `admin`      | Full access to all endpoints                                |
| `parent`     | View own profile, students, bus location, and notifications |
| `bus_system` | Update GPS location, mark attendance, send notifications    |


All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## NPM Scripts


| Script                    | Command                                |
| ------------------------- | -------------------------------------- |
| `npm run dev`             | Start server with nodemon (hot reload) |
| `npm start`               | Start server in production             |
| `npm run prisma:generate` | Generate Prisma client                 |
| `npm run prisma:migrate`  | Run database migrations                |
| `npm run prisma:studio`   | Open Prisma Studio GUI                 |
| `npm run seed`            | Seed database with sample data         |


## Database Models

- **Admin** — System administrators
- **Otp** — OTP records for parent authentication
- **Parent** — Parents linked to students
- **Student** — Students with face IDs, linked to parent and bus
- **Bus** — Buses with capacity, occupancy, and GPS coordinates
- **Driver** — Drivers assigned to buses
- **Attendance** — Student boarding/alighting records
- **BusLocation** — GPS location history
- **BusRoute** — Route polylines and stops
- **Notification** — Push notifications for parents

