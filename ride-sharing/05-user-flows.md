# User Flows
## Smart Community Ride Sharing Platform

---

## Driver Journey (End-to-End)

The driver journey covers registration through repeated, habitual ride publishing.

```mermaid
flowchart TD
    A[Register Account] --> B[Verify Mobile + Email]
    B --> C[Complete Profile]
    C --> D[Add Emergency Contact]
    D --> E[Add Vehicle]
    E --> F[Create Ride: Route, Date, Time, Seats]
    F --> G{Passenger Requests Received?}
    G -- No requests yet --> H[Ride Stays Published / Visible in Search]
    H --> G
    G -- Yes --> I[Review Passenger Profile]
    I --> J{Accept Request?}
    J -- Decline --> G
    J -- Accept --> K[Booking Confirmed, Contact Shared]
    K --> L{More Seats Available?}
    L -- Yes --> G
    L -- No --> M[Ride Fully Booked]
    M --> N[Start Ride]
    N --> O[Ride Ongoing - Safety Tools Active]
    O --> P[Complete Ride]
    P --> Q[Confirm Completion Mutually]
    Q --> R[Rate Passenger]
    R --> S[View Updated Savings Dashboard]
    S --> T{Publish Another Ride?}
    T -- Yes --> F
    T -- No --> U[End Session]
```

---

## Passenger Journey (End-to-End)

```mermaid
flowchart TD
    A[Register Account] --> B[Verify Mobile + Email]
    B --> C[Complete Profile]
    C --> D[Add Emergency Contact]
    D --> E[Search: Pickup, Drop, Time]
    E --> F{Matches Found?}
    F -- No --> G[Broaden Search / Opt-in to Notify Me]
    G --> E
    F -- Yes --> H[View Ride Options with Cost + Rating]
    H --> I[Select a Ride]
    I --> J[Send Join Request with Pickup/Drop Points]
    J --> K{Driver Responds?}
    K -- Declines --> H
    K -- No Response in Window --> L[Request Expires]
    L --> H
    K -- Accepts --> M[Booking Confirmed]
    M --> N[View Confirmed Details: Driver, Vehicle, Cost, Pickup Time]
    N --> O[Ride Day: Wait for Pickup]
    O --> P[Ride Ongoing - Safety Tools Active]
    P --> Q[Ride Completed]
    Q --> R[Confirm Completion]
    R --> S[Pay Cost Share Off-Platform]
    S --> T[Rate Driver]
    T --> U[View Updated Savings Dashboard]
```

---

## First-Time User Journey

First-time users need extra guidance and trust-building before their first transaction.

```mermaid
flowchart TD
    A[Land on App/Website] --> B[View Value Proposition: Not a Taxi App]
    B --> C[Choose: Register]
    C --> D[Mobile + Email Verification]
    D --> E[Guided Profile Setup]
    E --> F[Mandatory: Add Emergency Contact]
    F --> G{Institutional Email Available?}
    G -- Yes --> H[Verify Institution for Trust Badge]
    G -- No --> I[Skip - Can Verify Later]
    H --> J[Choose Role: Find a Ride or Offer a Ride]
    I --> J
    J -- Find a Ride --> K[Guided First Search]
    J -- Offer a Ride --> L[Add Vehicle, Guided Ride Creation]
    K --> M[First Booking Experience]
    L --> M
    M --> N[Post-Ride: First Rating Prompt with Extra Context/Tips]
```

---

## Returning User Journey

```mermaid
flowchart TD
    A[Open App] --> B{Session Valid?}
    B -- Yes --> C[Home Screen: Saved Routes + Recent Activity]
    B -- No --> D[Quick Login via OTP]
    D --> C
    C --> E{User Intent}
    E -- Repeat Same Route --> F[One-Tap Search via Saved Route]
    E -- New Route --> G[Manual Search]
    E -- Check Existing Booking --> H[View Active/Upcoming Ride]
    F --> I[Proceed to Booking Flow]
    G --> I
    H --> J[Ride Details / Safety Tools if Active]
```

---

## Ride Creation Flow

```mermaid
flowchart TD
    A[Tap Create Ride] --> B{Vehicle Added?}
    B -- No --> C[Add Vehicle First]
    C --> D[Enter Source and Destination]
    B -- Yes --> D
    D --> E[System Suggests Route via Maps API]
    E --> F{Route Acceptable?}
    F -- No --> G[Manually Adjust Waypoints]
    G --> H[Set Date, Time, Seats]
    F -- Yes --> H
    H --> I[Optional: Set Preferences - Gender, No Smoking, etc.]
    I --> J[System Calculates Estimated Cost]
    J --> K[Review Summary]
    K --> L{Recurring Ride?}
    L -- Yes --> M[Set Recurrence Pattern]
    L -- No --> N[Publish Ride]
    M --> N
    N --> O[Ride Visible in Passenger Search]
```

---

## Ride Search Flow

```mermaid
flowchart TD
    A[Open Search] --> B[Enter Pickup Location]
    B --> C[Enter Drop Location]
    C --> D[Enter Preferred Time Window]
    D --> E[Submit Search]
    E --> F[Matching Engine Runs All 3 Scenarios]
    F --> G{Results Above Relevance Threshold?}
    G -- Yes --> H[Display Ranked Results]
    G -- No --> I[Show Empty State + Notify-Me Option]
    H --> J[Apply Optional Filters]
    J --> K[Select a Ride to View Details]
```

---

## Ride Match Flow (Core Matching Logic)

This flow shows the decision logic the matching engine applies for each candidate driver ride against a passenger search query.

```mermaid
flowchart TD
    A[Passenger Search: Pickup P1, Drop P2, Time T] --> B[Fetch Active Rides in Time Window]
    B --> C{For Each Driver Ride}
    C --> D{Driver Source == P1 AND Driver Dest == P2?}
    D -- Yes --> E[Scenario 1: Exact Match - Highest Relevance]
    D -- No --> F{Does Driver Route Contain P2 Before Driver's Final Dest?}
    F -- Yes --> G{Driver Source == P1?}
    G -- Yes --> H[Scenario 2: Partial Match - Passenger Exits Early]
    G -- No --> I{Does Driver Route Also Contain P1 Before P2?}
    I -- Yes --> J[Scenario 2+3 Combined: Mid-Route Pickup AND Early Exit]
    I -- No --> K[Not a Match - Discard]
    F -- No --> L{Does Driver Route Contain P1, with Driver Dest as Drop?}
    L -- Yes --> M[Scenario 3: Partial Match - Passenger Joins Mid-Route]
    L -- No --> K
    E --> N[Calculate Overlap %, Cost Share, Detour Impact]
    H --> N
    J --> N
    M --> N
    N --> O{Overlap % Above Minimum Threshold?}
    O -- Yes --> P[Include in Results, Ranked]
    O -- No --> K
```

---

## Ride Join Flow

```mermaid
flowchart TD
    A[Passenger Views Ride Details] --> B[Confirm Pickup and Drop Points on Route]
    B --> C[View Calculated Cost Share]
    C --> D[Tap Request to Join]
    D --> E[Request Sent to Driver]
    E --> F[Driver Notified]
    F --> G{Driver Action}
    G -- Accept --> H[Booking Confirmed]
    G -- Decline --> I[Passenger Notified - No Reason Shown]
    G -- No Action --> J{Time Window Expired?}
    J -- Yes --> K[Request Auto-Expires]
    J -- No --> F
    H --> L[Contact Details Shared Between Both Parties]
    L --> M[Both See Ride in Upcoming Bookings]
```

---

## Ride Completion Flow

```mermaid
flowchart TD
    A[Driver Reaches Final Destination] --> B[Driver Marks Ride Complete]
    B --> C[System Prompts Passenger to Confirm]
    C --> D{Passenger Confirms?}
    D -- Yes --> E[Ride Status: Completed]
    D -- No Response within Buffer Window --> F[Auto-Complete with Flag for Review]
    F --> E
    D -- Passenger Disputes --> G[Routed to Admin Review]
    E --> H[Trigger Rating Prompts for Both Parties]
    H --> I[Update Personal Analytics: Cost/Fuel/CO2 Saved]
    I --> J[Ride Moved to History]
```

---

## Rating Flow

```mermaid
flowchart TD
    A[Ride Marked Completed] --> B[Both Parties Prompted to Rate]
    B --> C{User Rates within Window?}
    C -- Yes --> D[Star Rating 1-5 + Optional Text Review]
    C -- No --> E[Single Reminder Notification Sent]
    E --> F{Rates after Reminder?}
    F -- Yes --> D
    F -- No --> G[No Rating Submitted - Platform Use Unaffected]
    D --> H{Rating Below Threshold?}
    H -- Yes --> I[Internal Flag for Admin Review]
    H -- No --> J[Rating Published to Aggregate Average]
    I --> J
```

---

## Safety Flow (General)

```mermaid
flowchart TD
    A[Ride Becomes Ongoing] --> B[Safety Tools Activated: SOS + Live Share Available]
    B --> C{User Action Needed?}
    C -- Trigger SOS --> D[See Emergency Flow]
    C -- Share Live Location --> E[Select Emergency Contact]
    E --> F[Live Location Streamed for Ride Duration]
    F --> G[Auto-Stops When Ride Marked Complete]
    C -- File Urgent Report --> H[See Reporting Flow]
    C -- No Action --> I[Ride Proceeds Normally to Completion]
```

---

## Emergency Flow (SOS)

```mermaid
flowchart TD
    A[User Taps SOS] --> B[Confirm Step: Are You Sure?]
    B -- Cancel within Grace Window --> C[SOS Cancelled, No Alert Sent]
    B -- Confirmed or Grace Window Expires --> D[Immediate Actions Triggered in Parallel]
    D --> E[Share Live Location with All Emergency Contacts]
    D --> F[Send SMS + Push Alert to Emergency Contacts]
    D --> G[Notify Platform Safety Monitoring Team]
    D --> H[Log Incident with Full Ride Context]
    G --> I[Admin Reviews in Real-Time]
    I --> J{Admin Determines Action}
    J -- Contact User Directly --> K[Admin Outreach via Call/Message]
    J -- Escalate to Local Authorities Guidance --> L[User Provided Guidance/Resources]
    E --> M[Emergency Contact Can View Live Location Until Manually Stopped or Ride Ends]
```

---

## Reporting Flow

```mermaid
flowchart TD
    A[User Initiates Report] --> B{Report Type}
    B -- Post-Ride Standard --> C[Select Category: Unsafe Driving / Misbehavior / Fake Account / Harassment / No-Show]
    B -- Urgent In-Ride --> D[Mark as Urgent - Highest Priority Queue]
    C --> E[Optional Free-Text Detail]
    D --> E
    E --> F[Submit Report]
    F --> G[Report Logged with Ride ID, Timestamp, Parties]
    G --> H{Linked to Active SOS?}
    H -- Yes --> I[Merge as Single Incident for Admin]
    H -- No --> J[Standalone Report Queue Entry]
    I --> K[Admin Reviews]
    J --> K
    K --> L{Admin Decision}
    L -- No Action Needed --> M[Mark Resolved, Notify Reporter]
    L -- Warning Issued --> N[Warn Reported User, Notify Reporter]
    L -- Suspension/Ban --> O[Suspend/Ban Account, Notify Reporter]
```

---

## Verification Flow

```mermaid
flowchart TD
    A[User Submits Verification Request] --> B{Verification Type}
    B -- Mobile --> C[OTP Sent and Confirmed]
    B -- Email --> D[Confirmation Link Sent and Clicked]
    B -- Institutional Email --> E{Domain Recognized?}
    E -- Yes --> F[Auto-Verify on Email Confirmation]
    E -- No --> G[Routed to Admin Manual Review]
    G --> H{Admin Decision}
    H -- Approve --> I[Badge Applied + Domain Added to Known List]
    H -- Reject --> J[User Notified with Reason]
    B -- Government ID Optional Tier --> K[Secure Upload to Restricted Storage]
    K --> L[Admin or Automated ID Check]
    L --> M{Valid?}
    M -- Yes --> N[Enhanced Verification Badge Applied]
    M -- No --> J
    C --> O[Verification Status Updated on Profile]
    D --> O
    F --> O
    I --> O
    N --> O
```

---

## Account Recovery Flow

```mermaid
flowchart TD
    A[User Cannot Log In] --> B{Has Access To?}
    B -- Verified Email Only --> C[Initiate Recovery via Email]
    C --> D[Identity Confirmation Step]
    D --> E[Set/Reset Mobile Number]
    E --> F[Account Access Restored]
    B -- Neither Mobile nor Email --> G[Escalate to Admin-Assisted Recovery]
    G --> H[Manual Identity Verification by Admin]
    H --> I{Verified?}
    I -- Yes --> F
    I -- No --> J[Recovery Denied, Guidance Provided]
    B -- Mobile Only, Lost Email Access --> K[Recovery via Mobile OTP]
    K --> L[Prompt to Update Email]
    L --> F
```

---

## State Transition Summary (Ride Lifecycle)

This is the authoritative state machine referenced by the PRD's data integrity requirements.

```mermaid
stateDiagram-v2
    [*] --> Scheduled: Driver publishes ride
    Scheduled --> Scheduled: Passenger requests/joins (seats available)
    Scheduled --> Cancelled: Driver cancels OR all passengers cancel
    Scheduled --> Ongoing: Driver marks "Started"
    Ongoing --> Completed: Mutual completion confirmation
    Ongoing --> NoShow: Driver reports passenger no-show
    Ongoing --> Cancelled: Emergency cancellation mid-flow (rare, e.g. safety incident)
    Completed --> [*]
    Cancelled --> [*]
    NoShow --> [*]
```

---

## Alternative and Failure Path Notes

| Flow | Alternative Path | Failure Path |
|---|---|---|
| Ride Search | Broaden time window if no exact matches | Maps/geocoding API failure → cached location fallback |
| Ride Join | Passenger browses other matches if declined | Request expires if driver doesn't respond in time |
| Ride Completion | Passenger doesn't respond → auto-complete after buffer | Passenger disputes → routed to admin review |
| SOS | User cancels within grace window | Network failure → last-known location sent, retried on reconnect |
| Verification | Domain not recognized → manual admin review | ID check fails → user notified with reason, can resubmit |
| Account Recovery | Mobile-only recovery via OTP | No access to either channel → admin-assisted manual recovery |
