# Smart Community Ride Sharing Platform

This project is a scaffold for the Smart Community Ride Sharing Platform. The folder structure is organized to align with the system architecture and specifications.

## Technology Stack

- **Frontend**: React.js (built with Vite) + Tailwind CSS (v4) + React Router DOM
- **Backend**: Node.js + Express.js + Socket.IO (for real-time events)
- **Database**: MySQL (schema and spatial indexing to be set up in later phases)
- **Authentication**: JWT-based (middleware and folder scaffolded)

---

## Folder Structure

The project is structured into three main directories:
1. `backend/`: Core modular backend application containing all services defined in the architecture.
2. `frontend/`: React single-page application containing all 24 page screens.
3. `ride-sharing/`: Specifications, PRD, User Stories, and Architecture documents.

```
/
├── backend/                  # Backend service-oriented architecture
│   ├── src/
│   │   ├── middleware/       # Shared middleware (e.g. auth validation)
│   │   ├── services/         # Modules mapping 1:1 to system architecture
│   │   │   ├── admin-moderation-service/
│   │   │   ├── auth-service/
│   │   │   ├── booking-service/
│   │   │   ├── cost-calculation-service/
│   │   │   ├── matching-engine-service/
│   │   │   ├── notification-service/
│   │   │   ├── profile-verification-service/
│   │   │   ├── rating-review-service/
│   │   │   ├── ride-management-service/
│   │   │   └── safety-sos-service/
│   │   ├── socket/           # Socket.IO Real-Time Gateway scaffold
│   │   └── server.js         # Express Server Entrypoint
│   └── package.json          # Backend dependencies
│
├── frontend/                 # Frontend Web Application (React + Vite)
│   ├── src/
│   │   ├── pages/            # 24 Screen templates mapping to wireframe specs
│   │   ├── App.jsx           # Client router and index navigation
│   │   ├── index.css         # Tailwind directives & CSS config
│   │   └── main.jsx          # React entrypoint
│   └── package.json          # Frontend dependencies
│
├── ride-sharing/             # Project specification documents
└── README.md                 # Project root documentation
```

---

## Backend Services Mapping

The subdirectories in `backend/src/services/` map directly to the components outlined in `08-system-architecture.md`:

| Backend Folder | System Architecture Component | Primary Responsibility |
| --- | --- | --- |
| `auth-service` | Auth Service | Registration, OTP verification, JWT session management |
| `profile-verification-service` | Profile and Verification Service | User profiles, vehicle registration, trust/verification badges |
| `ride-management-service` | Ride Management Service | Ride CRUD, route points & states (Scheduled/Ongoing/Completed) |
| `matching-engine-service` | Matching Engine Service | Route-overlap algorithms, spatial index queries, relevance ranking |
| `booking-service` | Booking Service | Booking requests, confirmation workflow, seats status |
| `cost-calculation-service` | Cost Calculation Service | Proportionate cost-sharing calculation math |
| `rating-review-service` | Rating and Review Service | Post-ride user feedback, aggregate rating adjustments |
| `admin-moderation-service` | Admin and Moderation Service | Reports queue, suspensions, manual verification resolution |
| `safety-sos-service` | Safety and SOS Service | Emergency SOS handling, live location session tracking |
| `notification-service` | Notification Service | Routine dispatch (SMS and push notification integrations) |

---

## Frontend Screens Mapping

The page components in `frontend/src/pages/` correspond to the 24 screens listed in `06-wireframes.md`:

1. **Splash Screen**: `SplashScreen.jsx`
2. **Onboarding Screen**: `OnboardingScreen.jsx`
3. **Login Screen**: `LoginScreen.jsx`
4. **OTP Verification**: `OtpVerificationScreen.jsx`
5. **Registration Screen**: `RegistrationScreen.jsx`
6. **Profile Setup Screen**: `ProfileSetupScreen.jsx`
7. **Home Screen**: `HomeScreen.jsx`
8. **Search Screen**: `SearchScreen.jsx`
9. **Search Results Screen**: `SearchResultsScreen.jsx`
10. **Ride Details Screen**: `RideDetailsScreen.jsx`
11. **Create Ride Screen**: `CreateRideScreen.jsx`
12. **Ride Requests**: `RideRequestsScreen.jsx`
13. **Active Ride Screen**: `ActiveRideScreen.jsx`
14. **Ride Completion / Confirmation**: `RideCompletionScreen.jsx`
15. **Rating Screen**: `RatingScreen.jsx`
16. **Notifications Screen**: `NotificationsScreen.jsx`
17. **Profile Screen**: `ProfileScreen.jsx`
18. **Public Profile Screen**: `PublicProfileScreen.jsx`
19. **Ride History Screen**: `RideHistoryScreen.jsx`
20. **Savings Dashboard**: `SavingsDashboardScreen.jsx`
21. **Safety Center Screen**: `SafetyCenterScreen.jsx`
22. **Report Center Screen**: `ReportCenterScreen.jsx`
23. **Settings Screen**: `SettingsScreen.jsx`
24. **Admin Dashboard**: `AdminDashboardScreen.jsx`

---

## How to Run

### Prerequisite
Ensure [Node.js](https://nodejs.org/) (v16+) is installed.

### Run Backend
1. Navigate to `/backend`
2. Run `npm install`
3. Run `npm run dev` (starts on port 5000)
4. Health check endpoint: `http://localhost:5000/health`

### Run Frontend
1. Navigate to `/frontend`
2. Run `npm install`
3. Run `npm run dev` (starts Vite server, standard port 5173)
