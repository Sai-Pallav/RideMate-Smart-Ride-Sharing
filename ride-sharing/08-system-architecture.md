# System Architecture
## Smart Community Ride Sharing Platform

---

## Design Philosophy

This architecture is designed under one guiding constraint: **the matching engine and the safety-critical path (SOS/emergency) are the two components most likely to need independent scaling, independent reliability guarantees, and independent evolution** — and the architecture isolates them accordingly from the start, rather than treating the system as a single monolithic CRUD application that gets split apart later under pressure.

Everything else (auth, profiles, bookings, notifications, admin) follows a more conventional service-oriented structure, but is still built with clear service boundaries so it can scale horizontally as cohort density and user count grow from a single-campus pilot toward a multi-city platform.

---

## High-Level Architecture

```mermaid
flowchart TB
    subgraph Clients
        WEB[Web App - React.js]
        MOBILE[Mobile App - Future Native / Responsive Web]
    end

    subgraph Edge
        LB[Load Balancer / API Gateway]
    end

    subgraph CoreServices[Core Application Services]
        AUTH[Auth Service]
        PROFILE[Profile and Verification Service]
        RIDE[Ride Management Service]
        MATCH[Matching Engine Service]
        BOOKING[Booking Service]
        COST[Cost Calculation Service]
        RATING[Rating and Review Service]
        ADMIN[Admin and Moderation Service]
    end

    subgraph SafetyPath[Safety-Critical Path - Isolated]
        SAFETY[Safety and SOS Service]
        ALERTDISPATCH[Emergency Alert Dispatcher]
    end

    subgraph RealTime[Real-Time Layer]
        SOCKET[Socket.IO Real-Time Gateway]
        NOTIF[Notification Service]
    end

    subgraph DataLayer[Data Layer]
        MYSQL[(MySQL - Primary Relational DB)]
        CACHE[(Redis Cache - Search and Session)]
        GEOIDX[(Spatial Index Store)]
    end

    subgraph External[External Services]
        MAPS[Google Maps API]
        SMS[SMS / OTP Gateway]
        PUSH[Push Notification Provider]
    end

    WEB --> LB
    MOBILE --> LB
    LB --> AUTH
    LB --> PROFILE
    LB --> RIDE
    LB --> MATCH
    LB --> BOOKING
    LB --> RATING
    LB --> ADMIN
    LB --> SAFETY

    AUTH --> MYSQL
    AUTH --> SMS
    PROFILE --> MYSQL
    RIDE --> MYSQL
    RIDE --> MAPS
    RIDE --> GEOIDX
    MATCH --> GEOIDX
    MATCH --> CACHE
    MATCH --> MYSQL
    BOOKING --> MYSQL
    BOOKING --> COST
    COST --> MYSQL
    RATING --> MYSQL
    ADMIN --> MYSQL

    SAFETY --> ALERTDISPATCH
    SAFETY --> MYSQL
    ALERTDISPATCH --> SMS
    ALERTDISPATCH --> PUSH
    ALERTDISPATCH --> SOCKET

    BOOKING --> NOTIF
    RIDE --> NOTIF
    RATING --> NOTIF
    NOTIF --> PUSH
    NOTIF --> SMS
    NOTIF --> SOCKET

    SOCKET --> WEB
    SOCKET --> MOBILE
```

---

## Component Breakdown

### Auth Service
Handles registration, OTP issuance/verification, JWT issuance and refresh, session/device management, and account recovery. Designed as the first point of contact for every client request requiring identity, and kept stateless (token-based) to support horizontal scaling.

### Profile and Verification Service
Manages profile CRUD, vehicle registration, and the verification workflow (mobile, email, institutional, government ID). Institutional domain checking and the admin manual-review queue for verification edge cases live here.

### Ride Management Service
Owns the lifecycle of a `Ride` entity: creation, editing, recurring-ride template generation, cancellation, and state transitions (Scheduled → Ongoing → Completed). Delegates route resolution to the Maps API and writes resolved route/stop data used by the Matching Engine.

### Matching Engine Service
The computational core of the platform. Given a passenger search query (pickup, drop, time window), it queries the spatial index for candidate rides, evaluates all three matching scenarios, computes route-overlap percentage and detour impact, and returns ranked results. This service is deliberately separated from Ride Management so it can be scaled, cached, and eventually swapped for a more sophisticated (e.g., ML-based) implementation without touching ride CRUD logic.

### Booking Service
Manages the request → accept/decline → confirm → complete lifecycle of a `Booking`, enforcing business rules (seat availability, no self-booking, no duplicate active bookings on the same ride) and orchestrating calls to the Cost Calculation Service.

### Cost Calculation Service
A narrowly-scoped, stateless calculation service: given a ride's total distance/cost and a passenger's pickup/drop points, it returns the passenger's distance-proportional cost share. Kept separate so its logic (currently simple, potentially evolving toward "Dynamic Cost Optimization" per the roadmap) can change independently of booking workflow logic.

### Rating and Review Service
Handles post-completion rating/review submission, aggregate rating computation, and moderation flagging for low ratings or flagged review text.

### Admin and Moderation Service
Backs the admin dashboard: report queue management, user suspension/ban actions, verification edge-case resolution, and platform safety metrics aggregation. Has elevated, audited access to otherwise-restricted data (e.g., full report detail, government ID verification records).

### Safety and SOS Service (Isolated)
Deliberately isolated from the rest of Core Services. Owns SOS trigger handling, live-location-sharing session management during active rides, and urgent in-ride reporting. Designed with the narrowest possible dependency surface so that a failure or slowdown elsewhere in the system (e.g., the Matching Engine under heavy load) cannot degrade SOS responsiveness.

### Emergency Alert Dispatcher
A dedicated, high-priority fan-out component triggered by the Safety Service: simultaneously notifies emergency contacts (SMS + push), alerts the admin/safety monitoring team, and pushes a real-time update via the Socket.IO gateway — all in parallel, not sequentially, to minimize time-to-alert.

### Notification Service
Handles all non-emergency notification dispatch (ride reminders, booking status changes, rating prompts), with delivery via push notification provider and SMS fallback for critical-but-non-emergency events.

### Socket.IO Real-Time Gateway
Provides real-time, bidirectional updates to clients: live ride status changes, live location updates during an active ride, and instant SOS-related UI state changes — without requiring clients to poll.

---

## Service Responsibilities Summary Table

| Service | Primary Responsibility | Scales Independently Because |
|---|---|---|
| Auth | Identity and session management | High request volume (every authenticated call), stateless by design |
| Profile/Verification | User and vehicle data, trust badges | Lower frequency, higher data sensitivity — different access control needs |
| Ride Management | Ride CRUD and lifecycle | Write-moderate, read-heavy via search |
| Matching Engine | Route-overlap computation | Most compute-intensive operation in the system; needs caching and spatial indexing tuned independently |
| Booking | Booking lifecycle and business rules | Transactional integrity critical; needs strong consistency guarantees |
| Cost Calculation | Distance-proportional cost-share math | Stateless, narrowly scoped, easiest to evolve/replace independently |
| Rating/Review | Post-ride feedback | Asynchronous, can tolerate slight processing delay unlike booking/safety paths |
| Admin/Moderation | Internal operations tooling | Low request volume, elevated access control, different deployment/security posture |
| Safety/SOS | Emergency response | Highest reliability and lowest latency requirement in the entire system — isolated for failure-domain separation |
| Notification | Non-emergency alerts | High volume, can tolerate retry/eventual delivery unlike safety alerts |

---

## User Journey Mapping (Cross-Service View)

```mermaid
flowchart LR
    A[User Opens App] --> B[Auth Service: Validate Session]
    B --> C[Profile Service: Load Profile + Verification State]
    C --> D{User Intent}
    D -- Search --> E[Matching Engine: Compute Results]
    D -- Publish Ride --> F[Ride Management: Create Ride]
    F --> G[Maps API: Resolve Route]
    G --> H[Ride Management: Store Route + Stops]
    E --> I[Booking Service: Request to Join]
    I --> J[Cost Calculation: Compute Share]
    J --> K[Booking Service: Confirm Booking]
    K --> L[Notification Service: Notify Both Parties]
    K --> M[Ride Begins]
    M --> N[Safety Service: Activate SOS + Live Share]
    M --> O[Ride Completes]
    O --> P[Rating Service: Collect Feedback]
    P --> Q[Profile Service: Update Aggregate Rating]
```

---

## Authentication Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    participant U as User (Client)
    participant GW as API Gateway
    participant AUTH as Auth Service
    participant SMS as SMS/OTP Gateway
    participant DB as MySQL

    U->>GW: POST /auth/register (mobile, email)
    GW->>AUTH: Forward request
    AUTH->>DB: Check if mobile/email already exists
    DB-->>AUTH: Not found - proceed
    AUTH->>SMS: Request OTP dispatch
    SMS-->>U: SMS with 6-digit OTP
    AUTH-->>U: 202 Accepted, awaiting OTP
    U->>GW: POST /auth/verify-otp (otp)
    GW->>AUTH: Forward request
    AUTH->>DB: Validate OTP, create user record
    DB-->>AUTH: User created
    AUTH->>AUTH: Issue JWT + Refresh Token
    AUTH-->>U: 200 OK with tokens
```

---

## Ride Matching Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    participant P as Passenger (Client)
    participant GW as API Gateway
    participant MATCH as Matching Engine
    participant CACHE as Redis Cache
    participant GEO as Spatial Index
    participant DB as MySQL

    P->>GW: POST /search (pickup, drop, time)
    GW->>MATCH: Forward search query
    MATCH->>CACHE: Check cached results for similar recent query
    alt Cache Hit
        CACHE-->>MATCH: Return cached candidate set
    else Cache Miss
        MATCH->>GEO: Query candidate rides by proximity
        GEO-->>MATCH: Candidate ride IDs
        MATCH->>DB: Fetch full ride + stop details for candidates
        DB-->>MATCH: Ride and stop data
        MATCH->>MATCH: Evaluate Scenarios 1, 2, 3 + overlap %
        MATCH->>CACHE: Store computed results (short TTL)
    end
    MATCH->>MATCH: Rank by relevance (overlap %, time, rating)
    MATCH-->>P: Ranked results with match explanations
```

---

## Notification Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    participant B as Booking Service
    participant N as Notification Service
    participant PUSH as Push Provider
    participant SMS as SMS Gateway
    participant SOCK as Socket.IO Gateway
    participant Driver as Driver Client
    participant Passenger as Passenger Client

    B->>N: Event: Booking Confirmed (rideId, driverId, passengerId)
    N->>N: Determine notification priority and channels
    N->>PUSH: Dispatch push to Driver
    N->>PUSH: Dispatch push to Passenger
    N->>SOCK: Emit real-time event to both clients
    SOCK-->>Driver: Live UI update
    SOCK-->>Passenger: Live UI update
    alt Push delivery fails
        N->>SMS: Fallback SMS to affected user
    end
```

---

## Emergency Flow (Sequence Diagram) — Highest Priority Path

```mermaid
sequenceDiagram
    participant U as User (Client)
    participant SAFE as Safety Service
    participant DISP as Alert Dispatcher
    participant SMS as SMS Gateway
    participant PUSH as Push Provider
    participant SOCK as Socket.IO Gateway
    participant Admin as Admin Console
    participant DB as MySQL

    U->>SAFE: POST /sos/trigger (location, rideId)
    SAFE->>DB: Write EmergencyAlert record (status=active)
    SAFE->>DISP: Fan out alert (parallel dispatch)
    par Notify Emergency Contacts
        DISP->>SMS: SMS to all emergency contacts
        DISP->>PUSH: Push to contacts (if app users)
    and Notify Admin/Safety Team
        DISP->>SOCK: Real-time alert to Admin Console
        SOCK-->>Admin: Live incident appears in queue
    and Confirm to User
        DISP->>SOCK: Confirm alert sent
        SOCK-->>U: "Alert sent" confirmation screen
    end
    Admin->>SAFE: Admin reviews and updates status
    SAFE->>DB: Update EmergencyAlert status (resolved/false_alarm)
```

---

## Reporting Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    participant U as Reporting User
    participant RPT as Admin/Moderation Service
    participant DB as MySQL
    participant Admin as Admin Console
    participant N as Notification Service

    U->>RPT: POST /reports (category, detail, rideId, urgency)
    RPT->>DB: Insert Report record
    alt Urgent
        RPT->>Admin: Push to top of priority queue immediately
    else Standard
        RPT->>Admin: Add to standard queue
    end
    Admin->>RPT: Review and resolve (action + justification)
    RPT->>DB: Update Report status, write AuditLog entry
    RPT->>N: Notify reporter of resolution status
    N-->>U: Status update notification
```

---

## Analytics Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    participant B as Booking Service
    participant A as Analytics Aggregator
    participant DB as MySQL
    participant U as User Client

    B->>A: Event: Ride Completed (bookingId, distance, cost)
    A->>A: Calculate fuel saved, CO2 avoided (vs. solo-travel baseline)
    A->>DB: Update user's cumulative savings record
    U->>A: GET /dashboard/savings
    A->>DB: Fetch cumulative stats
    DB-->>A: Stats
    A-->>U: Updated savings dashboard data
```

---

## Component Diagram (Logical Grouping)

```mermaid
flowchart TB
    subgraph Presentation
        WEBAPP[Web Application]
        MOBILEAPP[Mobile Application]
        ADMINCONSOLE[Admin Console]
    end

    subgraph Application
        direction TB
        IdentityGroup[Identity Group: Auth, Profile, Verification]
        RideGroup[Ride Group: Ride Mgmt, Matching, Booking, Cost Calc]
        TrustGroup[Trust Group: Rating, Review, Reports]
        SafetyGroup[Safety Group: SOS, Alert Dispatcher]
        OpsGroup[Operations Group: Admin, Audit, Analytics]
        CommsGroup[Communications Group: Notification, Real-Time Gateway]
    end

    subgraph Infrastructure
        DB2[(Relational DB)]
        CacheLayer[(Cache)]
        SpatialLayer[(Spatial Index)]
        Queue[(Message Queue / Event Bus)]
    end

    subgraph ExternalProviders
        MapsAPI[Maps API]
        SMSProvider[SMS Provider]
        PushProvider[Push Provider]
    end

    WEBAPP --> Application
    MOBILEAPP --> Application
    ADMINCONSOLE --> OpsGroup

    IdentityGroup --> DB2
    RideGroup --> DB2
    RideGroup --> SpatialLayer
    RideGroup --> MapsAPI
    TrustGroup --> DB2
    SafetyGroup --> DB2
    SafetyGroup --> Queue
    OpsGroup --> DB2
    CommsGroup --> Queue
    CommsGroup --> SMSProvider
    CommsGroup --> PushProvider

    RideGroup --> CacheLayer
    Queue --> CommsGroup
    Queue --> SafetyGroup
```

---

## Data Flow Diagram — Ride Lifecycle

```mermaid
flowchart LR
    A[Driver Input: Route, Time, Seats] --> B[Ride Management Service]
    B --> C[Maps API: Resolve Polyline + Stops]
    C --> D[(RideRoutes + RideStops Tables)]
    B --> E[(Rides Table)]
    E --> F[Matching Engine Reads Active Rides]
    G[Passenger Search Input] --> F
    F --> H[Ranked Match Results]
    H --> I[Passenger Selects + Requests]
    I --> J[Booking Service]
    J --> K[(Bookings Table)]
    J --> L[Cost Calculation Service]
    L --> M[(Payments Table - calculated, unsettled)]
    K --> N[Notification Service]
    N --> O[Driver + Passenger Notified]
    K --> P[Ride Proceeds: Scheduled to Ongoing to Completed]
    P --> Q[Rating + Review Service]
    Q --> R[(Ratings + Reviews Tables)]
    P --> S[Analytics Aggregator]
    S --> T[(User Savings Dashboard Data)]
```

---

## Event Flow Diagram — Event-Driven Backbone

For cross-service communication that doesn't need synchronous request/response (notifications, analytics updates, audit logging), the architecture uses an event bus pattern so that, for example, the Safety Service never has to wait on the Notification Service to complete its own critical path.

```mermaid
flowchart TB
    subgraph Producers
        BOOKINGEV[Booking Service]
        RIDEEV[Ride Management Service]
        RATINGEV[Rating Service]
        SAFETYEV[Safety Service]
    end

    BUS{{Event Bus / Message Queue}}

    subgraph Consumers
        NOTIFCONSUME[Notification Service]
        ANALYTICSCONSUME[Analytics Aggregator]
        AUDITCONSUME[Audit Log Writer]
        DISPATCHCONSUME[Alert Dispatcher]
    end

    BOOKINGEV -- BookingConfirmed, BookingCancelled --> BUS
    RIDEEV -- RideCreated, RideCompleted, RideCancelled --> BUS
    RATINGEV -- RatingSubmitted --> BUS
    SAFETYEV -- SOSTriggered --> BUS

    BUS --> NOTIFCONSUME
    BUS --> ANALYTICSCONSUME
    BUS --> AUDITCONSUME
    BUS --> DISPATCHCONSUME
```

**Note:** `SOSTriggered` events are published to the bus for downstream consumers like Audit and Analytics, but the actual emergency dispatch (SMS/push to emergency contacts) happens via the Safety Service's direct, synchronous call path to the Alert Dispatcher — not via the asynchronous bus — to guarantee the lowest possible latency for the single most safety-critical action in the system. The event bus publication is for record-keeping and secondary consumers only.

---

## Scalability Considerations

- **Matching Engine** is the primary horizontal-scaling target: stateless, cacheable, and the most compute-intensive service. It can be scaled out independently behind the API Gateway as cohort density and search volume grow.
- **Database partitioning** by city or institution cluster is planned once the platform expands beyond a single-cohort pilot, since route-matching queries are naturally scoped to a geographic area and rarely need to span partitions.
- **Read replicas** for the relational database support the read-heavy nature of ride search without contending with write-heavy booking/safety transactions on the primary.
- **Caching layer (Redis)** absorbs repeated identical/near-identical search queries (e.g., many students searching the same campus-to-hostel route around the same time), reducing load on the spatial index and primary database during peak commute windows.

## Security Considerations

- All inter-service communication occurs over an internal network with TLS, even though all are part of the same trusted backend, to maintain defense-in-depth.
- The Safety/SOS Service and Admin/Moderation Service have stricter access control boundaries than other services, given the sensitivity of the data they touch (live location, government ID, report details).
- JWT validation occurs at the API Gateway layer before requests reach individual services, reducing duplicated auth logic across services.
- Rate limiting is applied at the Gateway level, with stricter limits on Auth Service endpoints (OTP requests, login attempts) to prevent abuse.

## Reliability Considerations

- The Safety/SOS path is architected with the fewest possible dependencies and the most aggressive failure-handling (e.g., last-known-location fallback on connectivity loss) since it cannot tolerate the same degree of eventual-consistency or retry-later behavior acceptable elsewhere in the system.
- Non-critical services (Notification, Analytics) are designed to degrade gracefully — a delay or temporary failure in these does not block the core ride/booking transaction path.
- Database writes for safety-critical tables (`EmergencyAlerts`, `Reports`, `AuditLogs`) use synchronous, confirmed writes rather than relying solely on eventual-consistency patterns used elsewhere.

## Performance Considerations

- Spatial indexing on route and stop data is treated as a first-class architectural requirement (not an optimization to add later), since linear-scan matching against all active rides would not meet the sub-2-second search latency target as ride volume grows.
- Search result caching uses a short TTL appropriate to how frequently ride availability changes, balancing freshness against load reduction.

## Maintainability Considerations

- Clear service boundaries (Matching Engine separate from Ride Management; Cost Calculation separate from Booking) are maintained specifically so that algorithmic components likely to evolve — particularly matching logic moving toward the roadmap's "AI Route Matching" and cost logic moving toward "Dynamic Cost Optimization" — can be replaced or upgraded without requiring changes to the surrounding transactional services.

## Future Expansion Considerations

- The event-bus backbone is designed to support additional future consumers (e.g., an institutional analytics dashboard consumer, a future ML training-data pipeline consumer) without requiring changes to the producer services.
- The architecture's service boundaries map cleanly onto a future native mobile app, since all client-facing functionality is already exposed via the same API Gateway used by the web application — no web-specific business logic is embedded outside the gateway/service layer.
