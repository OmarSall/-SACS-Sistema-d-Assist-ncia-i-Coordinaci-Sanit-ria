import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/simStore';
import { COVERAGE_ZONES } from '../data/locations';
import type { CoverageZone } from '@sacs/shared-types';

interface CoverageCardProps {
    zone: CoverageZone;
    isWarning: boolean;
}

function CoverageCard({ zone, isWarning }: CoverageCardProps) {
    const { t } = useTranslation();
    const testId = isWarning ? 'coverage-card-warning' : 'coverage-card';

    return (
        <div
            className={`coverage-card ${isWarning ? 'coverage-card--warning' : ''}`}
            data-testid={testId}
        >
            <p className="coverage-card__name">{t(`zones.${zone.id}`)}</p>
            <div className="coverage-card__stats">
        <span className="coverage-card__stat">
          {t('coverage.required')}: <strong>{zone.requiredAmbulances}</strong>
        </span>
                <span className="coverage-card__stat">
          {t('coverage.target')}: <strong>{zone.targetResponseMinutes} {t('sim.minutes')}</strong>
        </span>
            </div>
        </div>
    );
}

export default function CoveragePanel() {
    const { t } = useTranslation();
    const coverageWarnings = useSimStore((s) => s.coverageWarnings);

    const warningZoneIds       = new Set(coverageWarnings.map((w) => w.zoneId));
    const uniqueWarningCount   = warningZoneIds.size;

    return (
        <div className="panel" data-testid="coverage-panel">
            <h3 className="panel__title">{t('coverage.title')}</h3>
            <p className="panel__desc">{t('coverage.description')}</p>

            <div className="coverage-summary">
        <span
            className={`coverage-summary__count ${uniqueWarningCount === 0 ? 'coverage-summary__count--ok' : ''}`}
            data-testid="warnings-count"
        >
          {uniqueWarningCount}
        </span>
                <span>{t('coverage.warnings')}</span>
            </div>

            <div className="coverage-grid">
                {COVERAGE_ZONES.map((zone) => (
                    <CoverageCard
                        key={zone.id}
                        zone={zone}
                        isWarning={warningZoneIds.has(zone.id)}
                    />
                ))}
            </div>

            <div>
                <p className="coverage-warnings__title">{t('coverage.warnings')}</p>
                {uniqueWarningCount === 0 ? (
                    <p className="coverage-warnings__empty">{t('coverage.noWarnings')}</p>
                ) : (
                    <ul className="coverage-warnings__list">
                        {[...warningZoneIds].map((zoneId) => {
                            const warning = coverageWarnings.find((w) => w.zoneId === zoneId);
                            if (!warning) return null;
                            return (
                                <li key={zoneId} className="coverage-warnings__item">
                                    {t(`zones.${zoneId}`)} — {warning.availableCount}/{warning.requiredCount}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}