import type { LatLng, RouteSource, TrafficModel } from '@sacs/shared-types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_STORAGE_KEY   = 'sacs_route_cache_v1';
const QUOTA_STORAGE_KEY   = 'sacs_directions_quota_v1';
const CACHE_TTL_MS        = 1000 * 60 * 60 * 12; // 12 hours
const DEFAULT_DAILY_LIMIT = 150;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CacheEntry {
    path: LatLng[];
    cachedAt: number;
}

interface QuotaRecord {
    date: string; // YYYY-MM-DD
    count: number;
}

export interface RouteResult {
    path: LatLng[];
    source: RouteSource;
}

export interface QuotaStatus {
    used: number;
    limit: number;
    remaining: number;
}

// ─── In-memory mirrors ────────────────────────────────────────────────────────

let memCache: Map<string, CacheEntry> | null = null;
let memQuota: QuotaRecord | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Round to ~100m precision so nearby requests share cache entries */
function roundCoord(n: number): number {
    return Math.round(n * 1000) / 1000;
}

function buildCacheKey(
    origin: LatLng,
    destination: LatLng,
    trafficModel: TrafficModel,
): string {
    return [
        roundCoord(origin.lat),
        roundCoord(origin.lng),
        roundCoord(destination.lat),
        roundCoord(destination.lng),
        trafficModel,
    ].join(',');
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function loadCache(): Map<string, CacheEntry> {
    if (memCache) return memCache;
    memCache = new Map();
    try {
        const raw = localStorage.getItem(CACHE_STORAGE_KEY);
        if (raw) {
            const obj = JSON.parse(raw) as Record<string, CacheEntry>;
            for (const [k, v] of Object.entries(obj)) {
                memCache.set(k, v);
            }
        }
    } catch {
        // Corrupt cache — start fresh
    }
    return memCache;
}

function persistCache(cache: Map<string, CacheEntry>): void {
    try {
        const obj: Record<string, CacheEntry> = {};
        for (const [k, v] of cache.entries()) obj[k] = v;
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj));
    } catch {
        // localStorage full — non-fatal, cache just won't persist
    }
}

// ─── Quota ────────────────────────────────────────────────────────────────────

function loadQuota(): QuotaRecord {
    if (memQuota?.date === todayString()) return memQuota;
    try {
        const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as QuotaRecord;
            if (parsed.date === todayString()) {
                memQuota = parsed;
                return memQuota;
            }
        }
    } catch {
        // ignore
    }
    memQuota = { date: todayString(), count: 0 };
    return memQuota;
}

function persistQuota(quota: QuotaRecord): void {
    try {
        localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(quota));
    } catch {
        // non-fatal
    }
}

function getDailyLimit(): number {
    const envLimit = Number(import.meta.env.VITE_DIRECTIONS_DAILY_LIMIT);
    return Number.isFinite(envLimit) && envLimit > 0
        ? envLimit
        : DEFAULT_DAILY_LIMIT;
}

export function getQuotaStatus(): QuotaStatus {
    const quota = loadQuota();
    const limit = getDailyLimit();
    return {
        used: quota.count,
        limit,
        remaining: Math.max(0, limit - quota.count),
    };
}

// ─── Google Maps traffic model mapping ───────────────────────────────────────

function toGoogleTrafficModel(
    model: TrafficModel,
): google.maps.TrafficModel {
    const map: Record<TrafficModel, google.maps.TrafficModel> = {
        best_guess:  google.maps.TrafficModel.BEST_GUESS,
        pessimistic: google.maps.TrafficModel.PESSIMISTIC,
        optimistic:  google.maps.TrafficModel.OPTIMISTIC,
    };
    return map[model];
}

// ─── Main API ─────────────────────────────────────────────────────────────────

/**
 * Resolves a road-network route between two points.
 *
 * Resolution order:
 * 1. In-memory + localStorage cache (12h TTL) — free
 * 2. Daily quota check — if exhausted, return straight line
 * 3. Google Directions API call — cached + quota incremented
 * 4. Any error → straight-line fallback
 */
export async function getRoute(
    origin: LatLng,
    destination: LatLng,
    trafficModel: TrafficModel,
): Promise<RouteResult> {
    const key   = buildCacheKey(origin, destination, trafficModel);
    const cache = loadCache();

    const cached = cache.get(key);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return { path: cached.path, source: 'cache' };
    }

    if (!window.google?.maps) {
        return { path: [origin, destination], source: 'fallback_no_sdk' };
    }

    const quota = loadQuota();
    if (quota.count >= getDailyLimit()) {
        return { path: [origin, destination], source: 'fallback_straight_line' };
    }

    return new Promise((resolve) => {
        const service = new google.maps.DirectionsService();

        service.route(
            {
                origin,
                destination,
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: toGoogleTrafficModel(trafficModel),
                },
            },
            (result, status) => {
                quota.count += 1;
                persistQuota(quota);

                if (status === google.maps.DirectionsStatus.OK && result) {
                    const overviewPath = result.routes[0]?.overview_path ?? [];
                    if (overviewPath.length > 0) {
                        const path = overviewPath.map((p) => ({
                            lat: p.lat(),
                            lng: p.lng(),
                        }));
                        cache.set(key, { path, cachedAt: Date.now() });
                        persistCache(cache);
                        resolve({ path, source: 'api' });
                        return;
                    }
                }

                resolve({ path: [origin, destination], source: 'fallback_straight_line' });
            },
        );
    });
}