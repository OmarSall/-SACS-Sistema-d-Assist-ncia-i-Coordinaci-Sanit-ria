import { describe, it, expect } from 'vitest';
import type { Ambulance, CoverageZone } from '@sacs/shared-types';
import {
    isAvailableAt,
    evaluateCoverageAtMinute,
    generateAutoBreakSchedule,
    validateBreakSchedule,
} from '../breakScheduler';
import { makeTestAmbulance, makeTestZone } from './fixtures';

describe('isAvailableAt', () => {
    it('returns true when ambulance has no breaks', () => {
        const amb = makeTestAmbulance({ breaks: [] });
        expect(isAvailableAt(amb, 100)).toBe(true);
    });

    it('returns false during a break window', () => {
        const amb = makeTestAmbulance({
            breaks: [{ id: 'b1', ambulanceId: 'a1', startMinute: 60, durationMinutes: 30, coverageOk: true }],
        });
        expect(isAvailableAt(amb, 60)).toBe(false);
        expect(isAvailableAt(amb, 75)).toBe(false);
        expect(isAvailableAt(amb, 89)).toBe(false);
    });

    it('returns true at the exact end minute of a break (end-exclusive)', () => {
        const amb = makeTestAmbulance({
            breaks: [{ id: 'b1', ambulanceId: 'a1', startMinute: 60, durationMinutes: 30, coverageOk: true }],
        });
        expect(isAvailableAt(amb, 90)).toBe(true);
    });

    it('returns true just before a break starts', () => {
        const amb = makeTestAmbulance({
            breaks: [{ id: 'b1', ambulanceId: 'a1', startMinute: 60, durationMinutes: 30, coverageOk: true }],
        });
        expect(isAvailableAt(amb, 59)).toBe(true);
    });
});

describe('evaluateCoverageAtMinute', () => {
    it('returns no warnings when all zones are covered', () => {
        const amb = makeTestAmbulance({ breaks: [] });
        const zone = makeTestZone({ requiredAmbulances: 1, targetResponseMinutes: 20 });
        const warnings = evaluateCoverageAtMinute([amb], [zone], 0, 1.0);
        expect(warnings).toHaveLength(0);
    });

    it('raises a warning when an ambulance is on break and zone is under-covered', () => {
        const amb = makeTestAmbulance({
            breaks: [{ id: 'b1', ambulanceId: 'a1', startMinute: 60, durationMinutes: 30, coverageOk: true }],
        });
        const zone = makeTestZone({ requiredAmbulances: 1, targetResponseMinutes: 20 });
        const warnings = evaluateCoverageAtMinute([amb], [zone], 75, 1.0);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]?.zoneId).toBe(zone.id);
        expect(warnings[0]?.availableCount).toBe(0);
        expect(warnings[0]?.requiredCount).toBe(1);
    });

    it('raises no warning when a second ambulance covers the zone', () => {
        const amb1 = makeTestAmbulance({
            id: 'a1',
            breaks: [{ id: 'b1', ambulanceId: 'a1', startMinute: 60, durationMinutes: 30, coverageOk: true }],
        });
        const amb2 = makeTestAmbulance({ id: 'a2', breaks: [] });
        const zone = makeTestZone({ requiredAmbulances: 1, targetResponseMinutes: 20 });
        const warnings = evaluateCoverageAtMinute([amb1, amb2], [zone], 75, 1.0);
        expect(warnings).toHaveLength(0);
    });
});

describe('generateAutoBreakSchedule', () => {
    it('generates exactly one break per ambulance', () => {
        const ambulances = Array.from({ length: 8 }, (_, i) =>
            makeTestAmbulance({ id: `a${i}` })
        );
        const breaks = generateAutoBreakSchedule(ambulances);
        for (const amb of ambulances) {
            const ambBreaks = breaks.filter((b) => b.ambulanceId === amb.id);
            expect(ambBreaks).toHaveLength(1);
        }
    });

    it('never schedules more than floor(N/4) ambulances on break simultaneously', () => {
        const n = 8;
        const maxSimultaneous = Math.floor(n / 4); // 2
        const ambulances = Array.from({ length: n }, (_, i) =>
            makeTestAmbulance({ id: `a${i}` })
        );
        const breaks = generateAutoBreakSchedule(ambulances);
        for (let minute = 0; minute < 720; minute++) {
            const onBreak = breaks.filter(
                (b) => minute >= b.startMinute && minute < b.startMinute + b.durationMinutes
            ).length;
            expect(onBreak).toBeLessThanOrEqual(maxSimultaneous);
        }
    });

    it('places no breaks during morning rush hour (min 90–210)', () => {
        const ambulances = Array.from({ length: 8 }, (_, i) =>
            makeTestAmbulance({ id: `a${i}` })
        );
        const breaks = generateAutoBreakSchedule(ambulances);
        for (const b of breaks) {
            const overlapsMorningRush =
                b.startMinute < 210 && b.startMinute + b.durationMinutes > 90;
            expect(overlapsMorningRush).toBe(false);
        }
    });
});

describe('validateBreakSchedule', () => {
    it('returns zero warnings for a safe schedule', () => {
        const ambulances = Array.from({ length: 8 }, (_, i) =>
            makeTestAmbulance({ id: `a${i}` })
        );
        const autoBreaks = generateAutoBreakSchedule(ambulances);
        const ambs = ambulances.map((a) => ({
            ...a,
            breaks: autoBreaks.filter((b) => b.ambulanceId === a.id),
        }));
        const zones = [makeTestZone({ requiredAmbulances: 2, targetResponseMinutes: 20 })];
        const { warnings } = validateBreakSchedule(ambs, zones, () => 1.0);
        expect(warnings).toHaveLength(0);
    });

    it('returns warnings when too many ambulances are on break', () => {
        // Put ALL ambulances on break at minute 300 — certain violation
        const ambulances = Array.from({ length: 4 }, (_, i) =>
            makeTestAmbulance({
                id: `a${i}`,
                breaks: [{ id: `b${i}`, ambulanceId: `a${i}`, startMinute: 298, durationMinutes: 10, coverageOk: true }],
            })
        );
        const zones = [makeTestZone({ requiredAmbulances: 1, targetResponseMinutes: 20 })];
        const { warnings } = validateBreakSchedule(ambulances, zones, () => 1.0);
        expect(warnings.length).toBeGreaterThan(0);
    });
});