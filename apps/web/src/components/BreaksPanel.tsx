import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/simStore';
import { formatSimTime } from '@sacs/core-logic';
import type { Ambulance, BreakWindow } from '@sacs/shared-types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_START_MINUTE = 210; // 09:30 — after morning rush
const DEFAULT_DURATION_MINUTES = 30;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface BreakChipProps {
    breakWindow: BreakWindow;
    onRemove: (breakId: string) => void;
}

function BreakChip({ breakWindow, onRemove }: BreakChipProps) {
    const { t } = useTranslation();
    const testId = breakWindow.coverageOk ? 'break-chip' : 'break-chip-conflict';
    const label = `${formatSimTime(breakWindow.startMinute)} → ${formatSimTime(
        breakWindow.startMinute + breakWindow.durationMinutes,
    )}`;

    return (
        <span data-testid={testId}>
      {label}
            <button
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
        <div data-testid={`break-row-${ambulance.id}`}>
            <span>{ambulance.callSign}</span>
            <div>
                {hasBreaks ? (
                    ambulance.breaks.map((b) => (
                        <BreakChip key={b.id} breakWindow={b} onRemove={onRemove} />
                    ))
                ) : (
                    <span>{t('breaks.noBreaks')}</span>
                )}
            </div>
        </div>
    );
}

interface CoverageStatusBadgeProps {
    hasConflicts: boolean;
}

function CoverageStatusBadge({ hasConflicts }: CoverageStatusBadgeProps) {
    const { t } = useTranslation();

    return (
        <span data-testid="coverage-status-badge">
      {hasConflicts ? t('breaks.statusConflict') : t('breaks.statusOk')}
    </span>
    );
}

// ─── BreaksPanel ──────────────────────────────────────────────────────────────

export default function BreaksPanel() {
    const { t } = useTranslation();

    const ambulances = useSimStore((s) => s.ambulances);
    const coverageWarnings = useSimStore((s) => s.coverageWarnings);
    const addBreak = useSimStore((s) => s.addBreak);
    const removeBreak = useSimStore((s) => s.removeBreak);
    const autoSchedule = useSimStore((s) => s.autoSchedule);
    const validateCoverage = useSimStore((s) => s.validateCoverage);

    const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string>(
        ambulances[0]?.id ?? '',
    );
    const [startMinute, setStartMinute] = useState(DEFAULT_START_MINUTE);
    const [durationMinutes, setDurationMinutes] = useState(
        DEFAULT_DURATION_MINUTES,
    );

    const hasConflicts = coverageWarnings.length > 0;

    function handleAddBreak() {
        if (!selectedAmbulanceId) return;
        addBreak(selectedAmbulanceId, startMinute, durationMinutes);
        // Celowo bez validateCoverage() — user kliknie "Validar" gdy chce sprawdzić
    }

    function handleRemoveBreak(breakId: string) {
        removeBreak(breakId);
    }

    function handleAutoSchedule() {
        autoSchedule();
    }

    return (
        <div data-testid="breaks-panel">
            <h3>{t('breaks.title')}</h3>
            <p>{t('breaks.description')}</p>

            {/* ── Actions row ── */}
            <div>
                <button onClick={handleAutoSchedule}>
                    {t('breaks.autoSchedule')}
                </button>
                <button onClick={validateCoverage}>
                    {t('breaks.validate')}
                </button>
                <CoverageStatusBadge hasConflicts={hasConflicts} />
            </div>

            {/* ── Add break form ── */}
            <div>
                <select
                    data-testid="ambulance-selector"
                    value={selectedAmbulanceId}
                    onChange={(e) => setSelectedAmbulanceId(e.target.value)}
                >
                    {ambulances.map((amb) => (
                        <option key={amb.id} value={amb.id}>
                            {amb.callSign}
                        </option>
                    ))}
                </select>

                <label>
                    {t('breaks.start')}
                    <input
                        type="number"
                        min={0}
                        max={719}
                        value={startMinute}
                        onChange={(e) => setStartMinute(Number(e.target.value))}
                    />
                </label>

                <label>
                    {t('breaks.duration')}
                    <input
                        type="number"
                        min={5}
                        max={120}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    />
                </label>

                <button onClick={handleAddBreak}>
                    {t('breaks.addBreak')}
                </button>
            </div>

            {/* ── Break list per ambulance ── */}
            <div>
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