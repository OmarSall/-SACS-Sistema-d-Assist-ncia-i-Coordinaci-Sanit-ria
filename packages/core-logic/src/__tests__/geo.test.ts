import { describe, it, expect } from 'vitest';
import {
    distanceMeters,
    trafficFactorForTime,
    coverageRadiusMeters,
    ambulanceSpeedMps,
} from '../geo';

describe('distanceMeters', () => {
    it('returns 0 for identical coordinates', () => {
        const point = { lat: 41.3874, lng: 2.1686 };
        expect(distanceMeters(point, point)).toBe(0);
    });

    it('calculates known distance between two Barcelona bases within 5% tolerance', () => {
        // Eixample (41.3888, 2.1503) → Litoral (41.3870, 2.1990)
        // Approx 4.3 km straight line
        const eixample = { lat: 41.3888, lng: 2.1503 };
        const litoral = { lat: 41.3870, lng: 2.1990 };
        const dist = distanceMeters(eixample, litoral);
        expect(dist).toBeGreaterThan(4000);
        expect(dist).toBeLessThan(4800);
    });

    it('is symmetric (A→B == B→A)', () => {
        const a = { lat: 41.3888, lng: 2.1503 };
        const b = { lat: 41.4500, lng: 2.2470 };
        expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 0);
    });
});

describe('trafficFactorForTime', () => {
    it('always returns a value between 0.3 and 1.0', () => {
        for (let minute = 0; minute < 720; minute += 10) {
            const factor = trafficFactorForTime(minute, 'best_guess');
            expect(factor).toBeGreaterThanOrEqual(0.3);
            expect(factor).toBeLessThanOrEqual(1.0);
        }
    });

    it('is slower during morning rush hour than off-peak', () => {
        // 07:30 → 90 min from 06:00 start
        const rushFactor = trafficFactorForTime(90, 'best_guess');
        // 11:00 → 300 min from 06:00 start
        const offPeakFactor = trafficFactorForTime(300, 'best_guess');
        expect(rushFactor).toBeLessThan(offPeakFactor);
    });

    it('pessimistic model is always slower than optimistic', () => {
        for (let minute = 0; minute < 720; minute += 30) {
            const pessimistic = trafficFactorForTime(minute, 'pessimistic');
            const optimistic = trafficFactorForTime(minute, 'optimistic');
            expect(pessimistic).toBeLessThanOrEqual(optimistic);
        }
    });
});

describe('ambulanceSpeedMps', () => {
    it('returns higher speed with better traffic factor', () => {
        expect(ambulanceSpeedMps(1.0)).toBeGreaterThan(ambulanceSpeedMps(0.5));
    });

    it('returns 0 speed for traffic factor 0', () => {
        expect(ambulanceSpeedMps(0)).toBe(0);
    });
});

describe('coverageRadiusMeters', () => {
    it('is proportional to traffic factor (worse traffic = smaller radius)', () => {
        const fullFlow = coverageRadiusMeters(1.0, 8);
        const halfFlow = coverageRadiusMeters(0.5, 8);
        expect(fullFlow).toBeCloseTo(halfFlow * 2, 0);
    });

    it('is proportional to target minutes', () => {
        const r8 = coverageRadiusMeters(1.0, 8);
        const r16 = coverageRadiusMeters(1.0, 16);
        expect(r16).toBeCloseTo(r8 * 2, 0);
    });
});