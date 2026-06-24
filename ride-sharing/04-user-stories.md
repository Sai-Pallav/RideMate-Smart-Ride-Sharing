# User Stories
## Smart Community Ride Sharing Platform

Priority key: **P0** = launch-blocking, **P1** = high priority post-launch-critical, **P2** = important but deferrable, **P3** = nice-to-have / future enhancement.

---

## Module 1: Authentication

### US-1.1 — Register with Mobile Number
**User Story:** As a new user, I want to register using my mobile number, so that I can create an account using an identifier I always have access to.
**Acceptance Criteria:**
- User enters a 10-digit mobile number.
- System sends a 6-digit OTP via SMS.
- Account is created only after correct OTP entry.
**Edge Cases:**
- User enters an already-registered number → system prompts login instead of registration.
- User requests multiple OTPs in quick succession → rate-limited after 3 requests within 10 minutes.
**Failure Scenarios:**
- SMS delivery fails/delays → user is shown a "resend OTP" option after 30 seconds with a fallback voice-call OTP option.
**Priority:** P0

### US-1.2 — Verify Email Address
**User Story:** As a registered user, I want to verify my email address, so that I have a secondary recovery channel and my profile is marked trustworthy.
**Acceptance Criteria:**
- Verification link sent to entered email, valid for 24 hours.
- Email marked "Verified" on successful click-through.
**Edge Cases:**
- User enters a typo'd email → user can edit and resend before expiry.
- Link clicked after expiry → user can request a new link.
**Failure Scenarios:**
- Email lands in spam → resend option clearly visible, with guidance to check spam folder.
**Priority:** P0

### US-1.3 — Login with Mobile + OTP
**User Story:** As a returning user, I want to log in using my mobile number and OTP, so that I don't need to remember a password.
**Acceptance Criteria:**
- Existing user enters mobile number, receives OTP, gains access on correct entry.
- Session token issued (JWT) valid per configured expiry, with refresh token for extended sessions.
**Edge Cases:**
- User enters wrong OTP 3 times → temporary lockout with cooldown period.
**Failure Scenarios:**
- User has lost access to registered number → directed to account recovery flow involving email + support escalation.
**Priority:** P0

### US-1.4 — Institutional Email Verification
**User Story:** As a student or employee, I want to verify my college or company email, so that I receive a "Verified Community Member" badge that builds trust with other users.
**Acceptance Criteria:**
- User enters institutional email; system checks domain against a known list of registered institutions.
- Verification link sent; badge applied upon confirmation.
**Edge Cases:**
- Institution domain not yet in system's known list → routed to manual admin review queue.
**Failure Scenarios:**
- User attempts to use a personal email disguised with institution-like naming → domain validation rejects non-matching domains.
**Priority:** P1

### US-1.5 — Account Recovery
**User Story:** As a user who has lost access to my registered mobile number, I want a recovery path via my verified email, so that I don't permanently lose my account, ride history, and ratings.
**Acceptance Criteria:**
- User initiates recovery via verified email.
- Identity confirmation step (security question or admin-assisted verification) before mobile number can be changed.
**Edge Cases:**
- User has neither working mobile nor email access → escalated to manual admin identity verification.
**Failure Scenarios:**
- Recovery request flagged as suspicious (rapid recovery attempts) → additional verification step triggered.
**Priority:** P1

### US-1.6 — Logout and Session Management
**User Story:** As a user, I want to log out of my account on a given device, so that my account stays secure on shared or borrowed devices.
**Acceptance Criteria:**
- Logout invalidates the current session token immediately.
- User can view and revoke active sessions from account settings.
**Edge Cases:**
- User logs out during an active ride → safety tooling (SOS) remains accessible via a re-authentication-light path given the safety-critical nature.
**Failure Scenarios:**
- Token revocation fails due to network issue → client-side session is cleared regardless, with server-side revocation retried.
**Priority:** P1

---

## Module 2: Profiles

### US-2.1 — Create and Edit Profile
**User Story:** As a registered user, I want to add my name, photo, and basic details, so that other users can recognize and trust me before sharing a ride.
**Acceptance Criteria:**
- Profile fields: name, photo, gender (optional), institutional affiliation, bio (optional).
- Changes save immediately and reflect in future ride listings.
**Edge Cases:**
- User uploads an inappropriate profile photo → automated content moderation flags for review before photo goes live.
**Failure Scenarios:**
- Photo upload fails due to file size → clear error message with size/format guidance.
**Priority:** P0

### US-2.2 — View Own Verification Status
**User Story:** As a user, I want to see which verification steps I've completed and which are pending, so that I understand how I appear to others and what I can do to build more trust.
**Acceptance Criteria:**
- Profile screen shows checklist: mobile verified, email verified, institution verified, ID verified (optional tier).
**Edge Cases:**
- A previously verified institutional badge expires (annual re-verification) → status changes to "Expired, re-verify" rather than silently disappearing.
**Failure Scenarios:** None safety-critical; display-only feature.
**Priority:** P1

### US-2.3 — View Another User's Public Profile
**User Story:** As a passenger, I want to view a driver's public profile before requesting to join their ride, so that I can make an informed safety and comfort decision.
**Acceptance Criteria:**
- Public profile shows name, photo, rating, completed ride count, verification badges, and vehicle details (if driver).
- Exact phone number and home address are never shown.
**Edge Cases:**
- User has no ride history yet (new account) → profile clearly shows "New Member" rather than a blank/broken rating display.
**Failure Scenarios:** N/A
**Priority:** P0

### US-2.4 — Add Emergency Contact
**User Story:** As a user, I want to add at least one emergency contact, so that someone can be alerted automatically if I trigger SOS during a ride.
**Acceptance Criteria:**
- At least one emergency contact (name + phone) is mandatory before a user can publish or join their first ride.
- User can add up to 3 emergency contacts.
**Edge Cases:**
- Emergency contact number is invalid/unreachable → system allows save but flags as "unverified contact," prompting periodic confirmation.
**Failure Scenarios:**
- All emergency contacts unreachable during an actual SOS event → system simultaneously escalates to platform safety monitoring as a backup channel.
**Priority:** P0

---

## Module 3: Ride Creation

### US-3.1 — Create a One-Time Ride
**User Story:** As a driver, I want to publish a ride with my route, date, time, and seat count, so that passengers traveling the same way can find and join me.
**Acceptance Criteria:**
- Driver enters source, destination, date, time, and available seats.
- System auto-suggests route via Maps API; driver can adjust if needed.
- Ride appears in passenger search results immediately after publishing.
**Edge Cases:**
- Driver has not yet added a vehicle → prompted to add vehicle before publishing completes.
- Driver sets seat count higher than their vehicle's realistic capacity → soft warning shown, not hard-blocked (vehicle capacity isn't strictly validated against a fixed database in initial release).
**Failure Scenarios:**
- Maps API fails to resolve route → driver can manually input route waypoints as a fallback.
**Priority:** P0

### US-3.2 — Create a Recurring Ride
**User Story:** As a driver who commutes the same route daily, I want to set up a recurring ride, so that I don't have to manually republish it every day.
**Acceptance Criteria:**
- Driver selects recurrence pattern (e.g., weekdays, custom days) and a date range.
- System generates individual ride instances under the recurring template, each independently bookable.
**Edge Cases:**
- Driver needs to skip a single day within a recurring series (e.g., a holiday) → can cancel that single instance without affecting the rest of the series.
**Failure Scenarios:**
- A passenger has a confirmed booking on a recurring instance the driver later cancels → passenger is notified immediately with the specific affected date.
**Priority:** P1

### US-3.3 — Set Ride Preferences
**User Story:** As a driver, I want to set preferences like gender preference or no-smoking, so that I can publish rides that match my comfort requirements.
**Acceptance Criteria:**
- Optional preference fields available at ride creation; preferences are displayed to passengers before they request to join.
**Edge Cases:**
- Driver sets a gender preference → search results filter accordingly for passengers, and passengers not matching the preference simply do not see the ride rather than seeing it and being rejected (avoids awkward rejection experience).
**Failure Scenarios:** N/A
**Priority:** P2

### US-3.4 — Edit a Published Ride
**User Story:** As a driver, I want to edit ride details before any passenger has confirmed, so that I can correct mistakes or adjust to schedule changes.
**Acceptance Criteria:**
- Editable fields: time, route, seat count (route changes re-trigger match recalculation).
- Editing is blocked or requires extra confirmation once a passenger booking is confirmed.
**Edge Cases:**
- Driver edits route after a passenger request is pending (not yet confirmed) → pending passenger is notified that ride details changed and asked to reconfirm interest.
**Failure Scenarios:** N/A
**Priority:** P1

### US-3.5 — Cancel a Published Ride
**User Story:** As a driver, I want to cancel a ride I previously published, so that I can back out if my plans change.
**Acceptance Criteria:**
- Cancellation with no confirmed passengers is immediate, no penalty.
- Cancellation with confirmed passengers requires confirmation step and notifies all affected passengers instantly.
**Edge Cases:**
- Driver repeatedly cancels confirmed rides at the last minute → reliability score is reduced, visible to future passengers as a trust signal.
**Failure Scenarios:** N/A
**Priority:** P0

---

## Module 4: Ride Discovery

### US-4.1 — Search for Rides by Route
**User Story:** As a passenger, I want to search for rides by entering my pickup and drop location, so that I can find drivers traveling my way.
**Acceptance Criteria:**
- Search returns rides matching all three scenarios (exact match, partial-exit, partial-pickup).
- Results show estimated cost, driver rating, time, and seats available.
**Edge Cases:**
- No matches found → system suggests broadening time window or shows "no rides yet, notify me when one matches" opt-in.
**Failure Scenarios:**
- Maps/geocoding service temporarily unavailable → cached/last-known location data used with a clear "approximate" indicator.
**Priority:** P0

### US-4.2 — Filter Search Results
**User Story:** As a passenger, I want to filter search results by vehicle type, rating, or gender preference, so that I can find a ride that matches my comfort needs.
**Acceptance Criteria:**
- Filters apply instantly without a full page reload; filter state persists during the session.
**Edge Cases:**
- Filters applied so narrowly that zero results remain → system suggests relaxing specific filters rather than just showing an empty state.
**Failure Scenarios:** N/A
**Priority:** P2

### US-4.3 — View Ride Match Explanation
**User Story:** As a passenger, I want to understand why a ride was suggested to me, so that I can trust the match is actually relevant to my route.
**Acceptance Criteria:**
- Each result shows a brief explanation (e.g., "Joins your route at MG Road, 1.8 km from driver's start").
**Edge Cases:**
- Exact match scenario → explanation simplifies to "Same route as you."
**Failure Scenarios:** N/A
**Priority:** P1

### US-4.4 — Save a Favorite Route
**User Story:** As a frequent commuter, I want to save my regular route, so that I can search it with one tap instead of re-entering it daily.
**Acceptance Criteria:**
- User can save up to 5 named routes (e.g., "Home to College").
- Saved route pre-fills the search form on selection.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P2

### US-4.5 — Get Notified of New Matching Rides
**User Story:** As a passenger who found no matches, I want to be notified when a new ride matching my route becomes available, so that I don't have to keep manually re-searching.
**Acceptance Criteria:**
- User opts in to "notify me" for a specific route/time search; notified within minutes of a matching ride being published.
**Edge Cases:**
- Multiple saved searches active simultaneously → notifications are clearly labeled per route to avoid confusion.
**Failure Scenarios:** N/A
**Priority:** P2

---

## Module 5: Ride Matching

### US-5.1 — Match on Exact Route (Scenario 1)
**User Story:** As a passenger whose start and end point exactly match a driver's published ride, I want to see this as a top-relevance match, so that I find the most convenient option first.
**Acceptance Criteria:**
- Exact matches are ranked above partial matches by default, all else being equal.
**Edge Cases:**
- Multiple exact matches exist at similar times → secondary ranking by driver rating and verification status.
**Failure Scenarios:** N/A
**Priority:** P0

### US-5.2 — Match When Passenger Exits Mid-Route (Scenario 2)
**User Story:** As a passenger whose destination is along a driver's longer route, I want to be matched and shown exactly where I'd exit, so that I can confidently join a ride that doesn't go all the way to my destination at the driver's expense of a direct route.
**Acceptance Criteria:**
- System identifies driver routes where the passenger's drop point lies within a defined proximity of the driver's path.
- Drop point is clearly shown on the route map.
**Edge Cases:**
- Passenger's drop point is technically near the route but requires a significant detour → system calculates and discloses the added distance/time to the driver before booking confirmation.
**Failure Scenarios:** N/A
**Priority:** P0

### US-5.3 — Match When Passenger Joins Mid-Route (Scenario 3)
**User Story:** As a passenger whose pickup point is along a driver's route (not the driver's starting point), I want to be matched and shown my exact pickup point, so that I can join a ride already in progress conceptually, without needing the driver to start from my location.
**Acceptance Criteria:**
- System identifies driver routes where the passenger's pickup point lies within proximity of the driver's path, after the driver's own start point.
- Estimated pickup time at that point is shown (not just the driver's overall departure time).
**Edge Cases:**
- Multiple passengers join at different mid-route points on the same ride → system sequences pickups logically along the route.
**Failure Scenarios:** N/A
**Priority:** P0

### US-5.4 — Reject a Low-Relevance Match
**User Story:** As a passenger, I do not want to see rides with minimal route overlap, so that my search results stay genuinely useful.
**Acceptance Criteria:**
- Matches below a configurable minimum overlap threshold are excluded from results entirely, not shown as low-confidence options.
**Edge Cases:**
- A sparse-supply cohort has very few rides at all → system may temporarily lower the threshold with a clear "limited matches nearby" indicator rather than showing nothing.
**Failure Scenarios:** N/A
**Priority:** P1

---

## Module 6: Ride Joining

### US-6.1 — Request to Join a Ride
**User Story:** As a passenger, I want to request to join a specific ride, so that the driver can review and approve me before we're matched.
**Acceptance Criteria:**
- Request includes passenger's exact pickup/drop point and is sent to the driver for approval.
**Edge Cases:**
- Passenger attempts to request more seats than are available → blocked at request time with a clear message.
**Failure Scenarios:**
- Driver does not respond within the configured window → request auto-expires and passenger is notified to search again.
**Priority:** P0

### US-6.2 — Accept or Decline a Join Request
**User Story:** As a driver, I want to review a passenger's profile and decide whether to accept their join request, so that I retain control over who joins my vehicle.
**Acceptance Criteria:**
- Driver sees passenger profile, rating, verification status before deciding.
- Acceptance immediately confirms the booking and notifies the passenger.
**Edge Cases:**
- Driver declines without reason → passenger is notified of decline without being shown a reason (avoids unnecessary friction/conflict) but may see general guidance to try other matches.
**Failure Scenarios:** N/A
**Priority:** P0

### US-6.3 — View Booking Confirmation Details
**User Story:** As a passenger, once my request is accepted, I want to see full confirmed ride details, so that I know exactly when and where to be ready.
**Acceptance Criteria:**
- Confirmation screen shows driver details, vehicle details, pickup point and time, cost share, and a map preview.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P0

### US-6.4 — Cancel a Confirmed Booking
**User Story:** As a passenger or driver, I want to cancel a confirmed booking if my plans change, so that the other party isn't left waiting unexpectedly.
**Acceptance Criteria:**
- Cancellation immediately notifies the other party.
- Cancellations close to departure time are flagged as "late" and affect reliability score.
**Edge Cases:**
- Passenger cancels, freeing a seat that another waiting passenger had been notified about → seat becomes available again in search instantly.
**Failure Scenarios:** N/A
**Priority:** P0

---

## Module 7: Ride Management

### US-7.1 — Start a Ride
**User Story:** As a driver, I want to mark a ride as "started" when I begin the trip, so that the system and passengers know the ride is in progress.
**Acceptance Criteria:**
- Ride status changes to "Ongoing"; safety tooling (SOS, live location) becomes active for the duration.
**Edge Cases:**
- Driver starts the ride significantly earlier/later than scheduled → passengers are notified of the status change regardless of timing deviation.
**Failure Scenarios:** N/A
**Priority:** P0

### US-7.2 — Complete a Ride
**User Story:** As a driver, I want to mark a ride as completed upon reaching the final destination, so that the ride lifecycle closes properly and rating/cost-confirmation can proceed.
**Acceptance Criteria:**
- Both driver and passenger(s) are prompted to confirm completion; mutual confirmation finalizes the ride as "Completed."
**Edge Cases:**
- One party confirms completion, the other doesn't respond → ride auto-completes after a buffer window with a flag for review if either party disputes it afterward.
**Failure Scenarios:** N/A
**Priority:** P0

### US-7.3 — Handle a No-Show
**User Story:** As a driver, I want to report that a confirmed passenger did not show up, so that the system can record this accurately and protect my reliability metrics.
**Acceptance Criteria:**
- Driver marks "passenger no-show" with optional note; this is logged distinctly from a standard cancellation.
**Edge Cases:**
- Passenger disputes the no-show claim (e.g., claims they were present but driver left early) → both records are retained and routed to admin review if repeated/contested.
**Failure Scenarios:** N/A
**Priority:** P1

### US-7.4 — View Live Ride Status
**User Story:** As a passenger, I want to see the live status of my upcoming ride (scheduled, driver en route, ongoing), so that I know what to expect without needing to message the driver directly.
**Acceptance Criteria:**
- Status updates reflect in near-real-time as the driver progresses through the ride lifecycle.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P1

---

## Module 8: Cost Sharing

### US-8.1 — View Estimated Cost Before Booking
**User Story:** As a passenger, I want to see my exact cost share before confirming a ride, so that I can decide if it fits my budget with no surprises.
**Acceptance Criteria:**
- Cost share is calculated and displayed at search-result level and again at booking confirmation, with identical figures.
**Edge Cases:**
- Multiple passengers join at different points → each sees only their own calculated share, with the underlying logic available via an "how is this calculated?" expandable explainer.
**Failure Scenarios:** N/A
**Priority:** P0

### US-8.2 — Understand the Cost Breakdown
**User Story:** As a driver, I want to see how the total trip cost and each passenger's share were calculated, so that I trust the system isn't shortchanging me.
**Acceptance Criteria:**
- Breakdown shows total distance, per-km rate used, and each passenger's distance-proportional share.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P0

### US-8.3 — Settle Payment Off-Platform
**User Story:** As a driver, I want clear guidance that payment is to be settled directly (e.g., UPI/cash) with passengers, so that there's no ambiguity about how I get paid in this initial version of the platform.
**Acceptance Criteria:**
- Booking confirmation explicitly states the cost share and that settlement happens outside the app, with a clear note that in-app payment is planned for a future release.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P0

---

## Module 9: Safety

### US-9.1 — Trigger SOS During a Ride
**User Story:** As a passenger or driver, I want to trigger an SOS alert during an active ride with minimal effort, so that I can get help quickly if I feel unsafe.
**Acceptance Criteria:**
- SOS control is visible on every active-ride screen; triggering requires a single tap plus a brief confirm step (to avoid accidental triggers) and dispatches alerts within 3 seconds.
**Edge Cases:**
- Accidental trigger → a short cancel window is available immediately after trigger, but if not cancelled, the alert proceeds in full (errs toward over-alerting rather than under-alerting).
**Failure Scenarios:**
- Network connectivity drops at the moment of trigger → last-known location is sent, and system retries delivery as connectivity returns.
**Priority:** P0

### US-9.2 — Share Live Location With an Emergency Contact
**User Story:** As a passenger, I want to share my live location with a chosen emergency contact during a ride, so that someone I trust knows where I am in real time, independent of an actual emergency.
**Acceptance Criteria:**
- User can start/stop live sharing at will during an active ride; sharing automatically ends when the ride is marked completed.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P0

### US-9.3 — View Safety Center
**User Story:** As a user, I want a single place to access all safety tools and information, so that I'm not hunting through menus during a stressful moment.
**Acceptance Criteria:**
- Safety Center is reachable in one tap from the main navigation and prominently from any active-ride screen; includes SOS, emergency contacts management, and reporting access.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P0

---

## Module 10: Reporting

### US-10.1 — Report a User
**User Story:** As a user, I want to report another user for unsafe or inappropriate behavior, so that the platform can take action and protect others.
**Acceptance Criteria:**
- Report flow: select category → optional detail → submit; reachable in 3 taps or fewer from a completed/active ride.
**Edge Cases:**
- User attempts to submit multiple reports against the same person for the same incident → system deduplicates/merges into a single case rather than creating duplicate queue entries.
**Failure Scenarios:** N/A
**Priority:** P0

### US-10.2 — Track Report Status
**User Story:** As a user who filed a report, I want to see a status update on my report, so that I know it was received and is being handled, even if I can't see internal moderation details.
**Acceptance Criteria:**
- Reporter sees status states: "Received," "Under Review," "Resolved," without exposing confidential admin notes or the reported user's personal data.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P1

### US-10.3 — Report a Ride In-Progress (Urgent)
**User Story:** As a passenger currently on a ride that feels unsafe, I want to file an urgent report without waiting for the ride to end, so that the platform can intervene immediately if needed.
**Acceptance Criteria:**
- Urgent in-ride report is routed to the admin queue with highest priority, distinct from standard post-ride reports.
**Edge Cases:**
- Urgent report filed while SOS is also active → both are linked as a single incident for admin context rather than treated as unrelated events.
**Failure Scenarios:** N/A
**Priority:** P0

---

## Module 11: Ratings

### US-11.1 — Rate a Driver After a Ride
**User Story:** As a passenger, I want to rate my driver after a completed ride, so that future passengers benefit from my experience.
**Acceptance Criteria:**
- Rating prompt appears immediately after mutual ride completion; 1–5 stars plus optional text.
**Edge Cases:**
- Passenger skips rating → single reminder notification sent once, then no further nagging.
**Failure Scenarios:** N/A
**Priority:** P0

### US-11.2 — Rate a Passenger After a Ride
**User Story:** As a driver, I want to rate my passenger after a completed ride, so that I can flag reliability or behavior issues for future drivers.
**Acceptance Criteria:**
- Same flow as US-11.1, mirrored for the driver role.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P0

### US-11.3 — View My Rating Trend
**User Story:** As a user, I want to see my rating trend over time, so that I'm aware if my reputation is improving or declining.
**Acceptance Criteria:**
- Profile shows current average and a simple trend indicator (e.g., last 10 rides vs. all-time average).
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P2

---

## Module 12: Reviews

### US-12.1 — Leave a Text Review
**User Story:** As a user, I want to optionally leave a short text review alongside my star rating, so that I can give more specific, useful feedback.
**Acceptance Criteria:**
- Text review is optional, capped at a reasonable character limit, and moderated for abusive language before going live.
**Edge Cases:**
- Review contains personal contact information (phone/email shared in text) → automatically redacted before publishing, since reviews are semi-public.
**Failure Scenarios:** N/A
**Priority:** P2

### US-12.2 — Read Reviews on a Profile
**User Story:** As a passenger evaluating a driver, I want to read past reviews left by other passengers, so that I get qualitative context beyond just the star average.
**Acceptance Criteria:**
- Reviews are listed chronologically, most recent first, with reviewer name visible (not anonymous).
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P2

---

## Module 13: Notifications

### US-13.1 — Receive a Ride Reminder
**User Story:** As a confirmed passenger, I want a reminder notification before my ride departs, so that I'm ready on time.
**Acceptance Criteria:**
- Reminder sent at a configurable lead time (e.g., 15 minutes) before scheduled departure.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P1

### US-13.2 — Manage Notification Preferences
**User Story:** As a user, I want to control which non-critical notifications I receive, so that I'm not overwhelmed while still staying informed about what matters to me.
**Acceptance Criteria:**
- User can toggle categories (reminders, rating prompts, marketing) independently; safety-critical notifications cannot be disabled.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P2

---

## Module 14: Analytics

### US-14.1 — View Personal Savings Dashboard
**User Story:** As a user, I want to see how much money, fuel, and CO₂ I've saved through ride-sharing, so that I feel the tangible value of using the platform.
**Acceptance Criteria:**
- Dashboard shows cumulative totals, updated immediately after each completed ride.
**Edge Cases:**
- New user with zero completed rides → dashboard shows an encouraging zero-state rather than a blank/broken view.
**Failure Scenarios:** N/A
**Priority:** P1

### US-14.2 — View Ride History
**User Story:** As a user, I want to see a full history of my past rides, so that I can reference past co-travelers, costs, and routes.
**Acceptance Criteria:**
- History list is filterable by role (driver/passenger) and date range.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P1

---

## Module 15: Admin Operations

### US-15.1 — Review the Report Queue
**User Story:** As a platform admin, I want to see all submitted reports in a prioritized queue, so that I can address urgent safety issues first.
**Acceptance Criteria:**
- Queue sorted by urgency (urgent in-ride reports first), with full context (ride log, user history) accessible per item.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P0

### US-15.2 — Suspend or Ban a User
**User Story:** As a platform admin, I want to suspend or ban a user account, so that I can act on confirmed safety or policy violations.
**Acceptance Criteria:**
- Action requires a logged justification; affected user is notified of the action and (where applicable) the reason category.
**Edge Cases:**
- Suspended user attempts to re-register with a new number/email → system flags potential ban-evasion via device/identity signal matching for manual review.
**Failure Scenarios:** N/A
**Priority:** P0

### US-15.3 — Monitor Platform Safety Metrics
**User Story:** As a platform admin, I want a dashboard of SOS activations, report rates, and response times, so that I can monitor overall platform health and catch emerging issues early.
**Acceptance Criteria:**
- Dashboard updates near-real-time; trends are visualized over configurable time windows.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P1

### US-15.4 — Manually Resolve Institutional Verification Edge Cases
**User Story:** As a platform admin, I want to manually approve or reject institutional verification requests that automated domain-matching can't resolve, so that legitimate users aren't blocked by an incomplete institution list.
**Acceptance Criteria:**
- Admin sees the requested domain, user details, and can approve (adding the domain to the known list for future automatic matching) or reject with a reason.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P2

### US-15.5 — Audit Ride Logs for a Dispute
**User Story:** As a platform admin, I want to access the full immutable log of a specific ride during a dispute investigation, so that I can make a fair, evidence-based decision.
**Acceptance Criteria:**
- Ride log includes all status transitions, timestamps, participant details, and any linked reports/SOS events.
**Edge Cases:** N/A
**Failure Scenarios:** N/A
**Priority:** P1

---

## Story Count Summary

| Module | Story Count |
|---|---|
| Authentication | 6 |
| Profiles | 4 |
| Ride Creation | 5 |
| Ride Discovery | 5 |
| Ride Matching | 4 |
| Ride Joining | 4 |
| Ride Management | 4 |
| Cost Sharing | 3 |
| Safety | 3 |
| Reporting | 3 |
| Ratings | 3 |
| Reviews | 2 |
| Notifications | 2 |
| Analytics | 2 |
| Admin Operations | 5 |
| **Total** | **55** |
