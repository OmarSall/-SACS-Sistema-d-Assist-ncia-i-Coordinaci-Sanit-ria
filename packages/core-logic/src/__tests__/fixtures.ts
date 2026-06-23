import type { Ambulance, Base, BreakWindow, CoverageZone, LatLng } from '@sacs/shared-types';

const DEFAULT_POSITION: LatLng = { lat: 41.3874, lng: 2.1686 };

const DEFAULT_BASE: Base = {
    id: 'base-test',
    name: 'Test Base',
    position: DEFAULT_POSITION,
};

export function makeTestAmbulance(overrides: Partial<Ambulance> & { id?: string } = {}): Ambulance {
    return {
        id: 'a1',
        callSign: 'SEM-01',
        position: DEFAULT_POSITION,
        homeBase: DEFAULT_BASE,
        status: 'idle',
        routePath: [],
        routeProgress: 0,
        assignedIncidentId: null,
        breaks: [],
        etaSeconds: null,
        coverageRadiusMeters: 4500,
        trafficFactor: 1.0,
        ...overrides,
    };
}

export function makeTestZone(overrides: Partial<CoverageZone> = {}): CoverageZone {
    return {
        id: 'zone-test',
        center: DEFAULT_POSITION,
        requiredAmbulances: 1,
        targetResponseMinutes: 8,
        ...overrides,
    };
}