// ─── Enumerations ────────────────────────────────────────────────────────────

export type AmbulanceStatus =
    | 'idle'
    | 'on_route'
    | 'on_scene'
    | 'transporting'
    | 'returning'
    | 'on_break';

export type IncidentPriority = 'critical' | 'urgent' | 'standard';

export type IncidentStatus = 'pending' | 'assigned' | 'resolved';

export type TrafficModel = 'best_guess' | 'pessimistic' | 'optimistic';

export type RouteSource =
    | 'cache'
    | 'api'
    | 'fallback_straight_line'
    | 'fallback_no_sdk';

export type UserRole = 'admin' | 'dispatcher' | 'viewer';

export type Language = 'ca' | 'es' | 'en';

// ─── Value objects ────────────────────────────────────────────────────────────

export interface LatLng {
    readonly lat: number;
    readonly lng: number;
}

// ─── Domain entities ─────────────────────────────────────────────────────────

export interface Base {
    readonly id: string;
    readonly name: string;
    readonly position: LatLng;
}

export interface BreakWindow {
    readonly id: string;
    readonly ambulanceId: string;
    readonly startMinute: number;
    readonly durationMinutes: number;
    readonly coverageOk: boolean;
}

export interface Ambulance {
    readonly id: string;
    readonly callSign: string;
    readonly position: LatLng;
    readonly homeBase: Base;
    readonly status: AmbulanceStatus;
    readonly routePath: readonly LatLng[];
    readonly routeProgress: number;
    readonly assignedIncidentId: string | null;
    readonly breaks: readonly BreakWindow[];
    readonly etaSeconds: number | null;
    readonly coverageRadiusMeters: number;
    readonly trafficFactor: number;
    readonly routeSource?: RouteSource;
}

export interface Incident {
    readonly id: string;
    readonly position: LatLng;
    readonly priority: IncidentPriority;
    readonly createdAtMinute: number;
    readonly status: IncidentStatus;
    readonly assignedAmbulanceId: string | null;
    readonly label: string;
}

export interface CoverageZone {
    readonly id: string;
    readonly center: LatLng;
    readonly requiredAmbulances: number;
    readonly targetResponseMinutes: number;
}

// ─── Domain events (Phase 2 event bus contracts) ─────────────────────────────

export interface DomainEvent<T extends string, P> {
    readonly type: T;
    readonly occurredAt: string; // ISO 8601
    readonly payload: P;
}

export type VehiclePositionUpdated = DomainEvent<
'VehiclePositionUpdated',
{ vehicleId: string; position: LatLng; recordedAt: string; source: 'gps' | 'sim' }
>;

export type IncidentCreated = DomainEvent<
'IncidentCreated',
{ incidentId: string; position: LatLng; priority: IncidentPriority }
>;

export type IncidentAssigned = DomainEvent<
'IncidentAssigned',
{ incidentId: string; ambulanceId: string }
>;

export type CoverageWarningRaised = DomainEvent<
'CoverageWarningRaised',
{ zoneId: string; availableCount: number; requiredCount: number; atMinute: number }
>;

export type BreakScheduleChanged = DomainEvent<
'BreakScheduleChanged',
{ ambulanceId: string; breaks: readonly BreakWindow[] }
>;

export type SacsEvent =
    | VehiclePositionUpdated
    | IncidentCreated
    | IncidentAssigned
    | CoverageWarningRaised
    | BreakScheduleChanged;

// ─── Coverage ─────────────────────────────────────────────────────────────────

export interface CoverageWarning {
    readonly zoneId: string;
    readonly availableCount: number;
    readonly requiredCount: number;
    readonly atMinute: number;
}