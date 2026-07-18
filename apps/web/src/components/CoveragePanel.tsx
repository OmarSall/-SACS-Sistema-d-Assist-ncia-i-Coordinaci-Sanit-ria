import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/simStore';
import { COVERAGE_ZONES } from '../data/locations';
import type { CoverageZone } from '@sacs/shared-types';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface CoverageCardProps {
    zone: CoverageZone;
    isWarning: boolean;
}

function CoverageCard({ zone, isWarning }: CoverageCardProps) {
    const { t } = useTranslation();
    const testId = isWarning ? 'coverage-card-warning' : 'coverage-card';

    return (
        <div data-testid={testId}>
            <span>{t(`zones.${zone.id}`)}</span>
            <div>
        <span>
          {t('coverage.required')}: <strong>{zone.requiredAmbulances}</strong>
        </span>
                <span>
          {t('coverage.target')}: <strong>{zone.targetResponseMinutes} {t('sim.minutes')}</strong>
        </span>
            </div>
        </div>
    );
}

// ─── CoveragePanel ────────────────────────────────────────────────────────────

export default function CoveragePanel() {
    const { t } = useTranslation();
    const coverageWarnings = useSimStore((s) => s.coverageWarnings);

    const warningZoneIds = new Set(coverageWarnings.map((w) => w.zoneId));

    // Unique warning count — one per zone, not per sample minute
    const uniqueWarningZoneCount = warningZoneIds.size;

    return (
        <div data-testid="coverage-panel">
            <h3>{t('coverage.title')}</h3>
            <p>{t('coverage.description')}</p>

            {/* ── Warning counter ── */}
            <div>
                <span>{t('coverage.warnings')}: </span>
                <span data-testid="warnings-count">{uniqueWarningZoneCount}</span>
            </div>

            {/* ── Zone cards ── */}
            <div>
                {COVERAGE_ZONES.map((zone) => (
                    <CoverageCard
                        key={zone.id}
                        zone={zone}
                        isWarning={warningZoneIds.has(zone.id)}
                    />
                ))}
            </div>

            {/* ── Warning list ── */}
            {uniqueWarningZoneCount === 0 ? (
                <p>{t('coverage.noWarnings')}</p>
            ) : (
                <ul>
                    {[...warningZoneIds].map((zoneId) => {
                        const warning = coverageWarnings.find((w) => w.zoneId === zoneId);
                        if (!warning) return null;
                        return (
                            <li key={zoneId}>
                                {t(`zones.${zoneId}`)} — {warning.availableCount}/{warning.requiredCount}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}