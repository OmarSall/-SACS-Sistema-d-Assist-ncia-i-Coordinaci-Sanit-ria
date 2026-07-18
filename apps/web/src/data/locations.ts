import type { Ambulance, Base, CoverageZone } from '@sacs/shared-types';

export const BASES: readonly Base[] = [
    {
        id: 'base-bcn-eixample',
        name: 'Eixample · Hospital Clínic',
        position: { lat: 41.3888, lng: 2.1503 },
    },
    {
        id: 'base-bcn-litoral',
        name: 'Litoral · Vila Olímpica',
        position: { lat: 41.3870, lng: 2.1990 },
    },
    {
        id: 'base-bcn-nord',
        name: "Nou Barris · Vall d'Hebron",
        position: { lat: 41.4280, lng: 2.1460 },
    },
    {
        id: 'base-bcn-sants',
        name: 'Sants · Hospitalet',
        position: { lat: 41.3740, lng: 2.1150 },
    },
    {
        id: 'base-badalona',
        name: 'Badalona · Hospital Municipal',
        position: { lat: 41.4500, lng: 2.2470 },
    },
    {
        id: 'base-sant-cugat',
        name: 'Sant Cugat del Vallès',
        position: { lat: 41.4730, lng: 2.0860 },
    },
    {
        id: 'base-castelldefels',
        name: 'Castelldefels',
        position: { lat: 41.2800, lng: 1.9750 },
    },
    {
        id: 'base-sabadell',
        name: 'Sabadell · Parc Taulí',
        position: { lat: 41.5470, lng: 2.1090 },
    },
] as const;

export const COVERAGE_ZONES: readonly CoverageZone[] = [
    {
        id: 'zone-ciutat-vella',
        center: { lat: 41.3825, lng: 2.1769 },
        requiredAmbulances: 2,
        targetResponseMinutes: 8,
    },
    {
        id: 'zone-eixample',
        center: { lat: 41.3917, lng: 2.1649 },
        requiredAmbulances: 2,
        targetResponseMinutes: 8,
    },
    {
        id: 'zone-gracia',
        center: { lat: 41.4036, lng: 2.1527 },
        requiredAmbulances: 1,
        targetResponseMinutes: 8,
    },
    {
        id: 'zone-sants-les-corts',
        center: { lat: 41.3795, lng: 2.1340 },
        requiredAmbulances: 1,
        targetResponseMinutes: 8,
    },
    {
        id: 'zone-nou-barris',
        center: { lat: 41.4380, lng: 2.1740 },
        requiredAmbulances: 1,
        targetResponseMinutes: 10,
    },
    {
        id: 'zone-badalona-centre',
        center: { lat: 41.4505, lng: 2.2450 },
        requiredAmbulances: 1,
        targetResponseMinutes: 10,
    },
    {
        id: 'zone-hospitalet',
        center: { lat: 41.3600, lng: 2.0995 },
        requiredAmbulances: 1,
        targetResponseMinutes: 10,
    },
    {
        id: 'zone-sant-cugat',
        center: { lat: 41.4727, lng: 2.0844 },
        requiredAmbulances: 1,
        targetResponseMinutes: 12,
    },
] as const;

export const MAP_CENTER = { lat: 41.3874, lng: 2.1686 } as const;

export const MAP_BOUNDS = {
    north: 41.58,
    south: 41.25,
    east: 2.30,
    west: 1.92,
} as const;

export function buildInitialAmbulances(): Ambulance[] {
    return BASES.map((base, index) => ({
        id: `amb-${index + 1}`,
        callSign: `SEM-${String(index + 1).padStart(2, '0')}`,
        position: { ...base.position },
        homeBase: base,
        status: 'idle',
        routePath: [],
        routeProgress: 0,
        assignedIncidentId: null,
        breaks: [],
        etaSeconds: null,
        coverageRadiusMeters: 4500,
        trafficFactor: 1.0,
    }));
}