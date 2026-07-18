import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSimStore } from '../simStore';

// Reset store do stanu początkowego przed każdym testem.
// Bez tego testy wpływają na siebie nawzajem — Zustand
// trzyma stan globalnie między testami.
beforeEach(() => {
    useSimStore.getState().reset();
});

describe('initial state', () => {
    it('starts with 8 ambulances', () => {
        const { ambulances } = useSimStore.getState();
        expect(ambulances).toHaveLength(8);
    });

    it('starts with simulation paused', () => {
        const { running } = useSimStore.getState();
        expect(running).toBe(false);
    });

    it('starts at minute 0', () => {
        const { currentMinute } = useSimStore.getState();
        expect(currentMinute).toBe(0);
    });

    it('all ambulances start with idle status', () => {
        const { ambulances } = useSimStore.getState();
        expect(ambulances.every((a) => a.status === 'idle')).toBe(true);
    });

    it('all ambulances start with no breaks', () => {
        const { ambulances } = useSimStore.getState();
        expect(ambulances.every((a) => a.breaks.length === 0)).toBe(true);
    });
});

describe('toggleRunning', () => {
    it('starts the simulation', () => {
        act(() => useSimStore.getState().toggleRunning());
        expect(useSimStore.getState().running).toBe(true);
    });

    it('pauses when called again', () => {
        act(() => {
            useSimStore.getState().toggleRunning();
            useSimStore.getState().toggleRunning();
        });
        expect(useSimStore.getState().running).toBe(false);
    });
});

describe('setSpeedMultiplier', () => {
    it('updates the speed multiplier', () => {
        act(() => useSimStore.getState().setSpeedMultiplier(5));
        expect(useSimStore.getState().speedMultiplier).toBe(5);
    });
});

describe('setTrafficModel', () => {
    it('updates the traffic model', () => {
        act(() => useSimStore.getState().setTrafficModel('pessimistic'));
        expect(useSimStore.getState().trafficModel).toBe('pessimistic');
    });
});

describe('addBreak', () => {
    it('adds a break to the correct ambulance', () => {
        const firstAmbulanceId = useSimStore.getState().ambulances[0]!.id;

        act(() => {
            useSimStore.getState().addBreak(firstAmbulanceId, 210, 30);
        });

        const ambulance = useSimStore
            .getState()
            .ambulances.find((a) => a.id === firstAmbulanceId);

        expect(ambulance?.breaks).toHaveLength(1);
        expect(ambulance?.breaks[0]?.startMinute).toBe(210);
        expect(ambulance?.breaks[0]?.durationMinutes).toBe(30);
    });

    it('does not add a break to other ambulances', () => {
        const firstAmbulanceId = useSimStore.getState().ambulances[0]!.id;

        act(() => {
            useSimStore.getState().addBreak(firstAmbulanceId, 210, 30);
        });

        const otherAmbulances = useSimStore
            .getState()
            .ambulances.filter((a) => a.id !== firstAmbulanceId);

        expect(otherAmbulances.every((a) => a.breaks.length === 0)).toBe(true);
    });
});

describe('removeBreak', () => {
    it('removes a break by id', () => {
        const firstAmbulanceId = useSimStore.getState().ambulances[0]!.id;

        act(() => useSimStore.getState().addBreak(firstAmbulanceId, 210, 30));

        const breakId = useSimStore.getState().ambulances[0]!.breaks[0]!.id;

        act(() => useSimStore.getState().removeBreak(breakId));

        expect(useSimStore.getState().ambulances[0]!.breaks).toHaveLength(0);
    });
});

describe('reset', () => {
    it('restores initial state after changes', () => {
        act(() => {
            useSimStore.getState().toggleRunning();
            useSimStore.getState().setSpeedMultiplier(10);
            useSimStore.getState().reset();
        });

        const state = useSimStore.getState();
        expect(state.running).toBe(false);
        expect(state.speedMultiplier).toBe(1);
        expect(state.currentMinute).toBe(0);
    });
});

describe('tick', () => {
    it('advances currentMinute by deltaMinutes when running', () => {
        act(() => {
            useSimStore.getState().toggleRunning();
            useSimStore.getState().tick(1);
        });
        expect(useSimStore.getState().currentMinute).toBe(1);
    });

    it('does not advance time when paused', () => {
        act(() => useSimStore.getState().tick(1));
        expect(useSimStore.getState().currentMinute).toBe(0);
    });

    it('updates ambulance trafficFactor after tick', () => {
        act(() => {
            useSimStore.getState().toggleRunning();
            useSimStore.getState().tick(1);
        });
        const { ambulances } = useSimStore.getState();
        ambulances.forEach((a) => {
            expect(a.trafficFactor).toBeGreaterThanOrEqual(0.3);
            expect(a.trafficFactor).toBeLessThanOrEqual(1.0);
        });
    });
});

describe('addIncident + dispatch', () => {
    it('adds a pending incident', () => {
        act(() => {
            useSimStore.getState().addIncident({
                id: 'inc-test-1',
                position: { lat: 41.39, lng: 2.17 },
                priority: 'urgent',
                createdAtMinute: 0,
                status: 'pending',
                assignedAmbulanceId: null,
                label: 'Test incident',
            });
        });

        const { incidents } = useSimStore.getState();
        expect(incidents).toHaveLength(1);
        expect(incidents[0]?.status).toBe('pending');
    });

    it('dispatches closest available ambulance to pending incident on tick', () => {
        act(() => {
            useSimStore.getState().addIncident({
                id: 'inc-test-2',
                position: { lat: 41.39, lng: 2.17 },
                priority: 'critical',
                createdAtMinute: 0,
                status: 'pending',
                assignedAmbulanceId: null,
                label: 'Test incident',
            });
            useSimStore.getState().toggleRunning();
            useSimStore.getState().tick(1);
        });

        const { incidents, ambulances } = useSimStore.getState();
        const incident = incidents[0];

        expect(incident?.status).toBe('assigned');
        expect(incident?.assignedAmbulanceId).not.toBeNull();

        const assignedAmb = ambulances.find(
            (a) => a.id === incident?.assignedAmbulanceId,
        );
        expect(assignedAmb?.status).toBe('en_route');
    });

    it('does not dispatch an ambulance that is on break', () => {
        const state = useSimStore.getState();

        // Put all ambulances except last one on break at minute 0
        const allButLast = state.ambulances.slice(0, 7);
        act(() => {
            allButLast.forEach((a) => state.addBreak(a.id, 0, 60));
        });

        // Find the one free ambulance
        const freeAmbulance = useSimStore.getState().ambulances[7]!;

        act(() => {
            useSimStore.getState().addIncident({
                id: 'inc-test-3',
                position: { lat: 41.39, lng: 2.17 },
                priority: 'urgent',
                createdAtMinute: 0,
                status: 'pending',
                assignedAmbulanceId: null,
                label: 'Test incident',
            });
            useSimStore.getState().toggleRunning();
            useSimStore.getState().tick(1);
        });

        const incident = useSimStore.getState().incidents[0];
        expect(incident?.assignedAmbulanceId).toBe(freeAmbulance.id);
    });
});