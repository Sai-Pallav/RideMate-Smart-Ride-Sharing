# Wireframe Specifications
## Smart Community Ride Sharing Platform

This document specifies low-fidelity wireframe requirements for every screen across **Mobile App** and **Website**. Each screen defines purpose, components, layout structure, user actions, and all relevant states (default, empty, loading, error). This is intended as a direct input for high-fidelity UI design and frontend implementation.

---

## Design Notes Applicable to All Screens

- Safety-critical controls (SOS, Report) must appear in a fixed, predictable location across all ride-related screens — never nested more than one tap deep.
- Verification badges and ratings must be visible wherever a user's profile is referenced (search results, booking confirmation, ride details) — trust signals shown at decision points, not buried in profile-only views.
- All primary actions must have a clear loading state and a clear error state with a retry option — no silent failures.
- Empty states must always suggest a next action, never just say "nothing here."

---

## 1. Splash Screen

**Purpose:** Brief branded loading screen while the app initializes and checks session validity.

**Components:** Logo, tagline ("Share the ride. Split the cost. Travel safer."), loading indicator.

**Layout Structure:** Centered logo and tagline, full-bleed background, minimal.

**User Actions:** None (auto-transitions).

**States:**
- *Default:* Logo animates briefly while session check runs.
- *Loading:* Indicator shown if session check takes longer than expected.
- *Error:* If session check fails entirely (e.g., no connectivity), auto-routes to a lightweight offline notice rather than hanging indefinitely.

---

## 2. Onboarding (First-Time Only)

**Purpose:** Communicate the core value proposition before registration — critically, that this is NOT a taxi app.

**Components:** 3–4 swipeable cards: (1) "This isn't a taxi app — it's sharing rides already happening," (2) "Save money, split fuel cost fairly," (3) "Verified, rated, safety-first community," (4) "Built for students and daily commuters."

**Layout Structure:** Full-screen swipeable carousel, progress dots, skip option top-right, primary CTA ("Get Started") on final card.

**User Actions:** Swipe between cards, skip, proceed to registration.

**States:**
- *Default:* Card 1 shown on entry.
- *Loading/Error:* N/A (static content).

---

## 3. Login Screen

**Purpose:** Authenticate a returning user via mobile + OTP.

**Components:** Mobile number input field, "Send OTP" button, link to registration for new users.

**Layout Structure:** Single-column form, centered, minimal distraction.

**User Actions:** Enter mobile number, request OTP, navigate to registration.

**States:**
- *Default:* Empty input, button disabled until valid 10-digit number entered.
- *Loading:* Spinner on button while OTP request is in flight.
- *Error:* Inline message for invalid number format; toast/banner for OTP send failure with retry.

---

## 4. OTP Verification Screen

**Purpose:** Confirm identity via 6-digit OTP for login or registration.

**Components:** 6-digit OTP input (auto-advancing boxes), countdown timer for resend, "Resend OTP" link (disabled until timer expires), fallback "Call me instead" option.

**Layout Structure:** Centered, single focus area, minimal chrome.

**User Actions:** Enter OTP, resend, request voice call fallback.

**States:**
- *Default:* Timer counting down.
- *Loading:* Verifying spinner on auto-submit when 6 digits entered.
- *Error:* Incorrect OTP shows inline error and clears input; 3 failed attempts trigger temporary lockout with cooldown message.

---

## 5. Registration Screen

**Purpose:** Collect initial account information.

**Components:** Mobile number, email, name fields; terms/privacy checkbox; submit button.

**Layout Structure:** Single-column form, progressive disclosure (email/name appear after mobile is validated, to reduce initial friction).

**User Actions:** Fill fields, accept terms, submit.

**States:**
- *Default:* Empty form.
- *Loading:* Submit button shows spinner.
- *Error:* Field-level validation errors (invalid email format, already-registered number routes to login instead).

---

## 6. Profile Setup Screen (Guided, First-Time)

**Purpose:** Walk a new user through mandatory setup: photo, basic info, emergency contact.

**Components:** Photo upload, name confirmation, gender (optional), institutional email field (optional, skippable), emergency contact form (mandatory, minimum 1).

**Layout Structure:** Multi-step wizard with progress indicator (e.g., "Step 2 of 3").

**User Actions:** Upload photo, fill fields, add emergency contact, skip optional steps, proceed.

**States:**
- *Default:* Step 1 of wizard.
- *Loading:* Photo upload progress indicator.
- *Error:* Photo too large/wrong format → inline error with guidance; cannot proceed past emergency contact step without at least one valid entry.

---

## 7. Home Screen

**Purpose:** Central hub after login — quick access to search, saved routes, active bookings, and role switch (driver/passenger).

**Components:** Search bar (pickup/drop quick entry), saved route chips, "Active Ride" card (if applicable), "Offer a Ride" CTA, recent activity feed, bottom nav (Home, Search, Create Ride, History, Profile).

**Layout Structure:** Vertical scroll: search bar top, active ride card (if any) prominently below, saved routes as horizontal scroll chips, recent activity below that.

**User Actions:** Tap search, tap saved route, tap active ride card to view details, tap "Offer a Ride," navigate via bottom nav.

**States:**
- *Default (no active ride):* Active ride card replaced by a prompt to search or offer.
- *Default (active ride exists):* Card shows live status (Scheduled/Ongoing) with quick access to safety tools if Ongoing.
- *Loading:* Skeleton loaders for activity feed.
- *Empty (new user):* Recent activity replaced with onboarding tips ("Search your first ride" / "Offer your first ride").
- *Error:* Failed to load activity feed → inline retry, rest of screen unaffected.

---

## 8. Search Screen

**Purpose:** Let a passenger enter pickup, drop, and time to find matching rides.

**Components:** Pickup location field (map-assisted autocomplete), drop location field, date/time picker, "Search" button, saved-route quick-select.

**Layout Structure:** Form at top, map preview below showing entered points, search button fixed at bottom.

**User Actions:** Enter/select locations, set time, submit search, select a saved route.

**States:**
- *Default:* Empty fields, map centered on user's current location.
- *Loading:* Map pin-drop animation while geocoding resolves typed address.
- *Error:* Location not found → inline suggestion to refine input; no connectivity → cached recent locations offered as fallback.

---

## 9. Search Results Screen

**Purpose:** Display ranked ride matches.

**Components:** Filter bar (vehicle type, rating, gender preference, sort order), result cards (driver photo, name, rating badge, verification badges, vehicle type, departure time, cost share, match explanation snippet), map toggle view.

**Layout Structure:** List view default, toggleable to map view showing route overlays; filter bar sticky at top.

**User Actions:** Apply filters, tap a result to view details, toggle map/list, opt into "notify me" if scrolled to bottom with no further results.

**States:**
- *Default:* Ranked list, exact matches visually distinguished from partial matches (e.g., a small "Exact Route" vs. "Joins Your Route" tag).
- *Loading:* Skeleton cards while matching engine computes results.
- *Empty:* No matches — show "Broaden your time window" suggestion and "Notify me when a ride matches" CTA.
- *Error:* Search service failure → retry button, clear error messaging (not a blank screen).

---

## 10. Ride Details Screen (Pre-Booking)

**Purpose:** Full detail view of a specific ride before requesting to join.

**Components:** Driver profile summary (photo, name, rating, verification badges, completed ride count), vehicle details, full route map with pickup/drop point highlighted, cost breakdown, ride preferences (gender preference, no-smoking, etc.), "Request to Join" button.

**Layout Structure:** Profile summary top, map in middle (large, primary visual focus), cost and preferences below, sticky CTA button at bottom.

**User Actions:** Adjust own pickup/drop point on the route (if applicable to scenario), tap "Request to Join," tap driver profile for full public profile view.

**States:**
- *Default:* All ride info populated.
- *Loading:* Map tiles loading.
- *Error:* Ride became fully booked between search and view → clear message, redirect to search results.

---

## 11. Create Ride Screen

**Purpose:** Driver flow to publish a new ride.

**Components:** Source/destination fields, auto-suggested route map (editable), date/time picker, seat count stepper, preferences toggles (gender, smoking, luggage), recurring ride toggle + pattern selector, cost estimate preview, "Publish Ride" button.

**Layout Structure:** Multi-section single-scroll form (not a wizard, since drivers are likely repeat users who want speed), map embedded mid-form showing live route preview as fields are filled.

**User Actions:** Fill all fields, adjust route manually if needed, toggle recurring, review estimated cost, publish.

**States:**
- *Default:* Empty form, "Publish" disabled until required fields complete.
- *Loading:* Route calculation spinner after source/destination entered.
- *Error:* No vehicle added yet → blocking prompt to add vehicle first; Maps API failure → manual waypoint entry fallback.

---

## 12. Ride Requests Screen (Driver-Facing)

**Purpose:** Driver reviews and acts on incoming passenger join requests for their published rides.

**Components:** List of pending requests grouped by ride, each showing passenger photo, name, rating, verification badges, requested pickup/drop point, Accept/Decline buttons.

**Layout Structure:** Grouped list, most time-sensitive (soonest departure) ride's requests at top.

**User Actions:** Tap a request to view full passenger profile, accept, decline.

**States:**
- *Default:* List of pending requests.
- *Empty:* "No pending requests yet" with link back to the published ride.
- *Loading:* Skeleton list items.
- *Error:* Accept/decline action fails to save → inline retry on that specific card, rest of list unaffected.

---

## 13. Active Ride Screen (Ongoing)

**Purpose:** The in-progress ride experience — the most safety-critical screen in the product.

**Components:** Live status banner ("Ride in progress"), driver/passenger mini-profile bar, route map with live position (if location sharing enabled), large fixed SOS button, "Share Live Location" toggle, "Report" quick access, "Mark Complete" button (driver only).

**Layout Structure:** Map as dominant visual element, status and SOS persistently visible without scrolling (above the fold at all times), secondary actions (report, share location) easily reachable but visually subordinate to SOS.

**User Actions:** Trigger SOS, toggle live location sharing, file urgent report, mark ride complete (driver).

**States:**
- *Default:* Ride ongoing, all tools active.
- *SOS Triggered:* Screen shifts to a clear "Alert Sent" confirmation state showing what was shared and with whom, with an option to cancel/stand-down if triggered in error and confirmed safe.
- *Loading:* Live location pin updating.
- *Error:* Location services disabled → prominent banner prompting re-enable, since this directly affects safety tooling.

---

## 14. Ride Completion / Confirmation Screen

**Purpose:** Mutual confirmation step after a ride ends.

**Components:** Trip summary (route, duration, cost), "Confirm Completion" button, dispute link ("This doesn't look right").

**Layout Structure:** Simple summary card, single primary action.

**User Actions:** Confirm completion, raise a dispute.

**States:**
- *Default:* Awaiting confirmation.
- *Waiting on Other Party:* Shows "Waiting for [name] to confirm" with auto-complete countdown.
- *Error:* Dispute flow routes to a short form, then admin queue.

---

## 15. Rating Screen

**Purpose:** Post-ride rating and review submission.

**Components:** Star rating selector (1–5), optional text review field, submit button, skip option.

**Layout Structure:** Centered, single focus, co-traveler's photo/name shown for context.

**User Actions:** Select stars, write review, submit, or skip.

**States:**
- *Default:* No stars selected, submit disabled until at least a star rating is chosen.
- *Loading:* Submitting spinner.
- *Error:* Submission failure → retry, draft text preserved.

---

## 16. Notifications Screen

**Purpose:** Centralized list of all platform notifications.

**Components:** Chronological list grouped by day, icon per notification type (ride, safety, rating, system), read/unread indicator.

**Layout Structure:** Simple vertical list, safety-related notifications visually distinguished (e.g., colored accent) from routine ones.

**User Actions:** Tap a notification to navigate to its related screen, mark all as read, manage preferences (link to settings).

**States:**
- *Default:* Populated list.
- *Empty:* "No notifications yet" friendly state.
- *Loading:* Skeleton list.
- *Error:* Failed to load → retry banner.

---

## 17. Profile Screen (Own Profile)

**Purpose:** View and edit own profile, verification status, vehicles, and stats summary.

**Components:** Photo, name, rating summary, verification checklist, vehicle list, quick links (Ride History, Savings Dashboard, Emergency Contacts, Settings, Safety Center).

**Layout Structure:** Header card (photo/name/rating) top, verification checklist below, then a menu-style list of links to sub-sections.

**User Actions:** Edit profile fields, manage vehicles, navigate to sub-sections.

**States:**
- *Default:* Fully populated.
- *Loading:* Header skeleton.
- *Error:* Edit save failure → inline error on the specific field, not a full-page reload.

---

## 18. Public Profile Screen (Viewing Another User)

**Purpose:** What a passenger sees when viewing a driver's profile (or vice versa) before/after a ride.

**Components:** Photo, name, rating with completed ride count, verification badges, vehicle details (if driver), text reviews list, "Report this user" link (subtle, not prominent unless contextually relevant).

**Layout Structure:** Same header style as own profile for consistency, reviews list below.

**User Actions:** Scroll reviews, tap report link if needed.

**States:**
- *Default:* Populated profile.
- *New User (no ride history):* "New Member" badge shown clearly instead of an empty rating.
- *Loading/Error:* Standard skeleton/retry pattern.

---

## 19. Ride History Screen

**Purpose:** Full list of past rides (as driver and passenger).

**Components:** Filter toggle (All / As Driver / As Passenger), date range filter, list items showing route, date, co-traveler, cost, rating given.

**Layout Structure:** Filterable vertical list, most recent first.

**User Actions:** Apply filters, tap an entry for full ride detail/log view.

**States:**
- *Default:* Populated list.
- *Empty:* "No rides yet — search or offer your first ride" CTA.
- *Loading:* Skeleton list.
- *Error:* Retry banner.

---

## 20. Savings Dashboard Screen

**Purpose:** Personal cumulative impact view (cost, fuel, CO₂ saved).

**Components:** Headline stats (total cost saved, total fuel saved, total CO₂ avoided), simple trend chart over time, total rides completed, comparison framing (e.g., "equivalent to X liters of fuel").

**Layout Structure:** Stat cards in a grid at top, trend visualization below.

**User Actions:** Change time range filter on the chart.

**States:**
- *Default:* Populated with real data.
- *Empty (new user):* Encouraging zero-state explaining how savings will populate after first completed ride.
- *Loading/Error:* Standard patterns.

---

## 21. Safety Center Screen

**Purpose:** Single hub for all safety tooling and settings, reachable independent of an active ride.

**Components:** Emergency contacts management (add/edit/remove), SOS explainer (how it works), past safety events log (for the user's own reference), link to file a report, safety tips content.

**Layout Structure:** Sectioned list: Emergency Contacts, SOS Settings, My Reports, Safety Tips.

**User Actions:** Add/edit emergency contacts, review past SOS/report history, read safety guidance.

**States:**
- *Default:* Fully populated.
- *Empty (no emergency contacts):* Blocking-style prominent prompt, since this is mandatory before ride participation.
- *Error:* Contact save failure → inline retry.

---

## 22. Report Center Screen

**Purpose:** Initiate and track reports.

**Components:** "File a New Report" CTA, category selector, free-text field, list of past submitted reports with status (Received / Under Review / Resolved).

**Layout Structure:** New report form at top (or as a modal), history list below.

**User Actions:** Submit new report, view status of past reports.

**States:**
- *Default:* Form + history list.
- *Empty (no past reports):* History section simply omitted or shown as "No reports filed," form remains primary.
- *Loading/Error:* Standard patterns; submission failure must clearly preserve entered text so the user doesn't have to re-type during a stressful moment.

---

## 23. Settings Screen

**Purpose:** Account-level settings.

**Components:** Notification preferences, language selection, linked devices/sessions, privacy settings (phone number visibility rules), account deletion/deactivation, logout.

**Layout Structure:** Standard sectioned settings list.

**User Actions:** Toggle preferences, manage sessions, logout, initiate account deletion.

**States:**
- *Default:* Populated.
- *Account Deletion Flow:* Confirmation step explaining data retention policy for safety logs even post-deletion (where legally/policy required).

---

## 24. Admin Dashboard (Web Only)

**Purpose:** Internal tool for platform admins — not part of the consumer-facing app, web-only by design given its operational nature.

**Components:** Report queue (prioritized list), user search/lookup, safety metrics overview (SOS count, report rate, response time trend), verification edge-case queue, suspend/ban action panel with justification field, ride log lookup for dispute investigation.

**Layout Structure:** Standard admin console layout — left sidebar navigation (Queue, Users, Metrics, Verification, Logs), main content area as data tables/cards.

**User Actions:** Review and act on reports, search users, approve/reject verification edge cases, suspend/ban accounts, look up ride logs.

**States:**
- *Default:* Populated queue, sorted by urgency.
- *Empty Queue:* "All clear" state, still shows metrics overview.
- *Loading:* Table skeletons.
- *Error:* Action failure (e.g., ban action fails to save) → explicit error, no silent failure given the operational stakes.

---

## Mobile vs. Website Layout Differences

| Aspect | Mobile App | Website |
|---|---|---|
| Navigation | Bottom tab bar (Home, Search, Create, History, Profile) | Top horizontal nav bar, same destinations |
| SOS Placement | Fixed floating button, always reachable via thumb zone | Fixed top-right of viewport during active ride, persistent on scroll |
| Search | Full-screen dedicated flow | Can be a prominent inline widget on the homepage in addition to a dedicated page |
| Admin Dashboard | Not available on mobile by design | Primary and only interface for admin operations |
| Maps | Native device GPS integration, full-screen map views | Embedded map components, browser geolocation permission-based |
| Notifications | Push notifications + in-app list | Browser push (where supported) + in-app list; SMS fallback shared across both |

---

## Cross-Cutting Empty/Loading/Error Pattern Standards

- **Empty states** always pair a friendly message with a clear, single next action — never a dead end.
- **Loading states** use skeleton screens that mirror the eventual layout, not generic spinners, for all list/card-heavy screens (search results, history, requests).
- **Error states** always offer a retry action and use plain-language messaging — never raw error codes shown to end users (codes are logged for support/admin use only).
- **Safety-critical screens** (Active Ride, Safety Center, Report Center) never show a fully blank error state — at minimum, the SOS control and emergency contact info remain accessible even if other page content fails to load.
