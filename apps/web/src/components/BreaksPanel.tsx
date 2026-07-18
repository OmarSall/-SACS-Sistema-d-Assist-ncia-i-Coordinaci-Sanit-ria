import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/simStore';
import { formatSimTime } from '@sacs/core-logic';
import type { Ambulance, BreakWindow } from '@sacs/shared-types';

const DEFAULT_START_MINUTE = 210;
const DEFAULT_DURATION_MINUTES = 30;

interface BreakChipProps {
    breakWindow: BreakWindow;
    onRemove: (breakId: string) => void;
}

function BreakChip({ breakWindow, onRemove }: BreakChipProps) {
    const testId = breakWindow.coverageOk ? 'break-chip' : 'break-chip-conflict';
    const label = `${formatSimTime(breakWindow.startMinute)} → ${formatSimTime(
        breakWindow.startMinute + breakWindow.durationMinutes,
    )}`;

    return (
        <span
            className={`break-chip ${!breakWindow.coverageOk ? 'break-chip--conflict' : ''}`}
            data-testid={testId}
        >
      {label}
            <button
                className="chip-remove"
                onClick={() => onRemove(breakWindow.id)}
                aria-label="×"
            >
        ×
      </button>
    </span>
    );
}

interface AmbulanceBreakRowProps {
    ambulance: Ambulance;
    onRemove: (breakId: string) => void;
}

function AmbulanceBreakRow({ ambulance, onRemove }: AmbulanceBreakRowProps) {
    const { t } = useTranslation();
    const hasBreaks = ambulance.breaks.length > 0;

    return (
        <div className="break-group" data-testid={`break-row-${ambulance.id}`}>
            <span className="break-group__label">{ambulance.callSign}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {hasBreaks ? (
                    ambulance.breaks.map((b) => (
                        <BreakChip key={b.id} breakWindow={b} onRemove={onRemove} />
                    ))
                ) : (
                    <span className="break-group__empty">{t('breaks.noBreaks')}</span>
                )}
            </div>
        </div>
    );
}

function CoverageStatusBadge({ hasConflicts }: { hasConflicts: boolean }) {
    const { t } = useTranslation();
    return (
        <span
            className={`coverage-badge ${hasConflicts ? 'coverage-badge--conflict' : 'coverage-badge--ok'}`}
            data-testid="coverage-status-badge"
        >
      {hasConflicts ? t('breaks.statusConflict') : t('breaks.statusOk')}
    </span>
    );
}

export default function BreaksPanel() {
    const { t } = useTranslation();

    const ambulances      = useSimStore((s) => s.ambulances);
    const coverageWarnings = useSimStore((s) => s.coverageWarnings);
    const addBreak        = useSimStore((s) => s.addBreak);
    const removeBreak     = useSimStore((s) => s.removeBreak);
    const autoSchedule    = useSimStore((s) => s.autoSchedule);
    const validateCoverage = useSimStore((s) => s.validateCoverage);

    const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>(
        ambulances[0]?.id ?? '',
    );
    const [startMinute, setStartMinute]         = useState(DEFAULT_START_MINUTE);
    const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);

    const hasConflicts = coverageWarnings.length > 0;

    function handleAddBreak() {
        if (!selectedAmbulanceId) return;
        addBreak(selectedAmbulanceId, startMinute, durationMinutes);
    }

    function handleRemoveBreak(breakId: string) {
        removeBreak(breakId);
    }

    return (
        <div className="panel" data-testid="breaks-panel">
            <h3 className="panel__title">{t('breaks.title')}</h3>
            <p className="panel__desc">{t('breaks.description')}</p>

            <div className="breaks-actions">
                <button className="btn btn--primary" onClick={autoSchedule}>
                    {t('breaks.autoSchedule')}
                </button>
                <button className="btn" onClick={validateCoverage}>
                    {t('breaks.validate')}
                </button>
                <CoverageStatusBadge hasConflicts={hasConflicts} />
            </div>

            <div className="break-form">
                <div className="break-form__field">
                    <span className="break-form__label">Ambulancia</span>
                    <select
                        className="select"
                        data-testid="ambulance-selector"
                        value={selectedAmbulanceId}
                        onChange={(e) => setSelectedAmbulanceId(e.target.value)}
                    >
                        {ambulances.map((amb) => (
                            <option key={amb.id} value={amb.id}>{amb.callSign}</option>
                        ))}
                    </select>
                </div>

                <div className="break-form__field">
                    <span className="break-form__label">{t('breaks.start')}</span>
                    <input
                        className="num-input"
                        type="number"
                        min={0}
                        max={719}
                        value={startMinute}
                        onChange={(e) => setStartMinute(Number(e.target.value))}
                    />
                </div>

                <div className="break-form__field">
                    <span className="break-form__label">{t('breaks.duration')}</span>
                    <input
                        className="num-input"
                        type="number"
                        min={5}
                        max={120}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    />
                </div>

                <button className="btn btn--primary" onClick={handleAddBreak}>
                    {t('breaks.addBreak')}
                </button>
            </div>

            <div className="break-list">
                {ambulances.map((amb) => (
                    <AmbulanceBreakRow
                        key={amb.id}
                        ambulance={amb}
                        onRemove={handleRemoveBreak}
                    />
                ))}
            </div>
        </div>
    );
}