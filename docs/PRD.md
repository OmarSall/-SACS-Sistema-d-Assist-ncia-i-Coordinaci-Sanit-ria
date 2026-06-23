# PRD — SACS: Sistema d'Assistència i Coordinació Sanitària
## Ambulance Dispatch Simulation & Operations Platform

| |                                                            |
|---|------------------------------------------------------------|
| **Status** | Draft v1.0                                                 |
| **Owner** | Omar Salloum                                               |
| **Stakeholder** | Private ambulance operator (Catalonia)                     |
| **Last updated** | 2026-06-22                                                 |
| **Audience** | Engineering team, future contributors, CEO/ops stakeholder |

---

## 1. Executive Summary

SACS is a web application for simulating and (eventually) operating ambulance
dispatch logistics for a private ambulance fleet operating in Barcelona and
the surrounding Catalonia region. It visualizes fleet positions on a live
traffic-aware map, simulates incident dispatch, and provides a break-scheduling
tool that **guarantees minimum coverage** of designated zones at all times.

The project is being built in two deliberate phases:

- **Phase 1 (current)** — A fully client-side simulation (React + Google Maps
  JS API), deployed as a static site on Firebase Hosting. No real operational
  data. Purpose: sales/demo tool, proof of concept for the break-scheduling
  algorithm, and a foundation that's architected so Phase 2 doesn't require a
  rewrite.

- **Phase 2 (conditional)** — If the ambulance operator (CEO) commits to
  adoption, the system evolves into a real operational tool: real-time GPS
  ingestion from vehicles, a backend with JWT-based authentication and
  role-based access, persistent incident/dispatch records, and potentially
  patient-related data (which triggers GDPR "special category data"
  obligations).

This PRD defines requirements, architecture, security posture, and testing
strategy for both phases, with explicit "Phase 1 vs Phase 2" markers so the
team always knows what's in scope **now** vs. what's being **designed for**.

---

## 2. Goals & Non-Goals

### 2.1 Goals (Phase 1)

1. Visualize 8 ambulances across real Catalonia bases on a live traffic map.
2. Simulate incident generation and nearest-available-unit dispatch.
3. Compute real road routes (Google Directions API) with traffic-aware ETAs.
4. Provide a break-scheduling tool that **proves** (via simulation sampling)
   that scheduled breaks never violate minimum coverage requirements for
   defined zones.
5. Full i18n: Catalan, Spanish, English.
6. Deployable by anyone (Firebase Hosting), cheap to run (stay within Google
   Maps free tier under normal demo usage).
7. Codebase structured so Phase 2 (backend, auth, real data) is an additive
   change, not a rewrite.

### 2.2 Goals (Phase 2 — conditional on stakeholder commitment)

1. Ingest real-time GPS positions from ambulance telematics/devices.
2. Authenticated multi-user access (dispatchers, fleet managers, admins) via
   JWT-based auth with role-based access control (RBAC).
3. Persist incidents, dispatch history, break schedules, and audit trails.
4. Provide dispatchers a live operational dashboard (not just a simulation).
5. (Future, separate workstream) Support patient-related data fields with
   appropriate "special category data" controls under GDPR.

### 2.3 Non-Goals

- Phase 1 does **not** handle any real personal data (no patients, no real
  vehicle telemetry, no user accounts).
- Phase 1 does **not** implement a backend; all "persistence" is in-memory /
  browser-local (e.g., directions cache).
- This system is **not** a Computer-Aided Dispatch (CAD) replacement for
  emergency 112/061 services — it targets a private operator's internal
  fleet logistics and break planning.
- No mobile native apps in either phase (responsive web only).

---

## 3. Stakeholders & Personas

| Persona | Phase | Needs |
|---|---|---|
| **CEO / Fleet Owner** | 1 & 2 | Sees a convincing demo; later wants a tool that reduces missed-coverage incidents and optimizes break compliance (labor law) without leaving zones uncovered. |
| **Dispatcher** | 2 | Needs real-time fleet view, incident assignment override, break schedule visibility. |
| **Driver/Crew** | 2 (future) | Potential mobile view of their shift/break schedule (out of scope for now). |
| **Developer (you)** | 1 & 2 | Needs a codebase that's testable, incrementally extendable, and doesn't accumulate "simulation-only" assumptions that block real data. |

---

## 4. Scope Summary

| Capability | Phase 1 | Phase 2 |
|---|---|---|
| Map + traffic visualization | ✅ | ✅ |
| Simulated incidents & dispatch | ✅ | Real incidents (from CAD/manual entry) |
| Break scheduling + coverage validation | ✅ (against simulated state) | ✅ (against real fleet state) |
| Real road routing (Directions API) | ✅ (cached, quota-limited) | ✅ (server-side proxy, see §9) |
| i18n (CA/ES/EN) | ✅ | ✅ |
| Authentication | ❌ | ✅ JWT + RBAC |
| Backend / persistence | ❌ | ✅ Cloud Functions + Firestore (or equivalent) |
| Real GPS ingestion | ❌ | ✅ |
| Patient data | ❌ | ⚠️ Separate workstream, own PRD addendum + DPIA |
| Audit logging | ❌ | ✅ |

---

## 5. Functional Requirements

### FR-1: Fleet Visualization
- FR-1.1: Display 8 ambulances at fixed home-base coordinates across
  Barcelona metro + Catalonia (Eixample, Litoral, Nou Barris, Sants,
  Badalona, Sant Cugat, Castelldefels, Sabadell).
- FR-1.2: Each unit shows status (idle, en route, on scene, transporting,
  returning, on break) via color-coded marker.
- FR-1.3: Toggle Google Maps `TrafficLayer` on/off.
- FR-1.4: Display a "coverage radius" circle per ambulance, sized by current
  traffic-adjusted reachable distance within a target time (default 8 min).

### FR-2: Simulation Engine
- FR-2.1: Time-based simulation (06:00–18:00 shift), adjustable speed
  (1x/2x/5x/10x).
- FR-2.2: Traffic factor model varies by simulated time-of-day (rush hours
  07:30–09:30, 17:00–19:00) and by selected traffic model
  (best_guess/pessimistic/optimistic).
- FR-2.3: Random incident generator with priority levels (critical, urgent,
  standard), each with realistic label text (3 languages).
- FR-2.4: Nearest-available-unit dispatch: closest idle/returning ambulance
  (not on break) assigned to pending incidents.
- FR-2.5: Ambulance state machine: idle → en_route → on_scene → transporting
  → returning → idle, with on_break interrupting any non-en-route state.

### FR-3: Routing
- FR-3.1: Real road-network routes via Google Directions API with
  `drivingOptions.trafficModel`.
- FR-3.2: **Route caching** (12h TTL, ~50–100m coordinate rounding) to avoid
  redundant API calls.
- FR-3.3: **Daily quota cap** on Directions API calls (default 150/day,
  configurable via env var), tracked client-side.
- FR-3.4: **Graceful fallback** to straight-line routes when: SDK not loaded,
  quota exceeded, or API error — simulation must never block or crash on
  routing failure.
- FR-3.5: Each ambulance's route carries a `routeSource` tag
  (`cache`/`api`/`fallback_straight_line`/`fallback_no_sdk`) for
  observability/debugging.

### FR-4: Break Scheduling & Coverage Guarantee
- FR-4.1: Each ambulance can have 0..N break windows (start minute + duration).
- FR-4.2: **Coverage zones** (8 defined, real Barcelona-area neighborhoods)
  each have `requiredAmbulances` and `targetResponseMinutes`.
- FR-4.3: `validateCoverage()` samples the **entire shift at 5-minute
  intervals**, and for each sample checks: for each zone, is the count of
  available (not-on-break) ambulances whose home-base is within
  `targetResponseMinutes` (at that sample's traffic factor) ≥
  `requiredAmbulances`?
- FR-4.4: Any violation is surfaced as a `CoverageWarning` (zone, minute,
  available vs required) and breaks contributing to violations are flagged
  `coverageOk: false` in the UI.
- FR-4.5: `autoSchedule()` generates a baseline schedule: 30-min breaks,
  max `floor(N/4)` ambulances on break simultaneously, scheduled only in
  "safe windows" outside rush hours.
- FR-4.6: Manual break add/remove with immediate re-validation.

### FR-5: Incidents Panel
- FR-5.1: List of generated incidents (priority, status, assigned unit,
  creation time), most recent first, capped display (12).

### FR-6: Internationalization
- FR-6.1: Full UI translation CA/ES/EN via i18next, runtime-switchable.
- FR-6.2: All zone/base names, status labels, and incident labels translated.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Simulation tick at 1Hz must not cause UI jank with 8 ambulances + 8 zones + N incidents. Map re-renders should be memoized; avoid re-creating Google Maps objects per render. |
| **Cost control** | Stay within Google Maps free tier under normal demo load (see §9). Hard client-side quota cap as a circuit breaker. |
| **Availability** | Phase 1: static hosting, effectively 99.95%+ (Firebase Hosting SLA). Phase 2: backend SLA TBD based on chosen infra. |
| **Browser support** | Latest 2 versions of Chrome, Firefox, Safari, Edge. Mobile responsive (tablet dispatcher use case). |
| **Accessibility** | WCAG 2.1 AA target for Phase 2 dispatcher UI (color is not the *only* status indicator — add icon/text). Phase 1: best-effort. |
| **i18n** | No hardcoded user-facing strings outside i18n resource files. |
| **Maintainability** | Pure functions for simulation math (geo, traffic, coverage) — fully unit-testable without DOM or network. |
| **Testability** | All business logic decoupled from React components and from `window.google.maps` (behind an adapter), enabling TDD without a browser. |

---

## 7. System Architecture

### 7.1 Phase 1 Architecture (current)

```
┌─────────────────────────────────────────────────────────┐
│ Browser (Client)                                          │
│                                                            │
│  ┌──────────────┐   ┌───────────────┐   ┌─────────────┐  │
│  │ React UI      │   │ Zustand Store  │   │ i18next     │  │
│  │ (components)  │◄──┤ (simStore)     │   │ (CA/ES/EN)  │  │
│  └──────┬───────┘   └──────┬─────────┘   └─────────────┘  │
│         │                   │                              │
│         │            ┌──────▼─────────┐                    │
│         │            │ Pure logic libs │                    │
│         │            │ geo.ts          │                    │
│         │            │ breakScheduler  │                    │
│         │            │ directionsSvc   │                    │
│         │            └──────┬─────────┘                    │
│         │                   │                              │
│  ┌──────▼──────────────────▼──────────┐                    │
│  │ @react-google-maps/api               │                    │
│  │ → Google Maps JS API (Maps,          │                    │
│  │   Directions, TrafficLayer)          │                    │
│  └───────────────┬───────────────────┘                    │
│                   │ HTTPS                                  │
│  localStorage ◄───┤ (directions cache, quota counter)      │
└───────────────────┼───────────────────────────────────────┘
                     │
                     ▼
            Google Maps Platform (Maps JS, Directions API)

Hosting: Firebase Hosting (static SPA, dist/ output)
```

**Key architectural principle for Phase 1:** the simulation/business logic
(`src/utils/*`, `src/store/simStore.ts`) has **zero React dependencies** and
talks to Google Maps only through a thin adapter (`directionsService.ts`)
that already implements cache/quota/fallback. This is what makes Phase 2
additive rather than a rewrite — see §7.2.

### 7.2 Phase 2 Architecture — Microservices

Phase 2 is decomposed into **bounded contexts**, each owned by a small
service with its own data store (database-per-service). The frontend never
talks to services directly — everything goes through an **API Gateway / BFF**
that handles JWT verification, request routing, and response aggregation.

```
┌──────────────────────────┐
│ Browser (Client)           │
│  React UI + Zustand        │
│  (same pure logic libs,     │
│   now fed by real data)     │
└─────────────┬───────────────┘
              │ HTTPS (REST/JSON), WSS for live updates
              ▼
┌──────────────────────────────────────────────────────────────┐
│ API Gateway / BFF  (Cloud Run / Cloud Endpoints)                │
│  - JWT verification, RBAC enforcement                          │
│  - Request routing + response aggregation                      │
│  - Rate limiting, CORS                                          │
└───┬─────────────┬─────────────┬─────────────┬──────────────┬──┘
    │              │             │             │              │
    ▼              ▼             ▼             ▼              ▼
┌────────┐  ┌────────────┐ ┌───────────┐ ┌────────────┐ ┌───────────┐
│ Identity│  │ Fleet &     │ │ Dispatch &│ │ Scheduling │ │ Routing &  │
│ Service │  │ Telemetry   │ │ Incidents │ │ & Coverage │ │ Traffic    │
│ (auth,  │  │ Service     │ │ Service   │ │ Service    │ │ Service    │
│ users,  │  │ (vehicles,  │ │ (incidents│ │ (breaks,   │ │ (Directions│
│ roles)  │  │  GPS ingest,│ │  dispatch │ │  coverage  │ │  proxy,    │
│         │  │  positions) │ │  state    │ │  validation│ │  cache,    │
│         │  │             │ │  machine) │ │  )         │ │  quota)    │
└────┬────┘  └──────┬─────┘ └─────┬─────┘ └─────┬──────┘ └─────┬─────┘
     │              │             │             │              │
     ▼              ▼             ▼             ▼              ▼
  ┌──────┐      ┌────────┐    ┌────────┐    ┌────────┐    ┌──────────┐
  │ Auth  │      │ Fleet  │    │Dispatch│    │Schedule│    │ Routing   │
  │  DB   │      │  DB    │    │  DB    │    │  DB    │    │ cache DB  │
  │(users,│      │(vehicles│   │(incid.,│    │(breaks,│    │ (route    │
  │ roles)│      │ pos.    │   │ state) │    │ cov.   │    │ segments, │
  │       │      │ time-   │   │        │    │ zones) │    │ no PII)   │
  │       │      │ series) │   │        │    │        │    │           │
  └──────┘      └────────┘    └────────┘    └────────┘    └──────────┘

       ▲                            ▲              ▲
       │                            │              │
       └──────── Event Bus (Pub/Sub) ──────────────┘
       Events: VehiclePositionUpdated, IncidentCreated,
               IncidentAssigned, BreakScheduleChanged,
               CoverageWarningRaised, UserRoleChanged → Audit Service

┌────────────────────────────────────────────────────────────┐
│ Audit Service — subscribes to all domain events,             │
│ append-only log, own DB, read API for admins                  │
└────────────────────────────────────────────────────────────┘

           ▲
           │ device credentials (per-vehicle)
  ┌────────┴─────────┐
  │ Vehicle telematics│
  └───────────────────┘

Hosting/runtime: Cloud Run per service (scale-to-zero, container-based,
cost-efficient for low/medium traffic). Frontend stays on Firebase Hosting.
```

**Service responsibilities & FR mapping:**

| Service | Owns | Maps to | Sync API | Async events |
|---|---|---|---|---|
| **Identity** | users, roles, sessions | §8.2 RBAC | REST (login, refresh, user CRUD) | `UserRoleChanged` |
| **Fleet & Telemetry** | vehicles, live positions, GPS ingest | FR-1, §8.4 | REST (vehicle CRUD, current positions) | publishes `VehiclePositionUpdated` |
| **Dispatch & Incidents** | incidents, assignment state machine | FR-2.4–2.5, FR-5 | REST (create/assign/resolve incident) | consumes `VehiclePositionUpdated`; publishes `IncidentCreated`/`IncidentAssigned` |
| **Scheduling & Coverage** | break windows, coverage zones, validation | FR-4 | REST (CRUD breaks, `validateCoverage`) | consumes `VehiclePositionUpdated`, publishes `CoverageWarningRaised` |
| **Routing & Traffic** | Directions proxy, route cache, quota | FR-3, §9 | REST (`getRoute`) — internal only, called by Dispatch/Scheduling | — |
| **Audit** | append-only event log | §8.3.6 | Read-only REST for admins | consumes all events |

**Why this decomposition:** it mirrors the bounded contexts that already
exist conceptually in the Phase 1 code (`geo`/`directionsService` →
Routing & Traffic; `breakScheduler` → Scheduling & Coverage; dispatch logic
in `simStore` → Dispatch & Incidents). Each service can scale and deploy
independently — e.g., GPS ingestion (Fleet & Telemetry) may need to scale
with vehicle count independent of the dashboard's read traffic, while
Routing & Traffic is rate-limited by Google's quota regardless of fleet size.

### 7.3 Development Strategy — Monorepo, Pragmatic Rollout

Full microservices from day one is the right *target* shape, but for a small
team the goal is **development velocity now, scalability later without
rewrites**. The approach:

1. **Monorepo** (Turborepo or Nx) with structure:
   ```
   /apps
     /web              ← current React app (Phase 1, evolves into Phase 2 client)
     /gateway          ← API Gateway / BFF
     /identity-svc
     /fleet-svc
     /dispatch-svc
     /scheduling-svc
     /routing-svc
     /audit-svc
   /packages
     /core-logic        ← geo.ts, breakScheduler.ts — SHARED between web (sim mode)
                            and scheduling-svc (live mode), guaranteeing the
                            coverage algorithm behaves identically in both
     /shared-types      ← TypeScript types/interfaces (Ambulance, Incident, ...),
                            single source of truth for API contracts
     /eslint-config, /tsconfig-base
   ```
2. **Each service is independently deployable** (own Dockerfile, own Cloud
   Run service, own CI pipeline triggered only by changes in its path) —
   this is the "microservices" property that matters for velocity: teams/
   features ship without coordinating a monolith release.
3. **Start with fewer, coarser services** ("macro-services") and split
   further only when a concrete scaling or ownership need appears. Concretely
   for M3 (§16): ship **Identity + Gateway + Dispatch+Scheduling combined**
   (one service, since they share the coverage algorithm and are small) +
   **Routing proxy**. Split Dispatch and Scheduling into separate services
   at M5 once break-schedule write volume or team size justifies it. This
   avoids paying full distributed-systems tax (network calls, retries,
   eventual consistency, distributed tracing) before it's needed, while
   keeping module boundaries (and the `/packages/core-logic` contract)
   clean enough that the split is a "move folder + add HTTP layer" exercise,
   not a redesign.
4. **Communication style**:
    - **Synchronous REST/JSON** (via the Gateway) for request/response flows
      a user is waiting on (login, assign incident, save break schedule).
    - **Async events via Pub/Sub** for fan-out where multiple services react
      to the same fact (`VehiclePositionUpdated` is consumed by Dispatch *and*
      Scheduling *and* Audit). This avoids tight coupling and lets Scheduling's
      coverage re-validation run without blocking the GPS ingestion path.
    - Avoid gRPC/internal service mesh complexity until service count and
      traffic justify it — plain HTTPS + Pub/Sub is sufficient at this scale
      and keeps onboarding fast.
5. **Shared `core-logic` package is the key TDD lever**: the same
   `evaluateCoverageAtMinute`/`validateBreakSchedule` functions tested in
   Phase 1 (§11.3) are imported by `scheduling-svc` in Phase 2. Tests written
   now directly protect Phase 2 correctness — this is the concrete payoff of
   keeping logic pure and decoupled.

**Migration notes (carried over):**
- The Google Maps API key moves server-side into **routing-svc** for
  Directions, while the Maps JS API key (map rendering, inherently public)
  stays client-side with stricter referrer + API restrictions.
- `simStore`'s "tick" logic for *simulation* mode stays in `/apps/web` for
  training/demo purposes; a parallel "live" mode subscribes to real fleet
  state via the Gateway/WSS.
- GPS ingestion is a separate, narrowly-scoped, authenticated endpoint on
  **fleet-svc** (device credentials, not user JWTs) — see §8.4 security.

---

## 8. Security

### 8.1 Phase 1 Security (current scope)

Even though Phase 1 has no real data, it's public-facing, so:

1. **API key restriction** (Google Cloud Console):
    - Restrict the Maps JS API key by **HTTP referrer** to the Firebase
      Hosting domain(s) (`*.web.app`, `*.firebaseapp.com`, custom domain) +
      `localhost` for dev only (remove before/after demo periods if possible).
    - Restrict to only the APIs actually used (Maps JavaScript API, Directions
      API). Disable all unused APIs on the project.

2. **Quota circuit breaker** (already implemented):
    - `directionsService.ts` enforces a daily call cap, cached via
      `localStorage`, with hard fallback to straight-line routes. This is a
      **client-side** mitigation — it does not stop a malicious actor from
      calling the API directly with a stolen key, but it stops *normal usage*
      and *bugs* (e.g., a tick loop accidentally hammering the API) from
      generating cost. The real backstop is #4 below.

3. **Google Cloud Billing controls**:
    - Set a budget alert (e.g., €5/€20/€50 thresholds).
    - Optionally set hard API quotas (Quotas page) per API per day, e.g., cap
      Directions API at a number that corresponds to a few €/month max —
      this *does* stop billing even if the key is stolen, at the cost of the
      app degrading to fallback routes.

4. **Transport & headers**:
    - Firebase Hosting enforces HTTPS by default.
    - Add a `Content-Security-Policy` via `firebase.json` headers, allowing
      only `https://maps.googleapis.com`, `https://*.gstatic.com`,
      `https://fonts.googleapis.com`, `https://fonts.gstatic.com` as external
      sources. Add `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`.

5. **Dependency hygiene**:
    - `npm audit` in CI; Dependabot (or Renovate) for dependency updates.
    - Pin major versions; review before merging automated PRs.

6. **No secrets in client bundle beyond the Maps key**:
    - `.env` is gitignored; `.env.example` documents required vars.
    - CI/CD injects `VITE_GOOGLE_MAPS_API_KEY` from a secret store (GitHub
      Actions secrets / Firebase environment config) — never committed.

7. **XSS**: React's default escaping covers most cases. **No
   `dangerouslySetInnerHTML`** anywhere in the codebase — enforce via lint
   rule (`react/no-danger`).

### 8.2 Phase 2 Security — Authentication & Authorization

1. **JWT-based auth**:
    - Short-lived **access tokens** (e.g., 15 min) + longer-lived **refresh
      tokens** (e.g., 7 days), refresh tokens stored in `httpOnly`,
      `Secure`, `SameSite=Strict` cookies (not localStorage, to mitigate XSS
      token theft).
    - Access tokens passed via `Authorization: Bearer` header.
    - Token issuance/verification: either (a) Firebase Auth (issues its own
      JWTs, verified via Admin SDK in Cloud Functions) — least ops overhead,
      or (b) custom auth service (e.g., using `jose`/`jsonwebtoken` +
      Cloud SQL/Firestore for users) if the operator needs integration with
      an existing identity system. **Decision deferred** — see ADR-004 stub
      in §15.

2. **RBAC roles** (initial set):
    - `admin` — manage users, bases, coverage zones, view audit logs.
    - `dispatcher` — view live fleet, assign/reassign incidents, edit break
      schedules.
    - `viewer` — read-only dashboard (e.g., for CEO).
    - Role claims embedded in JWT; backend enforces per-endpoint role checks
      (never trust client-side role display for authorization).

3. **Password/credential handling** (if not using Firebase Auth's managed
   flows): bcrypt/argon2 hashing, rate-limited login attempts, account
   lockout policy, MFA optional for `admin` role.

### 8.3 Phase 2 Security — API & Data

1. **Input validation**: every backend endpoint validates request bodies
   with a schema library (`zod`), rejecting unknown fields. Never trust
   client-supplied IDs for authorization decisions — derive from JWT.
2. **CORS**: explicit allowlist of frontend origins; no `*`.
3. **Rate limiting**: per-user and per-IP rate limits on all endpoints,
   stricter on auth endpoints (login, refresh) to mitigate brute force.
4. **Encryption at rest**: Firestore/Cloud SQL default encryption is a
   baseline; for any future patient-related fields, evaluate
   **field-level encryption** (e.g., via Cloud KMS envelope encryption)
   in addition.
5. **Secrets management**: Google Secret Manager for all backend secrets
   (DB credentials, JWT signing keys, server-side Maps API key). Keys
   rotated on a schedule (e.g., 90 days) and on personnel changes.
6. **Audit logging**: append-only log of who-did-what-when for incident
   reassignments, break schedule edits, user management actions. Stored
   separately from operational data, retention policy TBD with legal.
7. **Environment separation**: separate Firebase/GCP projects for
   `dev`, `staging`, `prod` — separate API keys, separate IAM, no
   prod data in lower environments.
8. **Service-to-service authentication**: internal calls (Gateway →
   services, service → Routing proxy) use **signed service-account tokens**
   (Cloud Run's built-in IAM-based service-to-service auth via
   `Authorization: Bearer <ID token>`, verified automatically by Cloud Run)
   rather than shared API keys. Each service's Cloud Run ingress is set to
   "internal only" except the Gateway, which is the sole public entry point.
   This keeps the "many services" surface area from becoming "many public
   attack surfaces."
9. **Event bus security**: Pub/Sub topics use IAM to restrict which service
   accounts may publish/subscribe per topic (e.g., only Fleet & Telemetry can
   publish `VehiclePositionUpdated`); event payloads validated against a
   shared schema from `/packages/shared-types` before processing.

### 8.4 Phase 2 Security — GPS Ingestion

1. **Device authentication**: each vehicle telematics unit authenticates
   with its own credential (per-device API key or mTLS client cert) —
   **not** a shared secret, and **not** a user JWT.
2. **Payload validation**: strict schema (lat/lng bounds checked against
   Catalonia bounding box, timestamp freshness checks to reject
   replayed/stale data, speed sanity checks to flag GPS spoofing).
3. **Least privilege**: ingestion endpoint can only write to that device's
   own fleet-position record — enforced server-side by device-ID-to-vehicle
   mapping, not by trusting a client-supplied vehicle ID.

### 8.5 Legal & Compliance (future consideration)

> Flagged as a **future consideration** per stakeholder decision — not a
> Phase 1/2 blocker, but the architecture above (RBAC, audit logs, field-level
> encryption readiness, environment separation) is intentionally chosen so
> that when this becomes urgent, it's a configuration/process change rather
> than a re-architecture.

- **GDPR / Spanish LOPDGDD**: applies the moment any real personal data
  (vehicle GPS tied to a person, employee schedules, patient data) enters
  the system. Patient health data is "special category data" (GDPR Art. 9)
  — would require a **DPIA (Data Protection Impact Assessment)** and likely
  its own PRD addendum before implementation.
- If the operator ever contracts with the public Catalan health system
  (CatSalut/SEM), **ENS (Esquema Nacional de Seguridad)** security
  categorization may apply to any integrated system.
- Data residency: prefer `europe-west` GCP/Firebase regions for any
  persistent data once real data is introduced.
- Employee break/schedule data intersects with Spanish labor law
  record-keeping requirements — relevant if break schedules become the
  system of record (not just simulation).

---

## 9. Cost & Quota Management (Google Maps Platform)

| Mitigation | Phase | Status |
|---|---|---|
| HTTP referrer restriction on API key | 1 | To do (manual GCP step) |
| Per-API enablement (disable unused APIs) | 1 | To do |
| Client-side daily quota cap + cache | 1 | ✅ Implemented (`directionsService.ts`) |
| Billing budget alerts | 1 | To do (manual GCP step) |
| GCP API-level hard quotas | 1 | Recommended, to do |
| Server-side Directions proxy (key never in client) | 2 | Designed for, not yet built |
| Per-user/org quota enforcement | 2 | Designed for, not yet built |

**Current free-tier reality** (subject to Google's pricing, verify before
launch): Dynamic Maps ~10,000 loads/month free; Directions (traffic-aware)
~5,000 requests/month free; $200/month platform credit. The implemented
client-side cap (default 150 Directions calls/day ≈ 4,500/month) keeps a
single demo instance comfortably under the free Directions allowance even
with the cache disabled, and the 12h route cache reduces real calls further
under normal use.

---

## 10. Data Model

### 10.1 Phase 1 (in-memory, client-only)

Already implemented in `src/types/index.ts`:
`Ambulance`, `Base`, `BreakWindow`, `Incident`, `CoverageZone`,
`SimulationState`. These types are **designed to be the contract** that
Phase 2 entities map onto — e.g., `Ambulance.position` becomes
server-pushed real-time data instead of simulation-computed.

### 10.2 Phase 2 (proposed persistent schema — draft, database-per-service)

Each service owns its tables/collections exclusively — no service reads
another's database directly; cross-service data needs go through the
Gateway's REST calls or the event bus (denormalized local copies where
useful, e.g., Dispatch keeps a lightweight cache of vehicle call signs).

```
identity-svc DB:
  users            { id, email, passwordHash?, role, createdAt, lastLoginAt }

fleet-svc DB:
  vehicles         { id, callSign, homeBaseId, deviceCredentialId, active }
  bases            { id, name, position, ... }  // from locations.ts
  vehiclePositions { vehicleId, position, recordedAt, source: 'gps'|'sim' }  // time-series

dispatch-svc DB:
  incidents        { id, position, priority, status, assignedVehicleId,
                     createdAt, resolvedAt, createdBy }

scheduling-svc DB:
  coverageZones    { id, center, requiredAmbulances, targetResponseMinutes }
  breakWindows     { id, vehicleId, startAt, durationMinutes, createdBy, coverageOk }

routing-svc DB (cache only, no PII):
  routeCache       { cacheKey, path, trafficModel, cachedAt }
  quotaCounters    { date, count }

audit-svc DB:
  auditLog         { id, actorUserId, action, targetType, targetId, timestamp, metadata }
```

`vehiclePositions` is a time-series collection — for Firestore, consider a
subcollection per vehicle with TTL/archival policy; for Postgres, a
hypertable (TimescaleDB) if volume grows. If `fleet-svc` and
`scheduling-svc` both run on Firestore initially, that's fine — "database
per service" means *logical* isolation (separate projects/databases or at
minimum separate top-level collections with service-exclusive IAM), not
necessarily different DB technologies from day one. Polyglot persistence
(e.g., Postgres/TimescaleDB for `fleet-svc` once GPS volume grows) is an
option per ADR-005, applied per-service without affecting others.

---

## 11. Testing Strategy (TDD)

This is the section that should guide **how you write the next line of
code**. The codebase is already structured to support this:

- `src/utils/geo.ts`, `src/utils/breakScheduler.ts`,
  `src/utils/directionsService.ts` — **pure or near-pure functions**, zero
  React, zero DOM. These are your primary TDD targets.
- `src/store/simStore.ts` — Zustand store, testable in isolation by importing
  the hook and calling actions directly (no rendering needed).
- `src/components/*` — React components, tested via React Testing Library.

### 11.1 Test Pyramid

```
        ▲
        │  E2E (Playwright)        — few, slow, high confidence
        │  ─────────────────
        │  Integration (store +    — moderate count
        │  components, RTL)
        │  ─────────────────
        │  Unit (Vitest)           — many, fast, pure logic
        ▼  ─────────────────
```

### 11.2 Tooling

| Layer | Tool | Rationale |
|---|---|---|
| Unit | **Vitest** | Already Vite-based project; near-zero config, Jest-compatible API. |
| Component/Integration | **React Testing Library** + Vitest | Test components by behavior, not implementation. |
| Mocking Google Maps | Custom `window.google.maps` stub module | Avoids loading real Maps JS in tests; `directionsService` already checks `window.google?.maps` so a stub controls all three code paths (no-sdk, api, fallback). |
| E2E | **Playwright** | Cross-browser, can run against `npm run preview` build; mock network calls to `maps.googleapis.com` via route interception. |
| Coverage | Vitest `--coverage` (v8) | Target ≥85% for `src/utils` and `src/store`, ≥60% overall initially. |
| CI | GitHub Actions | `npm run test`, `npm run typecheck`, `npm run build`, `npm audit` on every PR. |

### 11.3 First TDD Targets (suggested order)

These map to existing modules — write tests **first**, then refactor/extend
implementation to satisfy them. Good starting point because the logic
already exists and can be "characterized" with tests before you change it:

1. **`geo.ts`**
    - `distanceMeters`: known coordinate pairs → known distances (e.g.,
      Eixample base to Vila Olímpica base ≈ X meters, tolerance ±5%).
    - `trafficFactorForTime`: rush-hour minute → factor < off-peak minute
      factor; bounds always in `[0.3, 1]`.
    - `coverageRadius`: monotonic with `trafficFactor`.

2. **`breakScheduler.ts`**
    - `isAvailableAt`: ambulance with break [60,90) → unavailable at minute
      75, available at minute 59 and 90.
    - `evaluateCoverageAtMinute`: construct a fleet where one zone is
      under-resourced → expect a `CoverageWarning` for that zone.
    - `generateAutoBreakSchedule`: for N=8, max simultaneous on break ≤ 2;
      no break overlaps a rush-hour minute.
    - `validateBreakSchedule`: a schedule that puts >required ambulances on
      break simultaneously during a zone's required window → produces
      warnings; a "safe" schedule → zero warnings.

3. **`directionsService.ts`**
    - Cache hit returns `source: 'cache'` without incrementing quota.
    - Quota exhaustion returns `source: 'fallback_straight_line'` and the
      path is exactly `[origin, destination]`.
    - No SDK (`window.google` undefined) returns `source: 'fallback_no_sdk'`.
    - Quota counter persists across calls within the same day and resets on
      date change (mock `Date`/localStorage).

4. **`simStore.ts`**
    - `addBreak` + `validateCoverage` → conflicting break is flagged
      `coverageOk: false`.
    - `tick` moves an `en_route` ambulance along its `routePath` proportional
      to `trafficFactor × deltaMinutes`.
    - Incident dispatch: pending incident gets assigned to the *closest*
      available ambulance, not an on-break or busy one.

5. **Component tests** (after store logic is solid):
    - `BreaksPanel`: adding a break via the form calls `addBreak` with correct
      args; conflict badge renders when `coverageWarnings` non-empty.
    - `SimulationControls`: language switch updates rendered text (i18n
      smoke test in all 3 languages).

### 11.4 Example Test Skeleton

```ts
// src/utils/__tests__/breakScheduler.test.ts
import { describe, it, expect } from 'vitest';
import { isAvailableAt, evaluateCoverageAtMinute } from '../breakScheduler';
import type { Ambulance, CoverageZone } from '../../types';

describe('isAvailableAt', () => {
  it('returns false during a scheduled break window', () => {
    const amb = makeAmbulance({ breaks: [{ id: 'b1', ambulanceId: 'a1', startMinute: 60, durationMinutes: 30, coverageOk: true }] });
    expect(isAvailableAt(amb, 75)).toBe(false);
    expect(isAvailableAt(amb, 59)).toBe(true);
    expect(isAvailableAt(amb, 90)).toBe(true); // end-exclusive
  });
});

describe('evaluateCoverageAtMinute', () => {
  it('flags a zone as under-covered when all nearby units are on break', () => {
    // arrange fleet + zone such that the only ambulance in range is on break at minute 75
    // act
    const warnings = evaluateCoverageAtMinute(ambulances, zones, 75, 0.8);
    // assert
    expect(warnings).toHaveLength(1);
    expect(warnings[0].zoneId).toBe('zone-gracia');
  });
});
```

### 11.5 CI Gate (proposed `.github/workflows/ci.yml` outline)

```
on: [pull_request, push to main]
jobs:
  test:
    - npm ci
    - npm run lint
    - npm run typecheck      # tsc --noEmit
    - npm run test -- --coverage
    - npm run build
    - npm audit --audit-level=high
```

Merge blocked if any step fails. Coverage thresholds enforced via
`vitest.config.ts` (`coverage.thresholds`).

### 11.6 Contract Testing (Phase 2, microservices)

Once `/apps/web` and backend services communicate over HTTP/events, the risk
shifts from "does this function work" to "do these two services agree on the
shape of data." Mitigate with:

- **Shared types as the contract**: every request/response and event payload
  type lives in `/packages/shared-types`, imported by both producer and
  consumer — a breaking change is a TypeScript compile error in CI for the
  *other* service's build, caught before merge.
- **Consumer-driven contract tests** (Pact, or a lightweight in-house
  equivalent) for the Gateway↔service and event boundaries that cross repo/
  deploy boundaries — each service's CI verifies it still satisfies contracts
  recorded by its consumers.
- **`/packages/core-logic` parity tests**: a test suite that runs the *same*
  coverage-validation fixtures against both the Phase 1 simulation path and
  the `scheduling-svc` implementation, asserting identical results — this is
  what guarantees "the demo's coverage guarantee is the same guarantee the
  live system makes."

---

## 12. Deployment & Environments

| Env | Purpose | Hosting |
|---|---|---|
| `dev` (local) | Local development, `.env` with personal/test Maps key | Vite dev server; backend services run via `docker-compose` or `turbo dev` for local-only integration |
| `staging` | PR previews / CEO demos | Firebase Hosting preview channels (`firebase hosting:channel:deploy`) for `/apps/web`; each backend service deploys a `staging` Cloud Run revision, gated on changes to its own path |
| `prod` | Public demo (Phase 1) / live ops (Phase 2) | Firebase Hosting main channel + per-service Cloud Run `prod` revisions |

Phase 2 CI/CD: monorepo (Turborepo/Nx) computes which `/apps/*` packages
changed per PR and **only builds/deploys those** — this is the practical
"fast and efficient" payoff of the service split: a fix to `routing-svc`
deploys in minutes without touching `identity-svc` or the frontend. Each
service has its own GCP project/IAM per environment, no shared credentials
across environments.

---

## 13. Observability

- **Phase 1**: minimal — `routeSource` field already gives visibility into
  cache/quota/fallback behavior; surface a small debug panel (dev-only) showing
  current quota usage (`getQuotaStatus()`).
- **Phase 2**: structured logging (JSON) from each Cloud Run service, error
  tracking (e.g., Sentry), uptime checks on critical endpoints, dashboards for
  Directions API quota usage (server-side now, in `routing-svc`), GPS
  ingestion freshness (alert if a vehicle hasn't reported in N minutes).
  **Distributed tracing (OpenTelemetry)** with a correlation/request ID
  propagated from the Gateway through every downstream service call and
  event — without this, debugging "why was this incident assigned to the
  wrong ambulance" across 3 services becomes very slow. Treat trace
  propagation as part of the Gateway's contract from M3, not an
  afterthought.

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Google Maps cost overrun from public demo | Medium | Quota cap + budget alerts + GCP hard quotas (§9) |
| Coverage algorithm gives false confidence (sampling interval too coarse) | High (Phase 2) | Unit tests with edge cases at exact sample boundaries; consider event-based validation (check at every break start/end, not just 5-min grid) before Phase 2 go-live |
| Phase 2 never happens, Phase 1 code accumulates "simulation-only" shortcuts | Medium | Enforce the pure-logic/UI separation now via tests (§11); review before any "quick hack" that couples logic to `window.google` or React |
| JWT/auth implementation done insecurely under time pressure | High (Phase 2) | Prefer managed auth (Firebase Auth) over hand-rolled JWT unless a strong reason exists; security review before prod |
| GDPR exposure if patient data added without DPIA | High (future) | Hard gate: no patient-identifiable fields merged without a DPIA + legal sign-off, tracked as a separate PRD addendum |
| Premature microservices overhead slows a small team | Medium | Start with "macro-services" per §7.3 (fewer, coarser services); split only when justified. Shared `/packages/core-logic` and `shared-types` keep splits cheap later. |
| Cross-service inconsistency (e.g., coverage check in sim vs. live disagree) | High (Phase 2) | `/packages/core-logic` parity tests (§11.6) run in CI for both `/apps/web` and `scheduling-svc` against the same fixtures |

---

## 15. Architecture Decision Records (stubs — to formalize as ADR-00X)

- **ADR-001**: Pure-logic modules (`src/utils`) have no React/DOM dependency
  — enables TDD without browser. *(Already followed.)*
- **ADR-002**: Routing goes through `directionsService.ts` with
  cache→quota→fallback chain, never called directly from components.
  *(Already implemented.)*
- **ADR-003**: Phase 1 has no backend; any "persistence" is ephemeral
  (localStorage for cache/quota only, not user data).
- **ADR-004 (open)**: Phase 2 auth provider — Firebase Auth vs. custom JWT
  service. **Decision deferred** until CEO commitment is confirmed and any
  existing identity systems are known.
- **ADR-005 (open)**: Phase 2 datastore — Firestore (fast to ship, NoSQL) vs.
  Postgres/Cloud SQL (better for time-series GPS + relational audit queries).
  Leaning Firestore for MVP backend, revisit if GPS time-series volume is high.
  Decided per-service (§10.2) — not a single global choice.
- **ADR-006**: Phase 2 adopts a **microservices architecture decomposed by
  bounded context** (Identity, Fleet & Telemetry, Dispatch & Incidents,
  Scheduling & Coverage, Routing & Traffic, Audit), behind a single API
  Gateway/BFF. *(This PRD revision — see §7.2/7.3.)*
- **ADR-007**: Codebase organized as a **monorepo** (Turborepo or Nx) with
  `/apps/*` per service+frontend and `/packages/core-logic` +
  `/packages/shared-types` shared by frontend (sim) and backend (live), to
  keep the coverage-validation guarantee identical across both. CI builds/
  deploys only changed packages.
- **ADR-008**: Rollout starts with **"macro-services"** (Identity+Gateway,
  combined Dispatch+Scheduling, Routing proxy) rather than the full 6-service
  decomposition on day one; split further at M5 per §7.3 point 3. Module
  boundaries and `/packages/core-logic` are kept clean from the start so the
  split is low-cost when it happens.
- **ADR-009**: Inter-service communication is **synchronous REST/JSON via
  the Gateway** for user-waited operations, and **async Pub/Sub events** for
  fan-out (`VehiclePositionUpdated`, `CoverageWarningRaised`, etc.). No gRPC/
  service mesh until justified by service count/traffic.

---

## 16. Roadmap

| Milestone | Scope |
|---|---|
| **M0** (now) | This PRD, finalize Phase 1 codebase, write test suite per §11, extract `/packages/core-logic` + `/packages/shared-types` from `src/utils`/`src/types` as a first monorepo step (low-risk, no behavior change) |
| **M1** | Phase 1 polished demo deployed to Firebase, GCP security hardening (§8.1) applied |
| **M2** | CEO demo & feedback; go/no-go on Phase 2 |
| **M3** (if go) | ADR-004/005 decisions; monorepo scaffolding (Turborepo/Nx); ship macro-services per ADR-008 (Identity+Gateway, Dispatch+Scheduling, Routing proxy), each with its own CI/CD, TDD from day one, contract tests (§11.6) |
| **M4** | Real GPS ingestion (single pilot vehicle) into Fleet & Telemetry, live dashboard mode alongside simulation mode, event bus (Pub/Sub) introduced for `VehiclePositionUpdated` |
| **M5** | Multi-user RBAC, audit logging (Audit service), staging/prod environment separation; split Dispatch and Scheduling into independent services if justified (§7.3) |
| **M6** (separate track) | Patient-data DPIA + addendum PRD, if/when needed |

---

## 17. Open Questions

1. Does the operator have an existing identity provider (for SSO) that
   Phase 2 auth should integrate with, or is a fresh user base acceptable?
2. What telematics hardware do the vehicles use (determines GPS ingestion
   protocol — MQTT, HTTP webhook, proprietary SDK)?
3. Target response times and required-ambulance counts per zone (§5, FR-4.2)
   are currently illustrative — need real operational input from the
   operator for Phase 2 to be meaningful.
4. Is there an existing CAD/dispatch system this would need to integrate
   with, or does SACS become the dispatch system of record?

---

## Appendix A: Glossary

- **SEM**: Sistema d'Emergències Mèdiques (Catalan public EMS system — name
  used for inspiration in base locations, not implying affiliation).
- **Coverage zone**: a geographic area with a minimum-ambulances-within-time
  requirement.
- **Traffic factor**: 0.3–1.0 multiplier on free-flow speed representing
  congestion.
- **Route source**: provenance tag (`cache`/`api`/`fallback_*`) for a
  computed route, used for cost observability.