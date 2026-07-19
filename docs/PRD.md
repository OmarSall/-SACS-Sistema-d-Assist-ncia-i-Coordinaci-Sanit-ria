# PRD — SACS: Sistema d'Assistència i Coordinació Sanitària
## Ambulance Dispatch Simulation & Operations Platform

| | |
|---|---|
| **Status** | Living Document v2.0 |
| **Owner** | Omar Salloum |
| **Stakeholder** | Private ambulance operator (Catalonia) |
| **Last updated** | 2026-07-19 |
| **Audience** | Engineering team, future contributors, CEO/ops stakeholder |

---

## 1. Executive Summary

SACS is a web application for simulating and (eventually) operating ambulance
dispatch logistics for a private ambulance fleet operating in Barcelona and
the surrounding Catalonia region. It visualizes fleet positions on a live
traffic-aware map, simulates incident dispatch, and provides a break-scheduling
tool that **guarantees minimum coverage** of designated zones at all times.

The project is being built in two deliberate phases:

- **Phase 1 (complete)** — A fully client-side simulation (React + Google Maps
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
4. Simulate full ambulance lifecycle: dispatch → on scene → transport to
   nearest hospital → return to base.
5. Provide a break-scheduling tool that **proves** (via simulation sampling)
   that scheduled breaks never violate minimum coverage requirements for
   defined zones.
6. Full i18n: Catalan, Spanish, English.
7. Deployable by anyone (Firebase Hosting), cheap to run (stay within Google
   Maps free tier under normal demo usage).
8. Codebase structured so Phase 2 (backend, auth, real data) is an additive
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
  browser-local (directions cache, quota counter).
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
| **Developer** | 1 & 2 | Needs a codebase that's testable, incrementally extendable, and doesn't accumulate "simulation-only" assumptions that block real data. |

---

## 4. Scope Summary

| Capability | Phase 1 | Phase 2 |
|---|---|---|
| Map + traffic visualization | ✅ Implemented | ✅ |
| Simulated incidents & dispatch | ✅ Implemented | Real incidents (from CAD/manual entry) |
| Break scheduling + coverage validation | ✅ Implemented | ✅ (against real fleet state) |
| Real road routing (Directions API) | ✅ Implemented (cached, quota-limited, polling) | ✅ (server-side proxy) |
| Hospital routing (incident → nearest hospital → base) | ✅ Implemented | ✅ |
| Real-time Barcelona clock (HH:MM:SS) | ✅ Implemented | ✅ |
| Curated incident locations (land only) | ✅ Implemented | Real CAD incidents |
| i18n (CA/ES/EN) | ✅ Implemented | ✅ |
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
- FR-1.2: Each unit shows status (idle, en_route, on_scene, transporting,
  returning, on_break) via color-coded marker rendered as HTML overlay
  (OverlayViewF) with unit number visible.
- FR-1.3: Toggle Google Maps TrafficLayer on/off.
- FR-1.4: Display a "coverage radius" circle per ambulance, sized by current
  traffic-adjusted reachable distance within a target time (default 8 min).
- FR-1.5: Display coverage zone markers (8 zones) as small circles on the map.
- FR-1.6: Display active incident markers as colored diamonds by priority.

### FR-2: Simulation Engine
- FR-2.1: Time-based simulation, adjustable speed (1x/2x/5x/10x). Simulation
  operates 24/7 — no artificial shift boundaries.
- FR-2.2: Traffic factor model varies by simulated time-of-day (rush hours
  07:30–09:30, 17:00–19:00) and by selected traffic model
  (best_guess/pessimistic/optimistic). Minutes are counted from midnight.
- FR-2.3: Random incident generator with priority levels (critical, urgent,
  standard), each with realistic label text in 3 languages.
- FR-2.4: Nearest-available-unit dispatch: closest idle/returning ambulance
  (not on break) assigned to pending incidents.
- FR-2.5: Ambulance state machine:
  `idle → en_route → on_scene → transporting → returning → idle`
  with `on_break` interrupting any non-en_route state.
- FR-2.6: "Start/Continue/Pause" button label reflects simulation state
  correctly (Continue shown when paused mid-run).

### FR-3: Routing
- FR-3.1: Real road-network routes via Google Directions API with
  `drivingOptions.trafficModel`.
- FR-3.2: **Route caching** (12h TTL, ~100m coordinate rounding) to avoid
  redundant API calls. Cache persists in localStorage.
- FR-3.3: **Daily quota cap** on Directions API calls (default 300/day,
  configurable via `VITE_DIRECTIONS_DAILY_LIMIT` env var), tracked in
  localStorage. Quota counter displayed in UI with color-coded warning.
- FR-3.4: **Graceful fallback** to straight-line routes when: SDK not loaded,
  quota exceeded, or API error — simulation must never block or crash on
  routing failure.
- FR-3.5: Each ambulance's route carries a `routeSource` tag
  (`cache`/`api`/`fallback_straight_line`/`fallback_no_sdk`).
- FR-3.6: Route upgrade polling (every 3s) reads store directly via
  `useSimStore.getState()` — does NOT trigger on ambulance state changes to
  prevent infinite loops. `upgradingRef` Set prevents duplicate concurrent
  API calls per ambulance.
- FR-3.7: When upgrading to a real route, ambulance progress is preserved by
  finding the closest point on the new route to current position — no
  teleportation back to route start.

### FR-4: Break Scheduling & Coverage Guarantee
- FR-4.1: Each ambulance can have 0..N break windows (start minute + duration).
- FR-4.2: **Coverage zones** (8 defined, real Barcelona-area neighborhoods)
  each have `requiredAmbulances` and `targetResponseMinutes`.
- FR-4.3: `validateCoverage()` samples the entire 24h day at 5-minute
  intervals, checking for each zone whether the count of available
  (not-on-break) ambulances within `targetResponseMinutes` ≥
  `requiredAmbulances`.
- FR-4.4: Any violation is surfaced as a `CoverageWarning` and breaks
  contributing to violations are flagged `coverageOk: false` in the UI.
- FR-4.5: `autoSchedule()` generates a baseline schedule: 30-min breaks,
  max `floor(N/4)` ambulances on break simultaneously, outside rush hours.
- FR-4.6: Manual break add/remove. Validation runs explicitly on user request
  (not automatically on each add/remove to avoid confusing UX).

### FR-5: Incidents Panel
- FR-5.1: List of generated incidents (priority, status, assigned unit,
  creation time), most recent first, capped display at 12.
- FR-5.2: Generate random incident button available in both SimulationControls
  and IncidentsPanel.

### FR-6: Internationalization
- FR-6.1: Full UI translation CA/ES/EN via i18next, runtime-switchable.
- FR-6.2: All zone/base names, status labels, priority labels, and incident
  labels translated.
- FR-6.3: Language preference persisted in localStorage via
  i18next-browser-languagedetector.

### FR-7: Hospital Routing
- FR-7.1: After arriving on scene, ambulance transports patient to the
  **nearest hospital** (not home base), computed via `distanceMeters` from
  `@sacs/core-logic` against `HOSPITALS` list in `locations.ts`.
- FR-7.2: After dropping patient at hospital, ambulance returns to its
  home base.
- FR-7.3: Full cycle: `idle → en_route → on_scene → transporting (→ hospital)
  → returning (→ base) → idle`.
- FR-7.4: Eight hospitals defined across Barcelona metro area:
  Hospital Clínic, Vall d'Hebron, Hospital del Mar, Bellvitge,
  Hospital Municipal de Badalona, Sant Pau, Consorci Sanitari de Terrassa,
  Parc Taulí Sabadell.
- FR-7.5: Arrival detection at hospital uses `distanceMeters < 500m` threshold
  to distinguish hospital arrival from base arrival during `returning` state.

### FR-8: Simulation Clock
- FR-8.1: Clock displays HH:MM:SS format including seconds.
- FR-8.2: On initialization, clock is set to current real time in
  Barcelona (Europe/Madrid timezone, CET/CEST auto-handled via
  `Intl.DateTimeFormat`).
- FR-8.3: No artificial shift start/end constraints — simulation runs 24/7
  matching real private ambulance operations.
- FR-8.4: `simMinute` represents minutes from midnight (not from 06:00).
  Traffic model uses same convention.

### FR-9: Incident Locations
- FR-9.1: Random incidents generated from a curated list of ~35 real urban
  locations across Barcelona metro area (`INCIDENT_LOCATIONS` in
  `locations.ts`).
- FR-9.2: All locations verified to be on land — no sea/water coordinates.
- FR-9.3: Locations cover: Barcelona districts (Gòtic, Eixample, Gràcia,
  Sants, Poblenou, Nou Barris, Sant Andreu, Guinardó, Horta, Les Corts),
  L'Hospitalet, Badalona, Sant Cugat, Castelldefels, Sabadell, Cornellà,
  Esplugues, El Prat, Viladecans, Gavà.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Simulation tick at 1Hz must not cause UI jank with 8 ambulances + 8 zones + N incidents. Map re-renders use OverlayViewF (HTML overlays) instead of deprecated Marker API. |
| **Cost control** | Stay within Google Maps free tier under normal demo load (see §9). Hard client-side quota cap as a circuit breaker. Quota visible in UI. |
| **Availability** | Phase 1: static hosting, effectively 99.95%+ (Firebase Hosting SLA). Phase 2: backend SLA TBD. |
| **Browser support** | Latest 2 versions of Chrome, Firefox, Safari, Edge. Mobile responsive (tablet dispatcher use case). |
| **Accessibility** | WCAG 2.1 AA target for Phase 2 dispatcher UI. Phase 1: best-effort. |
| **i18n** | No hardcoded user-facing strings outside i18n resource files. |
| **Maintainability** | Pure functions for simulation math (geo, traffic, coverage) — fully unit-testable without DOM or network. Single `distanceMeters` implementation in `@sacs/core-logic` shared across all consumers (DRY). |
| **Testability** | All business logic decoupled from React components and from `window.google.maps`. |
| **Route upgrade safety** | Polling every 3s reads store directly via `useSimStore.getState()` — never reactive to ambulance changes. `upgradingRef` prevents duplicate calls. Always writes `routeSource` after getRoute (even fallback) to stop retry loops. |
| **API quota safety** | Hard daily cap in localStorage, circuit breaker pattern, straight-line fallback when quota exhausted. Quota counter displayed in UI (`API: X/Y`), red when < 20 remaining. |

---

## 7. System Architecture

### 7.1 Phase 1 Architecture (implemented)

```
┌────────────────────────────────────────────────────────┐
│ Browser (Client)                                         │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ React UI      │  │ Zustand Store│  │ i18next       │  │
│  │ (components)  │◄─┤ (simStore)   │  │ (CA/ES/EN)    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘  │
│         │                 │                              │
│         │          ┌──────▼──────────┐                   │
│         │          │ @sacs/core-logic │                   │
│         │          │ geo.ts           │                   │
│         │          │ breakScheduler   │                   │
│         │          └──────┬──────────┘                   │
│         │                 │                              │
│         │    ┌────────────▼──────────────┐               │
│         │    │ directionsService.ts       │               │
│         │    │ (cache → quota → fallback) │               │
│         │    └────────────┬──────────────┘               │
│         │                 │                              │
│  ┌──────▼─────────────────▼──────────┐                   │
│  │ @react-google-maps/api             │                   │
│  │ GoogleMap, OverlayViewF, Polyline, │                   │
│  │ Circle, TrafficLayer               │                   │
│  └───────────────┬───────────────────┘                   │
│                  │                                       │
│  localStorage ◄──┤ (route cache, quota counter)          │
└──────────────────┼───────────────────────────────────────┘
                   ▼
         Google Maps Platform
         (Maps JS API + Directions API)

Hosting: Firebase Hosting (static SPA)
```

**Monorepo structure (Turborepo + npm workspaces):**
```
sacs/
├── apps/
│   └── web/                    ← React 18 + Vite + Zustand + Google Maps
│       └── src/
│           ├── components/     ← SimulationControls, FleetPanel, BreaksPanel,
│           │                      CoveragePanel, IncidentsPanel, MapView
│           ├── store/          ← simStore.ts (Zustand)
│           ├── data/           ← locations.ts (bases, zones, hospitals,
│           │                      incident locations, findNearestHospital)
│           ├── utils/          ← directionsService.ts (cache+quota+fallback)
│           └── i18n/           ← ca.ts, es.ts, en.ts, index.ts
├── packages/
│   ├── core-logic/             ← geo.ts, breakScheduler.ts (22 tests)
│   └── shared-types/           ← TypeScript contracts + domain events
└── docs/
    └── PRD.md                  ← this document
```

**Key architectural principles for Phase 1:**
- Business logic (`core-logic`, `simStore`) has **zero React dependencies**.
- `distanceMeters` from `@sacs/core-logic` is the **single Haversine
  implementation** used everywhere (simStore, locations.ts) — no local copies.
- Google Maps SDK accessed only through `directionsService.ts` adapter and
  `@react-google-maps/api` components.
- Route upgrade logic reads store via `useSimStore.getState()` (escape hatch),
  never via React props, to avoid reactive loops.

### 7.2 Phase 2 Architecture — Microservices

Phase 2 is decomposed into **bounded contexts**, each owned by a small
service with its own data store (database-per-service). The frontend never
talks to services directly — everything goes through an **API Gateway / BFF**.

```
┌─────────────────────────┐
│ Browser (Client)          │
│  React UI + Zustand       │
│  (same core-logic libs,    │
│   now fed by real data)    │
└────────────┬──────────────┘
             │ HTTPS (REST/JSON), WSS for live updates
             ▼
┌────────────────────────────────────────────────────────────┐
│ API Gateway / BFF  (Cloud Run)                               │
│  JWT verification · RBAC · Rate limiting · CORS              │
└──┬──────────┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
Identity  Fleet &    Dispatch &  Scheduling  Routing &
Service   Telemetry  Incidents   & Coverage  Traffic
          Service    Service     Service     Service
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
 Auth DB   Fleet DB  Dispatch DB Schedule DB  Cache DB
           (time-series)

        ◄────── Event Bus (Pub/Sub) ──────►
  VehiclePositionUpdated · IncidentCreated · IncidentAssigned
  BreakScheduleChanged · CoverageWarningRaised → Audit Service
```

| Service | Owns | Sync API | Async events |
|---|---|---|---|
| **Identity** | users, roles, sessions | REST (login, refresh, user CRUD) | `UserRoleChanged` |
| **Fleet & Telemetry** | vehicles, positions, GPS ingest | REST (vehicle CRUD, positions) | publishes `VehiclePositionUpdated` |
| **Dispatch & Incidents** | incidents, assignment state machine | REST (create/assign/resolve) | consumes `VehiclePositionUpdated`; publishes `IncidentCreated`/`IncidentAssigned` |
| **Scheduling & Coverage** | break windows, coverage zones | REST (CRUD breaks, `validateCoverage`) | consumes `VehiclePositionUpdated`, publishes `CoverageWarningRaised` |
| **Routing & Traffic** | Directions proxy, route cache, quota | REST (`getRoute`) — internal only | — |
| **Audit** | append-only event log | Read-only REST for admins | consumes all events |

### 7.3 Development Strategy — Monorepo, Pragmatic Rollout

1. **Monorepo** (Turborepo) — already established. Phase 2 adds `/apps/gateway`,
   `/apps/identity-svc`, etc. alongside existing `/apps/web`.
2. **Each service independently deployable** — own Dockerfile, own Cloud Run
   service, own CI pipeline.
3. **Start with macro-services** (Identity+Gateway combined, Dispatch+Scheduling
   combined, Routing proxy) — avoid distributed-systems tax before it's justified.
4. **Communication**: synchronous REST/JSON for user-waited operations,
   async Pub/Sub for fan-out. No gRPC until justified.
5. **`core-logic` parity**: same `evaluateCoverageAtMinute`/
   `validateBreakSchedule` imported by both `/apps/web` (sim) and
   `scheduling-svc` (live). Tests written now protect Phase 2 correctness.

**Migration notes:**
- Directions API key moves server-side into `routing-svc`.
- Maps JS API key (inherently public) stays client-side with stricter restrictions.
- `simStore` tick logic stays for training/demo; parallel "live" mode subscribes
  to real fleet state via Gateway WebSocket.
- GPS ingestion: separate endpoint on `fleet-svc` with per-device credentials.

---

## 8. Security

### 8.1 Phase 1 Security (implemented / to do)

1. **API key restriction** (Google Cloud Console):
    - Restrict Maps JS key by HTTP referrer to Firebase Hosting domains +
      `localhost:5173`, `localhost:4173` for dev.
    - Restrict to Maps JavaScript API + Directions API only.

2. **Quota circuit breaker** (implemented in `directionsService.ts`):
    - Daily call cap in localStorage (`sacs_directions_quota_v1`), configurable
      via `VITE_DIRECTIONS_DAILY_LIMIT` (default 300).
    - `upgradingRef` Set prevents duplicate concurrent calls per ambulance.
    - Always writes `routeSource` after `getRoute` (even on fallback) to prevent
      infinite retry loops.
    - Fallback to straight-line routes — simulation never blocks.
    - UI displays `API: X/Y` counter, red when < 20 remaining.

3. **Google Cloud Billing controls**:
    - Budget alert set (€5 threshold) — email notification before any cost.
    - GCP API-level hard quotas recommended as additional backstop.

4. **Transport & headers**:
    - Firebase Hosting enforces HTTPS.
    - Add `Content-Security-Policy`, `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin` via `firebase.json`.

5. **Dependency hygiene**: `npm audit` in CI; pin major versions.

6. **No secrets in bundle**: `.env` gitignored; CI injects API key from
   GitHub Actions secrets.

7. **XSS**: no `dangerouslySetInnerHTML` anywhere — enforce via lint rule.

### 8.2 Phase 2 Security — Authentication & Authorization

1. **JWT-based auth**: short-lived access tokens (15 min) + refresh tokens
   (7 days) in `httpOnly`/`Secure`/`SameSite=Strict` cookies (not localStorage).
2. **RBAC roles**: `admin`, `dispatcher`, `viewer`. Role claims in JWT;
   backend enforces per-endpoint.
3. **Credentials**: bcrypt/argon2 hashing, rate-limited login, MFA for admin.

### 8.3 Phase 2 Security — API & Data

1. `zod` schema validation on all endpoints. Never trust client-supplied IDs.
2. CORS: explicit allowlist, no `*`.
3. Rate limiting per-user and per-IP; stricter on auth endpoints.
4. Field-level encryption (Cloud KMS) for any future patient-related fields.
5. Google Secret Manager for all backend secrets; 90-day rotation.
6. Append-only audit log for all operational actions.
7. Separate GCP projects per environment (dev/staging/prod).
8. **Service-to-service auth**: Cloud Run IAM-based service account tokens.
   All services "internal only" except the Gateway (sole public entry point).
9. **Pub/Sub security**: IAM restricts publish/subscribe per topic;
   payloads validated against `/packages/shared-types` schemas.

### 8.4 Phase 2 Security — GPS Ingestion

1. Per-device credentials (API key or mTLS cert) — not shared, not user JWTs.
2. Payload validation: lat/lng bounds (Catalonia bbox), timestamp freshness,
   speed sanity checks.
3. Least privilege: device can only write to its own position record.

### 8.5 Legal & Compliance (future consideration)

- **GDPR / Spanish LOPDGDD**: triggered when real personal data enters system.
- Patient health data = "special category" (Art. 9) → DPIA required.
- Potential **ENS** applicability if integrated with CatSalut/SEM.
- Data residency: prefer `europe-west` GCP/Firebase regions.
- Spanish labor law record-keeping for employee break schedules.

---

## 9. Cost & Quota Management (Google Maps Platform)

| Mitigation | Phase | Status |
|---|---|---|
| HTTP referrer restriction on API key | 1 | ✅ Done |
| Per-API enablement (Maps JS + Directions only) | 1 | ✅ Done |
| Client-side daily quota cap + 12h route cache | 1 | ✅ Implemented |
| Quota UI counter with warning color | 1 | ✅ Implemented |
| Billing budget alert (€5) | 1 | ✅ Done |
| `upgradingRef` + always-write `routeSource` (anti-loop) | 1 | ✅ Implemented |
| GCP API-level hard quotas | 1 | Recommended, to do |
| Server-side Directions proxy (key never in client) | 2 | Designed for |
| Per-user/org quota enforcement | 2 | Designed for |

**Free-tier reality**: Dynamic Maps ~10,000 loads/month free; Directions
(traffic-aware) ~5,000 requests/month free; $200/month platform credit.
At 300 calls/day limit with 12h cache, a single demo instance uses at most
~$1.50/day if fully above free tier — in practice far less due to caching.

**Lesson learned**: an infinite retry loop (missing `routeSource` write on
fallback + reactive useEffect on ambulances) consumed 270+ API calls in one
session. Fixed by ADR-011.

---

## 10. Data Model

### 10.1 Phase 1 (in-memory, client-only)

Implemented in `packages/shared-types/src/index.ts`:

```typescript
// Core domain types (all readonly)
Ambulance, Base, Hospital, BreakWindow, Incident, CoverageZone, CoverageWarning

// Enumerations
AmbulanceStatus: 'idle' | 'en_route' | 'on_scene' | 'transporting'
               | 'returning' | 'on_break'
IncidentPriority: 'critical' | 'urgent' | 'standard'
TrafficModel: 'best_guess' | 'pessimistic' | 'optimistic'
RouteSource: 'cache' | 'api' | 'fallback_straight_line' | 'fallback_no_sdk'
UserRole: 'admin' | 'dispatcher' | 'viewer'

// Domain events (Phase 2 event bus contracts — defined now)
VehiclePositionUpdated, IncidentCreated, IncidentAssigned,
CoverageWarningRaised, BreakScheduleChanged
```

**Static data in `apps/web/src/data/locations.ts`:**
- `BASES` (8 entries) — ambulance home bases
- `COVERAGE_ZONES` (8 entries) — zones with coverage requirements
- `HOSPITALS` (8 entries) — transport destinations
- `INCIDENT_LOCATIONS` (~35 entries) — curated land-only positions
- `MAP_CENTER`, `MAP_BOUNDS`
- `buildInitialAmbulances()`, `findNearestHospital()`, `randomIncidentLocation()`

### 10.2 Phase 2 (proposed, database-per-service)

```
identity-svc DB:
  users            { id, email, passwordHash?, role, createdAt, lastLoginAt }

fleet-svc DB:
  vehicles         { id, callSign, homeBaseId, deviceCredentialId, active }
  bases            { id, name, position }
  hospitals        { id, name, position }
  vehiclePositions { vehicleId, position, recordedAt, source: 'gps'|'sim' }  ← time-series

dispatch-svc DB:
  incidents        { id, position, priority, status, assignedVehicleId,
                     assignedHospitalId, createdAt, resolvedAt, createdBy }

scheduling-svc DB:
  coverageZones    { id, center, requiredAmbulances, targetResponseMinutes }
  breakWindows     { id, vehicleId, startAt, durationMinutes, createdBy, coverageOk }

routing-svc DB (cache only, no PII):
  routeCache       { cacheKey, path, trafficModel, cachedAt }
  quotaCounters    { date, count }

audit-svc DB:
  auditLog         { id, actorUserId, action, targetType, targetId, timestamp, metadata }
```

---

## 11. Testing Strategy (TDD)

### 11.1 Test Pyramid

```
        ▲
        │  E2E (Playwright)          — planned, not yet implemented
        │  ──────────────────────
        │  Integration (RTL)         — 7 test files, 61 tests
        │  ──────────────────────
        │  Unit (Vitest)             — 2 test files, 22 tests
        ▼  ──────────────────────
```

### 11.2 Tooling

| Layer | Tool | Rationale |
|---|---|---|
| Unit | **Vitest** | Vite-native, Jest-compatible API, near-zero config. |
| Component/Integration | **React Testing Library** + Vitest | Test behavior, not implementation. |
| Google Maps mock | `window.google?.maps` guard in `directionsService.ts` | Returns `fallback_no_sdk` when SDK absent — no mock needed. |
| E2E | **Playwright** (planned) | Cross-browser, network interception for Maps API. |
| Coverage | Vitest `--coverage` (v8) | ≥85% `core-logic`, ≥70% `web/src`. |
| CI | GitHub Actions | Test + typecheck + build + audit on every PR. |

### 11.3 Current Test Results

| Package | Test files | Tests | Status |
|---|---|---|---|
| `@sacs/core-logic` | 2 | 22 | ✅ All passing |
| `@sacs/web` | 7 | 83 | ✅ All passing |
| **Total** | **9** | **105** | ✅ |

### 11.4 TDD Modules (implemented)

1. **`geo.ts`**: `distanceMeters`, `trafficFactorForTime`, `ambulanceSpeedMps`,
   `coverageRadiusMeters`, `formatSimTime` — 10 tests.
2. **`breakScheduler.ts`**: `isAvailableAt`, `evaluateCoverageAtMinute`,
   `generateAutoBreakSchedule`, `validateBreakSchedule` — 12 tests.
3. **`simStore.ts`**: initial state, toggleRunning, tick, addBreak, removeBreak,
   reset, dispatch, on-break exclusion — 19 tests.
4. **Components**: App (10), SimulationControls (14+1), FleetPanel (7),
   BreaksPanel (14), CoveragePanel (9), IncidentsPanel (10).

### 11.5 CI Gate

```yaml
on: [pull_request, push to main]
jobs:
  test:
    steps:
      - npm ci
      - npm run typecheck      # tsc --noEmit (strict mode)
      - npm run test -- --coverage
      - npm run build
      - npm audit --audit-level=high
```

### 11.6 Contract Testing (Phase 2)

- **Shared types as contract**: breaking change = TypeScript compile error
  in the other service's CI build.
- **Consumer-driven contract tests** (Pact) for Gateway↔service boundaries.
- **`core-logic` parity tests**: same fixtures run against Phase 1 sim and
  `scheduling-svc` live implementation — guarantees identical coverage math.

---

## 12. Deployment & Environments

| Env | Purpose | Hosting |
|---|---|---|
| `dev` | Local dev, `.env` with test Maps key | `npm run dev` (Vite dev server) |
| `staging` | CEO demos, PR previews | Firebase Hosting preview channels |
| `prod` | Public demo (Phase 1) / live ops (Phase 2) | Firebase Hosting main channel |

**Phase 1 deploy:**
```bash
npm run build          # apps/web → dist/
firebase deploy --only hosting
```

**Phase 2 CI/CD**: Turborepo computes affected packages per PR → only
changed services build and deploy. Fix to `routing-svc` deploys in minutes
without touching `identity-svc` or frontend.

---

## 13. Observability

**Phase 1 (implemented):**
- `routeSource` on each ambulance shows cache/quota/fallback provenance.
- Quota counter in UI (`API: X/Y`), red when < 20 remaining.
- Browser DevTools: `sacs_directions_quota_v1` and `sacs_route_cache_v1`
  in localStorage for debugging.

**Phase 2:**
- Structured JSON logging from each Cloud Run service.
- Error tracking (Sentry or Cloud Error Reporting).
- **OpenTelemetry distributed tracing** with correlation ID propagated from
  Gateway through all services and events. Treat as Gateway contract from M3.
- GPS ingestion freshness alerts (vehicle not reporting for N minutes).
- Directions API quota dashboard (server-side, in `routing-svc`).

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Google Maps cost overrun | Medium | Quota cap + budget alerts + GCP hard quotas |
| Coverage algorithm false confidence (coarse sampling) | High (Phase 2) | Unit tests at exact boundaries; event-based validation before Phase 2 go-live |
| Phase 2 never happens, simulation shortcuts accumulate | Medium | Pure-logic/UI separation enforced by tests; review before any "quick hack" |
| JWT implementation done insecurely under time pressure | High (Phase 2) | Prefer Firebase Auth over hand-rolled JWT; security review before prod |
| GDPR exposure if patient data added without DPIA | High (future) | Hard gate: no patient fields without DPIA + legal sign-off |
| Premature microservices overhead slows small team | Medium | Macro-services first (ADR-008); split only when justified |
| Cross-service coverage inconsistency (sim vs live) | High (Phase 2) | `core-logic` parity tests (§11.6) in CI |
| Directions API infinite retry loop | High (occurred, fixed) | `upgradingRef` + always-write `routeSource` + `[isLoaded]`-only dependency array (ADR-011) |
| API quota exhaustion during development | Medium (occurred, fixed) | Anti-loop fix + UI counter + localStorage quota key deletable for reset |
| `google.maps.DirectionsService` deprecation | Low (Feb 2027 deadline) | ADR-010 migration planned before deadline |

---

## 15. Architecture Decision Records

- **ADR-001** ✅: Pure-logic modules (`core-logic`) have no React/DOM dependency.
- **ADR-002** ✅: Routing via `directionsService.ts` with cache→quota→fallback.
  Never called directly from components.
- **ADR-003** ✅: Phase 1 has no backend. localStorage for cache/quota only,
  never for user data.
- **ADR-004 (open)**: Phase 2 auth — Firebase Auth vs custom JWT.
  Deferred until CEO commitment confirmed.
- **ADR-005 (open)**: Phase 2 datastore — Firestore vs Postgres/Cloud SQL.
  Decision per-service, not global. Leaning Firestore for MVP.
- **ADR-006** ✅: Phase 2 microservices decomposed by bounded context
  (Identity, Fleet & Telemetry, Dispatch & Incidents, Scheduling & Coverage,
  Routing & Traffic, Audit) behind single API Gateway/BFF.
- **ADR-007** ✅: Monorepo (Turborepo + npm workspaces) with `/apps/*` per
  service and `/packages/core-logic` + `/packages/shared-types` shared.
- **ADR-008** ✅: Start with macro-services; split at M5 when justified.
- **ADR-009** ✅: Synchronous REST/JSON for user-waited ops; async Pub/Sub
  for fan-out. No gRPC until justified.
- **ADR-010 (open)**: Migrate from deprecated `google.maps.DirectionsService`
  to `google.maps.routes.computeRoutes`. Deadline: ~Feb 2027 (12 months
  from Feb 2026 deprecation). Scope: only `directionsService.ts`.
- **ADR-011** ✅: Route upgrade uses **polling (3s interval)** reading store
  via `useSimStore.getState()`, NOT reactive `useEffect[ambulances]`.
  Rationale: reactive approach caused infinite loop consuming 270+ API calls
  in one session. Polling with direct store access decouples upgrade logic
  from React render cycle entirely.
- **ADR-012** ✅: Hospital routing in `simStore.ts` uses `distanceMeters`
  from `@sacs/core-logic` (single Haversine implementation). No local
  duplicate math functions anywhere in the codebase (DRY).
- **ADR-013** ✅: Simulation clock uses real Barcelona time
  (`Intl.DateTimeFormat`, `Europe/Madrid`) as starting point, HH:MM:SS format.
  No artificial shift boundaries — 24/7 operation. `simMinute` = minutes
  from midnight (not from 06:00).
- **ADR-014** ✅: Incident generation uses curated `INCIDENT_LOCATIONS`
  (~35 verified land coordinates) instead of random bounding-box sampling.
  Bounding box of Catalonia includes Mediterranean Sea.
- **ADR-015** ✅: Ambulance markers rendered as HTML overlays via
  `OverlayViewF` (not deprecated `google.maps.Marker`). Provides full
  CSS control, shows unit number, avoids deprecation warnings.

---

## 16. Roadmap

| Milestone | Scope | Status |
|---|---|---|
| **M0** | PRD v1.0, monorepo scaffold, `core-logic` TDD (22 tests), `shared-types` | ✅ Complete |
| **M1** | Phase 1 full UI (83 tests), Google Maps integration, hospital routing, real-time clock, quota protection, dark theme, curated incident locations | ✅ Complete |
| **M1.5** | Firebase Hosting deployment, GCP security hardening (§8.1), CEO demo | ⬅️ Current |
| **M2** | CEO demo & feedback; go/no-go on Phase 2 | Pending |
| **M3** (if go) | ADR-004/005 decisions; monorepo backend scaffold; macro-services (Identity+Gateway, Dispatch+Scheduling, Routing proxy), TDD from day one, contract tests (§11.6) | Planned |
| **M4** | Real GPS ingestion (single pilot vehicle), live dashboard alongside simulation mode, Pub/Sub event bus | Planned |
| **M5** | Multi-user RBAC, Audit service, staging/prod environment separation; split services if justified | Planned |
| **M6** | ADR-010: migrate to Routes API before Feb 2027 | Planned |
| **M7** (separate) | Patient-data DPIA + addendum PRD | Conditional |

---

## 17. Open Questions

1. Does the operator have an existing identity provider (SSO) for Phase 2,
   or is a fresh user base acceptable?
2. What telematics hardware do the vehicles use (GPS ingestion protocol:
   MQTT, HTTP webhook, proprietary SDK)?
3. Target response times and required-ambulance counts per zone (FR-4.2)
   are currently illustrative — need real operational input for Phase 2.
4. Is there an existing CAD system to integrate with, or does SACS become
   the dispatch system of record?
5. What are the actual shift patterns? (Informs break scheduling algorithm
   safe windows — currently uses generic rush-hour model.)

---

## Appendix A: Glossary

- **SEM**: Sistema d'Emergències Mèdiques (Catalan public EMS — name used
  for inspiration in base/hospital locations, not implying affiliation).
- **Coverage zone**: geographic area with minimum-ambulances-within-time requirement.
- **Traffic factor**: 0.3–1.0 multiplier on free-flow speed representing congestion.
- **Route source**: provenance tag for a computed route (`cache`/`api`/
  `fallback_straight_line`/`fallback_no_sdk`) — used for cost observability.
- **simMinute**: minutes from midnight (00:00 = 0, 12:00 = 720, 23:59 = 1439).
- **Quota circuit breaker**: client-side daily API call counter that stops
  Directions API calls and falls back to straight-line routes when limit reached.
- **Macro-service**: a coarser service grouping multiple bounded contexts
  (e.g., Dispatch + Scheduling combined) used in early Phase 2 to reduce
  distributed-systems overhead before team/traffic size justifies splitting.