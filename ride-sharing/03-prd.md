# Product Requirements Document (PRD)
## Smart Community Ride Sharing Platform

---

## Executive Overview

The Smart Community Ride Sharing Platform is a route-overlap-based, peer-to-peer ride-sharing system available as both a web application and a mobile application. It enables drivers already making a trip to share their spare seats with passengers traveling along the same or an overlapping route, splitting the trip's cost fairly. It is explicitly **not** a taxi-dispatch or for-hire transportation service — drivers are not professional operators, and no new vehicle trips are created by the platform.

The product targets students, employees, and daily commuters who travel fixed or semi-fixed routes regularly, with an initial focus on college campuses and IT park clusters where route density and institutional trust anchors (verified college/company affiliation) make adoption and safety easiest to bootstrap.

This document defines what the product must do (functional requirements), how well it must do it (non-functional requirements), and the boundaries of what is and is not included in the initial release.

---

## Product Description

The platform connects two roles — **Driver** and **Passenger** — through a route-matching engine that supports three matching scenarios:

1. **Exact Match** — driver and passenger share the same start and end point.
2. **Partial Match (Passenger Exits Early)** — passenger's destination lies along the driver's route, before the driver's final destination.
3. **Partial Match (Passenger Joins Mid-Route)** — passenger's starting point lies along the driver's route, after the driver's own starting point.

Once matched, the platform calculates a fair per-passenger cost share based on trip distance, handles booking confirmation, provides in-ride safety tooling, and facilitates post-ride rating and review. A persistent identity, vehicle, and trust profile is built for every user over time, and all ride activity is logged for accountability.

---

## Product Scope

### In-Scope Features (Initial Release)

- User registration and authentication (mobile + email verification, JWT-based sessions)
- Driver and Passenger role support (a single user account can act as both, at different times)
- Vehicle registration and management (two-wheeler and car support)
- Ride creation with route, date, time, and available seats
- Route-overlap-based ride search and matching (all three scenarios)
- Ride request, acceptance/rejection, and booking confirmation
- Automatic cost-share calculation based on distance
- Ride lifecycle management (scheduled → ongoing → completed → cancelled)
- Ratings and reviews (bidirectional: driver rates passenger, passenger rates driver)
- Ride history and personal cost/fuel-saved analytics
- Safety Center: SOS button, live location sharing during an active ride, emergency contact alerts
- User reporting (unsafe driving, misbehavior, fake accounts, harassment, no-shows)
- Notifications (ride requests, confirmations, reminders, safety alerts)
- Basic admin dashboard for moderation, report review, and platform health monitoring
- Institutional affiliation verification (college email / company email domain verification) as a trust signal

### Out-of-Scope Features (Initial Release)

- In-app payment processing / digital wallet (cost-sharing is calculated and displayed; settlement is initially via UPI/cash outside the app, with in-app payment as a clearly identified future phase)
- Real-time turn-by-turn navigation (the platform shows route and stops, not driving directions — assumes use of existing navigation apps during the ride)
- Multi-stop ride pooling with more than one passenger pickup/drop optimization (initial release supports single passenger matching per ride request; multi-passenger pooling optimization is future scope)
- AI-based demand prediction and route suggestion (explicitly future scope)
- Native iOS/Android applications in the very first release (initial release is a responsive web application; native apps are a defined near-term follow-on, not a parallel initial deliverable)
- Cross-city or intercity ride matching (initial scope is intra-city/intra-cohort commuting)
- Corporate/institutional admin dashboards with deep analytics (a lightweight institutional view may exist, but full self-serve institutional dashboards are future scope)

---

## User Types

| User Type | Description |
|---|---|
| **Guest** | Unauthenticated visitor; can view marketing/informational content only |
| **Registered User** | Verified account holder; can act as Driver, Passenger, or both |
| **Driver (role, not account type)** | A Registered User who has added a vehicle and published at least one ride |
| **Passenger (role, not account type)** | A Registered User searching for and joining rides |
| **Platform Admin** | Internal staff managing moderation, reports, verification escalations, and platform health |

---

## User Roles

### Driver
- Creates and publishes rides (source, destination, route, date/time, seats).
- Reviews and accepts/declines passenger requests.
- Starts and completes rides.
- Rates passengers post-ride.
- Receives cost-share contributions from passengers.

### Passenger
- Searches for rides matching their route and timing.
- Requests to join a ride.
- Views driver profile, vehicle details, and ratings before confirming.
- Pays their calculated cost share.
- Rates drivers post-ride.

### Platform Admin
- Reviews reported users and rides.
- Manages verification escalations (e.g., manual ID review if automated checks fail).
- Monitors platform-wide safety metrics (SOS activations, report rates).
- Has authority to suspend or ban accounts that violate trust and safety policy.

---

## Functional Requirements

### FR-1: User Registration & Authentication
- FR-1.1: Users must register with a mobile number and email address.
- FR-1.2: Mobile number must be verified via OTP before the account is considered active.
- FR-1.3: Email must be verified via a confirmation link.
- FR-1.4: Users may optionally verify institutional affiliation (college/company email domain) to receive a "Verified Community Member" trust badge.
- FR-1.5: Authentication uses JWT-based sessions with refresh tokens; passwords (if used) must be hashed using a strong algorithm (bcrypt/argon2).
- FR-1.6: Account recovery is supported via OTP-based password reset.

### FR-2: User Profile
- FR-2.1: Profile includes name, profile photo, phone (masked by default, revealed only post-booking-confirmation), email, gender (optional, used for safety-preference matching), and institutional affiliation.
- FR-2.2: Profile displays aggregate rating and total completed ride count.
- FR-2.3: Profile displays verification badges (mobile verified, email verified, institution verified, government ID verified [optional enhanced tier]).
- FR-2.4: Users can edit their profile at any time except verified fields, which require re-verification if changed.

### FR-3: Vehicle Management
- FR-3.1: Drivers must add at least one vehicle (type: two-wheeler or car) before publishing a ride.
- FR-3.2: Vehicle details include type, make/model, registration number, and color.
- FR-3.3: Vehicle registration number is validated for format but not run against external RTO databases in the initial release (future enhancement).
- FR-3.4: A user can register multiple vehicles and select the active vehicle per ride.

### FR-4: Ride Creation
- FR-4.1: Driver specifies source, destination, intermediate route (auto-derived from maps API where possible, editable manually), date, time, and available seat count.
- FR-4.2: System estimates trip distance and base cost using the Maps API and a configurable per-km cost rate.
- FR-4.3: Driver can mark a ride as recurring (e.g., same time, same route, weekdays) to avoid re-creating it daily — generates individual ride instances under the hood.
- FR-4.4: Driver can set ride-specific preferences (e.g., gender preference for safety/comfort, no-smoking, luggage allowance).
- FR-4.5: Driver can edit or cancel a published ride before it has confirmed passengers; cancelling a ride with confirmed passengers requires explicit confirmation and triggers notifications to affected passengers.

### FR-5: Ride Search & Matching
- FR-5.1: Passenger searches by entering pickup location, drop location, and desired travel time window.
- FR-5.2: System returns rides matching all three scenarios:
  - Exact match (same source and destination).
  - Driver-route-contains-passenger-destination (Scenario 2).
  - Passenger-pickup-along-driver-route (Scenario 3).
- FR-5.3: Search results are ranked by relevance: route overlap percentage, time proximity, driver rating, and verification status.
- FR-5.4: Results display estimated cost share, driver rating, vehicle type, and available seats before the passenger requests to join.
- FR-5.5: System supports a minimum route-overlap threshold (configurable) below which a ride is not shown as a match, to avoid irrelevant results.

### FR-6: Ride Request & Booking
- FR-6.1: Passenger sends a join request for a specific ride, specifying their pickup and drop point along the driver's route.
- FR-6.2: Driver receives the request with passenger profile, rating, and verification status, and can accept or decline.
- FR-6.3: Upon acceptance, both parties' contact details (masked phone via relay, or revealed depending on configuration) become available, and the booking status moves to "Confirmed."
- FR-6.4: System auto-expires unanswered requests after a configurable window (e.g., based on time until ride departure) to avoid passengers being left waiting indefinitely.
- FR-6.5: Either party may cancel a confirmed booking before ride start; repeated late cancellations affect a user's reliability score.

### FR-7: Cost Sharing
- FR-7.1: System calculates total estimated trip cost using distance and a configurable per-km rate (covering fuel cost approximation; not a profit-generating fare).
- FR-7.2: Cost is split among confirmed passengers proportionally to the distance each passenger travels along the route (not a flat equal split when passengers join/exit at different points).
- FR-7.3: System displays a clear, itemized cost breakdown to both driver and passenger before booking confirmation.
- FR-7.4: Initial release displays the calculated amount for off-platform settlement (UPI/cash); in-app payment processing is out of scope for this phase but the data model supports it for future integration.

### FR-8: Ride Lifecycle Management
- FR-8.1: Ride states: `Scheduled → Ongoing → Completed`, with `Cancelled` and `No-Show` as terminal alternate states.
- FR-8.2: Driver marks ride as "Started" when departing and "Completed" upon reaching the final destination.
- FR-8.3: System prompts both driver and confirmed passengers to confirm ride completion (mutual confirmation reduces fraudulent rating/dispute risk).
- FR-8.4: A ride not marked complete or cancelled within a reasonable buffer after scheduled time is auto-flagged for review.

### FR-9: Ride History & Analytics
- FR-9.1: Users can view their full ride history (as driver and as passenger) with date, route, co-traveler, cost, and rating given/received.
- FR-9.2: Users can view personal cumulative statistics: total rides, total cost saved (vs. estimated solo-travel cost), total fuel saved, total CO₂ avoided.
- FR-9.3: Statistics are recalculated and updated immediately upon ride completion.

### FR-10: Ratings & Reviews
- FR-10.1: After ride completion, both driver and passenger are prompted to rate each other (1–5 stars) and optionally leave a text review.
- FR-10.2: Ratings are only visible publicly as an aggregate average; individual review text is visible on the rated user's profile but the rater's identity is not hidden (to discourage bad-faith anonymous reviews).
- FR-10.3: A user who does not rate within a set window after ride completion is reminded once via notification; failure to rate does not block further platform use.
- FR-10.4: Ratings below a configurable threshold trigger an internal flag for admin review, not automatic suspension.

### FR-11: Safety Features

#### SOS Button
- FR-11.1: An SOS control is accessible from any active-ride screen at all times, requiring no more than one tap to trigger (with a brief confirm-to-avoid-accidental-trigger step).
- FR-11.2: Triggering SOS immediately shares live location with the user's pre-configured emergency contacts and logs the event with the platform.
- FR-11.3: SOS triggers an internal alert to the admin/safety monitoring system for review.

#### Live Location Sharing
- FR-11.4: During an active ride, passengers (and optionally drivers) can opt to share live location with a chosen emergency contact for the ride's duration, independent of whether SOS is triggered.

#### User Reporting
- FR-11.5: Users can report another user post-ride (or, in urgent cases, during a ride) for categories including unsafe driving, misbehavior, harassment, fake account/profile, and no-show.
- FR-11.6: Reports require a category selection and optional free-text detail, and are routed to the admin moderation queue.
- FR-11.7: A user accumulating multiple credible reports is automatically flagged for review and may be temporarily restricted pending investigation.

#### Ride Logs
- FR-11.8: Every ride retains an immutable log of driver, passenger(s), route, scheduled and actual times, and status changes, retained for a defined retention period to support safety investigations and dispute resolution.

### FR-12: Notifications
- FR-12.1: System sends notifications for: new ride request received, request accepted/declined, ride reminder (configurable lead time before departure), ride started, ride completed, rating reminder, report status update, and safety alerts.
- FR-12.2: Notifications are delivered via in-app push and, for critical safety-related events, SMS as a fallback channel.

### FR-13: Admin Operations
- FR-13.1: Admins can view and act on the report queue, with full context (ride log, user history, prior reports).
- FR-13.2: Admins can suspend, warn, or ban a user account, with the action and reason logged.
- FR-13.3: Admins can view platform-wide safety and health dashboards (SOS activation count, average response time, report rate trend, verification completion rate).
- FR-13.4: Admins can manually approve or reject institutional verification edge cases that automated domain-matching cannot resolve.

---

## Non-Functional Requirements

### NFR-1: Performance
- Ride search results must return within 2 seconds under normal load for a cohort-scale dataset.
- Route-overlap matching computation must be optimized (e.g., via spatial indexing) to avoid linear scans against all active rides as ride volume grows.

### NFR-2: Scalability
- System architecture must support horizontal scaling of the matching and search services independently from the core transactional services (bookings, profiles), since matching is the most compute-intensive operation.
- Database schema must support partitioning/sharding by city or institution cluster as the user base grows beyond a single-cohort pilot.

### NFR-3: Security
- All traffic must be served over HTTPS/TLS.
- Sensitive personal data (phone numbers, government ID if collected, exact live location during SOS) must be encrypted at rest.
- Phone numbers are masked in the UI by default; full numbers are revealed only between two parties with a confirmed mutual booking, via the platform's relay where feasible.
- Rate limiting and abuse detection must be applied to authentication endpoints (OTP requests, login attempts) to prevent brute-force and OTP-spam abuse.

### NFR-4: Reliability
- Core booking and matching services must target high availability (no single point of failure for ride search/booking during peak commute windows).
- SOS and safety-alert pathways must have the highest reliability priority in the system — these must not share failure domains with non-critical features like analytics or notifications-for-marketing.

### NFR-5: Accessibility
- Web and mobile interfaces must meet WCAG 2.1 AA contrast and navigability standards at minimum, given the platform's safety-critical nature — users must be able to find and trigger SOS even under stress or with assistive technology.
- Critical actions (SOS, report, cancel ride) must be operable via keyboard navigation on web and via screen-reader-compatible components on mobile.

### NFR-6: Maintainability
- Matching logic, cost-calculation logic, and trust/verification logic must be implemented as clearly separated services/modules, since these are the components most likely to evolve independently (e.g., swapping in an AI-based matching model later without rewriting booking logic).

### NFR-7: Data Integrity
- Ride state transitions must be enforced server-side via a defined state machine (see User Flows document) to prevent invalid states (e.g., a ride marked "Completed" without ever being "Ongoing").

---

## Business Rules

1. A user cannot book their own published ride.
2. A passenger cannot hold more than one *pending* request for overlapping time windows (prevents seat-blocking across multiple rides simultaneously).
3. A driver cannot accept more passenger requests than their declared available seat count.
4. Cost-share calculation is always proportional to distance traveled by each passenger, never a flat split when pickup/drop points differ.
5. A booking is not considered confirmed — and contact details are not exchanged — until the driver explicitly accepts the request.
6. Cancellations within a short threshold of departure time (configurable) are logged as "late cancellations" and factored into a user's reliability score, distinct from their star rating.
7. Institutional verification badges expire and require re-verification periodically (e.g., annually) to remain accurate as students graduate or employees change jobs.
8. Reported users remain fully able to use the platform during investigation unless the report is flagged as urgent/safety-critical, in which case a temporary restriction may apply pending review.

---

## Safety Requirements

- Every active ride must expose SOS and reporting controls with no more than one navigation step from the main ride screen.
- Emergency contacts must be configurable by the user before they can publish or join their first ride (a minimum of one emergency contact is mandatory).
- All safety-related events (SOS, reports, flagged rides) must be retained in logs separately from standard analytics data, with stricter access control (admin/safety team only).
- The platform must never display a user's exact home address as a saved location label visible to other users; only the resolved pickup/drop point on the map is shown.

---

## Trust Requirements

- Verification status (mobile, email, institutional, ID) must be visibly displayed on every profile shown during search and booking — trust signals must be visible *before* a decision is made, not after.
- Ratings must be tied to verified completed rides only; a rating cannot be submitted for a ride that was not mutually confirmed as completed.
- A user's reliability score (cancellations/no-shows) must be tracked separately from their star rating, since these measure different things (dependability vs. ride quality).

---

## Ride Matching Requirements

- The matching engine must support all three scenarios defined in the Project Context (exact match, partial match with early passenger exit, partial match with mid-route passenger pickup).
- Matching must compute a route-overlap percentage and only surface rides above a minimum relevance threshold.
- Matching must account for time-window compatibility (a route match with a 3-hour time mismatch is not a useful match).
- Matching results must be explainable to the user (e.g., "joins your route at Stop B, 2.3 km detour for driver") rather than a black-box score.

---

## Cost Sharing Requirements

- Cost calculation must be based on actual distance contribution per passenger, not divided equally regardless of trip length.
- The system must show the full calculation breakdown (total estimated cost, per-km rate used, each passenger's distance share) for transparency.
- Cost-share amounts must be locked in at booking confirmation time, not recalculated after the fact, to avoid disputes.

---

## Notification Requirements

- Critical safety notifications (SOS, urgent report status) must use the highest-priority delivery channel available (push + SMS fallback).
- Non-critical notifications (ride reminders, rating prompts) must be batchable/configurable by the user to avoid notification fatigue, which is a known driver of app abandonment.

---

## Reporting Requirements

- Report submission must be possible in three taps or fewer from any ride-related screen.
- Reports must capture: reporting user, reported user, ride ID (if applicable), category, free-text detail, and timestamp.
- Admins must be able to see a reported user's full history (past reports, ratings, ride count) in a single view to assess context quickly.

---

## Analytics Requirements

- Personal analytics (cost/fuel/CO₂ saved) must update immediately upon ride completion, not on a delayed batch cycle, to maximize the motivational feedback loop.
- Platform-wide aggregate analytics (for potential institutional dashboards) must be derived from anonymized, aggregated data — never expose individual user ride patterns to institutional partners.

---

## Accessibility Requirements

- All critical flows (registration, ride search, booking, SOS, reporting) must be fully usable via screen reader and keyboard-only navigation.
- Color must never be the sole indicator of state (e.g., ride status) — must be paired with text/icon labels for color-blind accessibility.
- Minimum tap target size of 44x44px on mobile for all interactive elements, especially safety-critical controls.

---

## Performance Requirements

- Search-to-results latency: under 2 seconds at cohort scale.
- Booking confirmation round-trip: under 1.5 seconds.
- SOS trigger-to-alert-dispatch latency: under 3 seconds, treated as the platform's single most latency-sensitive operation.

---

## Security Requirements

- All authentication tokens must be short-lived with secure refresh rotation.
- All PII must be encrypted at rest and in transit.
- Admin actions on user accounts (suspend/ban) must require a logged justification and be auditable.
- Government ID verification (if/when enabled) must use a dedicated, access-restricted storage path separate from general profile data.

---

## Success Metrics

(See `02-vision-goals.md` for the full KPI framework — summarized here as PRD acceptance criteria for the initial release.)

- Match success rate above a defined threshold within the pilot cohort.
- Verification completion rate above a defined threshold before first ride.
- SOS and reporting flows independently usability-tested and confirmed discoverable within one navigation step.
- Cost-share calculation validated against manual calculation for accuracy across all three matching scenarios.

---

## Product Risks

| Risk | Mitigation |
|---|---|
| Low initial driver supply makes passenger search results sparse, killing first impressions | Seed launch within a single dense cohort (one campus/IT park) and manually recruit anchor drivers before public passenger-facing launch |
| Safety incident damages trust irreparably, especially given parent/guardian influence on student adoption | Treat SOS, verification, and reporting as launch-blocking requirements, not post-launch additions |
| Cost-sharing disputes (driver feels underpaid, passenger feels overcharged) | Lock cost-share at booking time, display full calculation transparently, log all amounts for dispute resolution reference |
| Users revert to informal WhatsApp coordination once they've "met" via the platform, churning off-platform | Make recurring ride creation and repeat-match discovery so frictionless that staying on-platform is easier than manual re-coordination |
| Route-overlap matching produces low-quality/irrelevant matches, undermining trust in search results | Enforce a minimum overlap threshold and make match relevance explainable in the UI |

---

## Assumptions

- Initial pilot cohorts have sufficiently dense, overlapping commute patterns (a single campus or IT park) for the matching engine to produce meaningful results without needing platform-wide scale first.
- Users have access to smartphones with GPS and a functioning mobile data connection during their commute.
- Off-platform payment settlement (UPI/cash) is acceptable to users in the initial phase; in-app payment is not a launch blocker.
- Institutional email domains (college/company) are available and checkable for the verification badge feature.

---

## Constraints

- Initial release is a responsive web application; native mobile apps follow as a near-term but distinct phase.
- No owned vehicle fleet — the platform is purely a coordination and trust layer, which constrains it from guaranteeing ride availability the way a dispatch-based service can.
- Dependent on a third-party Maps API for route calculation and distance estimation, introducing an external service dependency and associated cost-at-scale consideration.
- Initial launch is geographically and institutionally bounded by design (single city, single/few cohorts) to ensure match density — this is a deliberate constraint, not an oversight.
