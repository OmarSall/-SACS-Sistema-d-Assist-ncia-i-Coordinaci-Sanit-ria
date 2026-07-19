import type { Ambulance, Base, CoverageZone, LatLng } from '@sacs/shared-types';
import { distanceMeters } from '@sacs/core-logic';

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

/**
 * Curated list of realistic incident locations across Barcelona
 * metropolitan area — all on land, distributed across urban zones.
 * Replaces random bounding-box generation which could place incidents at sea.
 */
export const INCIDENT_LOCATIONS: readonly LatLng[] = [
    // ── Barcelona centre ──────────────────────────────────────────
    { lat: 41.3851, lng: 2.1734 }, // Gòtic
    { lat: 41.3894, lng: 2.1534 }, // Eixample Esquerra
    { lat: 41.3960, lng: 2.1619 }, // Gràcia
    { lat: 41.3780, lng: 2.1400 }, // Sants
    { lat: 41.4000, lng: 2.1800 }, // Sagrada Família
    { lat: 41.4100, lng: 2.1750 }, // Guinardó
    { lat: 41.4200, lng: 2.1800 }, // Horta
    { lat: 41.4350, lng: 2.1700 }, // Nou Barris
    { lat: 41.4300, lng: 2.1900 }, // Sant Andreu
    { lat: 41.4050, lng: 2.2100 }, // Sant Martí
    { lat: 41.3900, lng: 2.2000 }, // Poblenou
    { lat: 41.3750, lng: 2.1550 }, // Les Corts
    { lat: 41.3800, lng: 2.1200 }, // Zona Franca
    { lat: 41.4150, lng: 2.1550 }, // Vall d'Hebron
    // ── L'Hospitalet de Llobregat ──────────────────────────────────
    { lat: 41.3590, lng: 2.1000 },
    { lat: 41.3650, lng: 2.1100 },
    { lat: 41.3700, lng: 2.0900 },
    // ── Badalona ──────────────────────────────────────────────────
    { lat: 41.4470, lng: 2.2470 },
    { lat: 41.4550, lng: 2.2300 },
    { lat: 41.4600, lng: 2.2200 },
    // ── Sant Cugat del Vallès ──────────────────────────────────────
    { lat: 41.4730, lng: 2.0860 },
    { lat: 41.4650, lng: 2.0950 },
    { lat: 41.4800, lng: 2.0700 },
    // ── Castelldefels ─────────────────────────────────────────────
    { lat: 41.2800, lng: 1.9750 },
    { lat: 41.2850, lng: 1.9850 },
    // ── Sabadell ──────────────────────────────────────────────────
    { lat: 41.5430, lng: 2.1090 },
    { lat: 41.5500, lng: 2.1200 },
    // ── Cornellà / Esplugues ──────────────────────────────────────
    { lat: 41.3550, lng: 2.0700 },
    { lat: 41.3770, lng: 2.0870 },
    // ── El Prat / Viladecans / Gavà ───────────────────────────────
    { lat: 41.3260, lng: 2.0940 },
    { lat: 41.3160, lng: 2.0130 },
    { lat: 41.3010, lng: 1.9920 },
] as const;

export function randomIncidentLocation(): LatLng {
    const index = Math.floor(Math.random() * INCIDENT_LOCATIONS.length);
    return INCIDENT_LOCATIONS[index]!;
}

export interface Hospital {
    readonly id: string;
    readonly name: string;
    readonly position: LatLng;
}

export const HOSPITALS: readonly Hospital[] = [
    { id: 'hosp-clinic',      name: 'Hospital Clínic',              position: { lat: 41.3888, lng: 2.1503 } },
    { id: 'hosp-vall-hebron', name: "Hospital Vall d'Hebron",        position: { lat: 41.4280, lng: 2.1460 } },
    { id: 'hosp-del-mar',     name: 'Hospital del Mar',              position: { lat: 41.3870, lng: 2.1990 } },
    { id: 'hosp-bellvitge',   name: 'Hospital de Bellvitge',         position: { lat: 41.3600, lng: 2.0995 } },
    { id: 'hosp-badalona',    name: 'Hospital Municipal de Badalona', position: { lat: 41.4500, lng: 2.2470 } },
    { id: 'hosp-sant-pau',    name: 'Hospital de la Santa Creu i Sant Pau', position: { lat: 41.4140, lng: 2.1740 } },
    { id: 'hosp-terrassa',    name: 'Consorci Sanitari de Terrassa',  position: { lat: 41.5630, lng: 2.0080 } },
    { id: 'hosp-parc-tauli',  name: 'Parc Taulí Sabadell',           position: { lat: 41.5470, lng: 2.1090 } },
] as const;

export function findNearestHospital(position: LatLng): Hospital {
    let nearest = HOSPITALS[0]!;
    let minDist = distanceMeters(position, nearest.position);

    for (const hospital of HOSPITALS.slice(1)) {
        const dist = distanceMeters(position, hospital.position);
        if (dist < minDist) {
            minDist = dist;
            nearest = hospital;
        }
    }

    return nearest;
}
