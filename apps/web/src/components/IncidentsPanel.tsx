import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/simStore';
import { formatSimTime } from '@sacs/core-logic';
import type { Incident } from '@sacs/shared-types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<Incident['priority'], string> = {
    critical: '#ef4444',
    urgent: '#f59e0b',
    standard: '#38bdf8',
};

const MAX_VISIBLE_INCIDENTS = 12;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface IncidentRowProps {
    incident: Incident;
    assignedCallSign: string | null;
}

function IncidentRow({ incident, assignedCallSign }: IncidentRowProps) {
    const { t } = useTranslation();

    return (
        <div data-testid="incident-row">
      <span
          style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: PRIORITY_COLORS[incident.priority],
              flexShrink: 0,
          }}
      />
            <div>
                <span>{incident.label}</span>
                <div>
          <span data-testid="incident-priority">
            {t(`priority.${incident.priority}`)}
          </span>
                    <span data-testid="incident-status">
            {t(`incidents.${incident.status}`)}
          </span>
                    <span>
            {t('incidents.createdAt')} {formatSimTime(incident.createdAtMinute)}
          </span>
                    {assignedCallSign !== null && (
                        <span data-testid="incident-assigned-to">
              {assignedCallSign}
            </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── IncidentsPanel ───────────────────────────────────────────────────────────

export default function IncidentsPanel() {
    const { t } = useTranslation();

    const incidents = useSimStore((s) => s.incidents);
    const ambulances = useSimStore((s) => s.ambulances);
    const addIncident = useSimStore((s) => s.addIncident);

    // Sort by createdAtMinute descending — most recent first
    const sortedIncidents = [...incidents]
        .sort((a, b) => b.createdAtMinute - a.createdAtMinute)
        .slice(0, MAX_VISIBLE_INCIDENTS);

    function resolveCallSign(ambulanceId: string | null): string | null {
        if (ambulanceId === null) return null;
        return ambulances.find((a) => a.id === ambulanceId)?.callSign ?? null;
    }

    function handleGenerateIncident() {
        const currentMinute = useSimStore.getState().currentMinute;
        addIncident({
            id: `inc-${Date.now()}`,
            position: {
                lat: 41.25 + Math.random() * 0.33,
                lng: 1.92 + Math.random() * 0.38,
            },
            priority: (['critical', 'urgent', 'urgent', 'standard', 'standard'] as const)[
                Math.floor(Math.random() * 5)
                ]!,
            createdAtMinute: currentMinute,
            status: 'pending',
            assignedAmbulanceId: null,
            label: t('incidents.generate'),
        });
    }

    return (
        <div data-testid="incidents-panel">
            <h3>{t('incidents.title')}</h3>

            <button onClick={handleGenerateIncident}>
                {t('incidents.generate')}
            </button>

            {sortedIncidents.length === 0 ? (
                <p data-testid="no-incidents-message">
                    {t('incidents.noIncidents')}
                </p>
            ) : (
                <div>
                    {sortedIncidents.map((incident) => (
                        <IncidentRow
                            key={incident.id}
                            incident={incident}
                            assignedCallSign={resolveCallSign(incident.assignedAmbulanceId)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}