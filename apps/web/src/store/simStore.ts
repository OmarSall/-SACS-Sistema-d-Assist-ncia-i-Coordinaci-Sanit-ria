import { create } from 'zustand';
import type {
    Ambulance,
    CoverageWarning,
    Incident,
    TrafficModel,
} from '@sacs/shared-types';
import {
    distanceMeters,
    trafficFactorForTime,
    coverageRadiusMeters,
    isAvailableAt,
    validateBreakSchedule,
    generateAutoBreakSchedule,
} from '@sacs/core-logic';
import {
    buildInitialAmbulances,
    COVERAGE_ZONES,
} from '../data/locations';

// ─── State shape ─────────────────────────────────────────────────────────────

interface SimState {
    running: boolean;
    speedMultiplier: number;
    currentMinute: number;
    trafficModel: TrafficModel;
    ambulances: Ambulance[];
    incidents: Incident[];
    coverageWarnings: CoverageWarning[];
}

// ─── Actions shape ───────────────────────────────────────────────────────────

interface SimActions {
    toggleRunning: () => void;
    setSpeedMultiplier: (multiplier: number) => void;
    setTrafficModel: (model: TrafficModel) => void;
    reset: () => void;
    tick: (deltaMinutes: number) => void;
    addIncident: (incident: Incident) => void;
    addBreak: (ambulanceId: string, startMinute: number, durationMinutes: number) => void;
    removeBreak: (breakId: string) => void;
    autoSchedule: () => void;
    validateCoverage: () => void;
}

type SimStore = SimState & SimActions;

// ─── Initial state factory ───────────────────────────────────────────────────

function buildInitialState(): SimState {
    return {
        running: false,
        speedMultiplier: 1,
        currentMinute: 0,
        trafficModel: 'best_guess',
        ambulances: buildInitialAmbulances(),
        incidents: [],
        coverageWarnings: [],
    };
}

// ─── Dispatch logic (pure, outside store) ────────────────────────────────────

/**
 * Finds the closest available (not on break, idle or returning) ambulance
 * to the given incident position. Returns null if no unit is available.
 *
 * Kept outside the store creator so it can be unit tested independently
 * if needed, and to keep the store actions focused on state transitions.
 */
function findNearestAvailableAmbulance(
    ambulances: Ambulance[],
    incident: Incident,
    currentMinute: number,
): Ambulance | null {
    const candidates = ambulances.filter(
        (a) =>
            (a.status === 'idle' || a.status === 'returning') &&
            isAvailableAt(a, currentMinute),
    );

    if (candidates.length === 0) return null;

    return candidates.reduce((best, current) => {
        const bestDist = distanceMeters(best.position, incident.position);
        const currentDist = distanceMeters(current.position, incident.position);
        return currentDist < bestDist ? current : best;
    });
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useSimStore = create<SimStore>((set, get) => ({
    ...buildInitialState(),

    toggleRunning: () =>
        set((state) => ({ running: !state.running })),

    setSpeedMultiplier: (multiplier) =>
        set({ speedMultiplier: multiplier }),

    setTrafficModel: (model) =>
        set({ trafficModel: model }),

    reset: () =>
        set(buildInitialState()),

    addIncident: (incident) =>
        set((state) => ({ incidents: [...state.incidents, incident] })),

    addBreak: (ambulanceId, startMinute, durationMinutes) =>
        set((state) => ({
            ambulances: state.ambulances.map((amb) =>
                amb.id !== ambulanceId
                    ? amb
                    : {
                        ...amb,
                        breaks: [
                            ...amb.breaks,
                            {
                                id: `break-${ambulanceId}-${Date.now()}`,
                                ambulanceId,
                                startMinute,
                                durationMinutes,
                                coverageOk: true,
                            },
                        ].sort((a, b) => a.startMinute - b.startMinute),
                    },
            ),
        })),

    removeBreak: (breakId) =>
        set((state) => ({
            ambulances: state.ambulances.map((amb) => ({
                ...amb,
                breaks: amb.breaks.filter((b) => b.id !== breakId),
            })),
        })),

    autoSchedule: () => {
        const { ambulances } = get();
        const generatedBreaks = generateAutoBreakSchedule(ambulances);

        set({
            ambulances: ambulances.map((amb) => ({
                ...amb,
                breaks: generatedBreaks.filter((b) => b.ambulanceId === amb.id),
            })),
        });

        get().validateCoverage();
    },

    validateCoverage: () => {
        const { ambulances, trafficModel } = get();
        const { warnings, ambulances: updated } = validateBreakSchedule(
            ambulances,
            COVERAGE_ZONES,
            (minute) => trafficFactorForTime(minute, trafficModel),
        );
        set({ coverageWarnings: warnings, ambulances: updated });
    },

    tick: (deltaMinutes?: number) => {
        const state = get();
        if (!state.running) return;

        // Fallback na speedMultiplier gdy komponent wywołuje tick() bez argumentu
        const delta = deltaMinutes ?? state.speedMultiplier;
        const newMinute = state.currentMinute + delta;
        const traffic = trafficFactorForTime(newMinute, state.trafficModel);
        const targetResponseMinutes = 8;
        const radius = coverageRadiusMeters(traffic, targetResponseMinutes);

        // ── 1. Update ambulance positions and statuses ────────────────────────────
        let ambulances = state.ambulances.map((amb): Ambulance => {
            const updated: Ambulance = {
                ...amb,
                trafficFactor: traffic,
                coverageRadiusMeters: radius,
            };

            // Handle break transitions
            const onBreak = !isAvailableAt(updated, newMinute);

            if (onBreak && amb.status !== 'on_break') {
                return { ...updated, status: 'on_break' };
            }
            if (!onBreak && amb.status === 'on_break') {
                return { ...updated, status: 'idle' };
            }
            if (onBreak) return updated;

            // Handle movement along route
            const isMoving =
                updated.status === 'en_route' ||
                updated.status === 'returning' ||
                updated.status === 'transporting';

            if (updated.routePath.length > 1 && isMoving) {
                return advanceAlongRoute(updated, traffic, delta); // ← delta, nie deltaMinutes
            }

            // on_scene → transporting (immediate in simulation)
            if (updated.status === 'on_scene') {
                return {
                    ...updated,
                    status: 'transporting',
                    routePath: [updated.position, updated.homeBase.position],
                    routeProgress: 0,
                };
            }

            return updated;
        });

        // ── 2. Dispatch pending incidents ───────────────────────────────────────
        let incidents = state.incidents.map((inc): Incident => {
            if (inc.status !== 'pending') return inc;

            const nearest = findNearestAvailableAmbulance(
                ambulances,
                inc,
                newMinute,
            );
            if (nearest === null) return inc;

            // Assign ambulance
            ambulances = ambulances.map((amb) =>
                amb.id !== nearest.id
                    ? amb
                    : {
                        ...amb,
                        status: 'en_route',
                        assignedIncidentId: inc.id,
                        routePath: [amb.position, inc.position],
                        routeProgress: 0,
                    },
            );

            return {
                ...inc,
                status: 'assigned',
                assignedAmbulanceId: nearest.id,
            };
        });

        // ── 3. Resolve incidents whose ambulance left the scene ─────────────────
        incidents = incidents.map((inc): Incident => {
            if (inc.status !== 'assigned') return inc;
            const amb = ambulances.find((a) => a.id === inc.assignedAmbulanceId);
            if (amb?.status === 'transporting' || amb?.status === 'returning') {
                return { ...inc, status: 'resolved' };
            }
            return inc;
        });

        set({ currentMinute: newMinute, ambulances, incidents });
    },
}));

// ─── Movement helper (pure function, easy to test in isolation) ───────────────

function advanceAlongRoute(
    amb: Ambulance,
    trafficFactor: number,
    deltaMinutes: number,
): Ambulance {
    const speedMps = (45 * trafficFactor) / 3.6;
    let distanceLeft = speedMps * deltaMinutes * 60;
    let idx = amb.routeProgress;
    let position = amb.position;

    while (distanceLeft > 0 && idx < amb.routePath.length - 1) {
        const segStart = amb.routePath[idx]!;
        const segEnd = amb.routePath[idx + 1]!;
        const segLength = distanceMeters(segStart, segEnd);

        if (distanceLeft >= segLength) {
            distanceLeft -= segLength;
            idx += 1;
            position = segEnd;
        } else {
            const ratio = distanceLeft / segLength;
            position = {
                lat: segStart.lat + (segEnd.lat - segStart.lat) * ratio,
                lng: segStart.lng + (segEnd.lng - segStart.lng) * ratio,
            };
            distanceLeft = 0;
        }
    }

    // Arrived at destination
    if (idx >= amb.routePath.length - 1) {
        return handleArrival(amb, position);
    }

    // Still moving — recompute ETA
    let remainingDist = 0;
    for (let i = idx; i < amb.routePath.length - 1; i++) {
        remainingDist += distanceMeters(amb.routePath[i]!, amb.routePath[i + 1]!);
    }

    return {
        ...amb,
        position,
        routeProgress: idx,
        etaSeconds: speedMps > 0 ? remainingDist / speedMps : null,
    };
}

function handleArrival(amb: Ambulance, position: Ambulance['position']): Ambulance {
    if (amb.status === 'en_route') {
        return {
            ...amb,
            position,
            status: 'on_scene',
            routePath: [],
            routeProgress: 0,
            etaSeconds: null,
        };
    }

    if (amb.status === 'transporting') {
        return {
            ...amb,
            position,
            status: 'returning',
            routePath: [position, amb.homeBase.position],
            routeProgress: 0,
            etaSeconds: null,
        };
    }

    // returning → idle
    return {
        ...amb,
        position: amb.homeBase.position,
        status: 'idle',
        routePath: [],
        routeProgress: 0,
        etaSeconds: null,
        assignedIncidentId: null,
    };
}