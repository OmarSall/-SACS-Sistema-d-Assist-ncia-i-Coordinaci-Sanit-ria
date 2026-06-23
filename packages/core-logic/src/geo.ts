import type { LatLng, TrafficModel } from '@sacs/shared-types';

const EARTH_RADIUS_METERS = 6_371_000;
const BASE_SPEED_KMH = 45; // urban ambulance with priority lanes

/**
 * Haversine distance in meters between two geographic coordinates.
 * Accurate to within ~0.5% for distances relevant to city-scale dispatch.
 */
export function distanceMeters(a: LatLng, b: LatLng): number {
    const toRad = (deg: number): number => (deg * Math.PI) / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);

    const c =
        sinDLat * sinDLat +
        Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

    return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(c));
}

/**
 * Gaussian bell curve — used to model traffic congestion peaks.
 * Returns 0..1 where 1 = maximum congestion at the mean hour.
 */
function gaussian(x: number, mean: number, stdDev: number): number {
    return Math.exp(-((x - mean) ** 2) / (2 * stdDev ** 2));
}

/**
 * Traffic congestion factor for a given simulation minute and model.
 *
 * Simulation clock starts at 06:00, so:
 *   minute 0   = 06:00
 *   minute 90  = 07:30  ← morning rush peak
 *   minute 210 = 09:30
 *   minute 660 = 17:00  ← evening rush peak
 *   minute 719 = 17:59
 *
 * Returns a value in [0.3, 1.0]:
 *   1.0 = free flow
 *   0.3 = maximum congestion (gridlock)
 */
export function trafficFactorForTime(
    simMinute: number,
    model: TrafficModel,
): number {
    const hourOfDay = (6 + simMinute / 60) % 24;

    const morningRush = gaussian(hourOfDay, 8.3, 1.0);
    const eveningRush = gaussian(hourOfDay, 18.5, 1.3);
    const congestion = Math.min(1, morningRush + eveningRush);

    let factor = 1 - congestion * 0.55;

    if (model === 'pessimistic') factor *= 0.8;
    if (model === 'optimistic') factor = Math.min(1, factor * 1.15);

    return Math.max(0.3, Math.min(1.0, factor));
}

/**
 * Ambulance speed in meters per second, adjusted for traffic.
 * trafficFactor 1.0 = free flow at BASE_SPEED_KMH.
 * trafficFactor 0.0 = stationary (gridlock edge case).
 */
export function ambulanceSpeedMps(trafficFactor: number): number {
    return (BASE_SPEED_KMH * trafficFactor) / 3.6;
}

/**
 * Maximum reachable distance in meters within targetMinutes,
 * given current traffic. Used to render coverage radius circles on the map
 * and to validate coverage zones in breakScheduler.
 */
export function coverageRadiusMeters(
    trafficFactor: number,
    targetMinutes: number,
): number {
    return ambulanceSpeedMps(trafficFactor) * targetMinutes * 60;
}

/**
 * ETA in seconds from distance and traffic factor.
 */
export function etaSeconds(distanceM: number, trafficFactor: number): number {
    const speed = ambulanceSpeedMps(trafficFactor);
    if (speed === 0) return Infinity;
    return distanceM / speed;
}

/**
 * Formats a simulation minute as a wall-clock time string (HH:MM),
 * assuming the shift starts at 06:00.
 */
export function formatSimTime(simMinute: number): string {
    const totalMinutes = Math.floor(simMinute) + 6 * 60;
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}