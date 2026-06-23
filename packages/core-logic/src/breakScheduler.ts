import type {
    Ambulance,
    BreakWindow,
    CoverageZone,
    CoverageWarning,
} from '@sacs/shared-types';
import { distanceMeters, ambulanceSpeedMps } from './geo';

export const SHIFT_LENGTH_MINUTES = 720; // 06:00–18:00
export const BREAK_DURATION_MINUTES = 30;

// Safe windows: outside morning rush (07:30–09:30) and evening rush (17:00–19:00)
// In simulation minutes from 06:00:
//   morning rush  → minutes  90–210
//   evening rush  → minutes 660–780
const SAFE_WINDOWS = [
    { start: 210, end: 420 },  // 09:30–13:00
    { start: 420, end: 660 },  // 13:00–17:00
] as const;

/**
 * Returns true if the ambulance is NOT in a scheduled break at the given
 * simulation minute. Break end is exclusive: [start, start + duration).
 */
export function isAvailableAt(ambulance: Ambulance, minute: number): boolean {
    return !ambulance.breaks.some(
        (b) =>
            minute >= b.startMinute &&
            minute < b.startMinute + b.durationMinutes,
    );
}

/**
 * For a given simulation minute and traffic factor, evaluates how many
 * ambulances can reach each coverage zone within its target response time.
 *
 * Uses home-base position as the worst-case starting point (ambulance is idle).
 * Returns one CoverageWarning per under-covered zone.
 */
export function evaluateCoverageAtMinute(
    ambulances: readonly Ambulance[],
    zones: readonly CoverageZone[],
    minute: number,
    trafficFactor: number,
): CoverageWarning[] {
    const speed = ambulanceSpeedMps(trafficFactor);
    const warnings: CoverageWarning[] = [];

    for (const zone of zones) {
        let available = 0;

        for (const amb of ambulances) {
            if (!isAvailableAt(amb, minute)) continue;

            const dist = distanceMeters(amb.homeBase.position, zone.center);
            const travelMinutes = speed > 0 ? dist / speed / 60 : Infinity;

            if (travelMinutes <= zone.targetResponseMinutes) {
                available += 1;
            }
        }

        if (available < zone.requiredAmbulances) {
            warnings.push({
                zoneId: zone.id,
                availableCount: available,
                requiredCount: zone.requiredAmbulances,
                atMinute: minute,
            });
        }
    }

    return warnings;
}

/**
 * Validates the full shift (sampled every SAMPLE_INTERVAL_MINUTES) and
 * returns all coverage warnings found, plus ambulances with breaks flagged
 * coverageOk: false where they contribute to a violation.
 */
export function validateBreakSchedule(
    ambulances: readonly Ambulance[],
    zones: readonly CoverageZone[],
    trafficFactorFn: (minute: number) => number,
    sampleIntervalMinutes = 5,
): { warnings: CoverageWarning[]; ambulances: readonly Ambulance[] } {
    const allWarnings: CoverageWarning[] = [];
    const violatingAmbulanceIds = new Set<string>();

    for (
        let minute = 0;
        minute <= SHIFT_LENGTH_MINUTES;
        minute += sampleIntervalMinutes
    ) {
        const warnings = evaluateCoverageAtMinute(
            ambulances,
            zones,
            minute,
            trafficFactorFn(minute),
        );

        if (warnings.length > 0) {
            allWarnings.push(...warnings);

            // Mark ambulances on break at this minute as contributing to violation
            for (const amb of ambulances) {
                if (!isAvailableAt(amb, minute)) {
                    violatingAmbulanceIds.add(amb.id);
                }
            }
        }
    }

    const updatedAmbulances = ambulances.map((amb) => ({
        ...amb,
        breaks: amb.breaks.map((b): BreakWindow => ({
            ...b,
            coverageOk: !violatingAmbulanceIds.has(amb.id),
        })),
    }));

    return { warnings: allWarnings, ambulances: updatedAmbulances };
}

/**
 * Generates a baseline break schedule for all ambulances such that:
 * - Each ambulance gets exactly one BREAK_DURATION_MINUTES break
 * - At most floor(N/4) ambulances are on break simultaneously
 * - All breaks fall within SAFE_WINDOWS (outside rush hours)
 *
 * Staggering strategy: divide ambulances into groups of maxSimultaneous,
 * then offset each group's break start within the safe windows.
 */
export function generateAutoBreakSchedule(
    ambulances: readonly Ambulance[],
): BreakWindow[] {
    const n = ambulances.length;
    const maxSimultaneous = Math.max(1, Math.floor(n / 4));

    const totalSafeMinutes = SAFE_WINDOWS.reduce(
        (sum, w) => sum + (w.end - w.start - BREAK_DURATION_MINUTES),
        0,
    );

    const groupCount = Math.ceil(n / maxSimultaneous);
    const stepMinutes = Math.floor(totalSafeMinutes / groupCount);

    const breaks: BreakWindow[] = [];

    ambulances.forEach((amb, index) => {
        const groupIndex = Math.floor(index / maxSimultaneous);
        const offsetInSafe = groupIndex * stepMinutes;

        const startMinute = resolveOffsetInSafeWindows(offsetInSafe);

        breaks.push({
            id: `break-${amb.id}-auto`,
            ambulanceId: amb.id,
            startMinute,
            durationMinutes: BREAK_DURATION_MINUTES,
            coverageOk: true,
        });
    });

    return breaks;
}

/**
 * Maps a flat offset (in minutes) into the concatenated safe windows.
 * e.g. offset 0 → first safe window start, offset beyond window 1 → window 2.
 */
function resolveOffsetInSafeWindows(offset: number): number {
    let remaining = offset;

    for (const window of SAFE_WINDOWS) {
        const capacity = window.end - window.start - BREAK_DURATION_MINUTES;
        if (remaining <= capacity) {
            return window.start + remaining;
        }
        remaining -= capacity;
    }

    // Fallback: last safe position in last window
    const lastWindow = SAFE_WINDOWS[SAFE_WINDOWS.length - 1];
    return lastWindow.end - BREAK_DURATION_MINUTES;
}