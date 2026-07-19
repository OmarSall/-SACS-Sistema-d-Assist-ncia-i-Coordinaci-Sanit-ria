import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/simStore';
import { formatSimTime } from '@sacs/core-logic';
import type { Incident } from '@sacs/shared-types';
import { randomIncidentLocation } from '../data/locations';

const PRIORITY_COLORS: Record<Incident['priority'], string> = {
    critical: 'var(--red)',
    urgent:   'var(--amber)',
    standard: 'var(--accent)',
};

const MAX_VISIBLE_INCIDENTS = 12;

interface IncidentRowProps {
    incident: Incident;
    assignedCallSign: string | null;
}

function IncidentRow({ incident, assignedCallSign }: IncidentRowProps) {
    const { t } = useTranslation();

    return (
        <div className="incident-row" data-testid="incident-row">
      <span
          className="incident-priority-dot"
          style={{ background: PRIORITY_COLORS[incident.priority] }}
      />
            <div className="incident-info">
                <span className="incident-label">{incident.label}</span>
                <div className="incident-meta">
          <span
              className={`incident-badge incident-badge--${incident.priority}`}
              data-testid="incident-priority"
          >
            {t(`priority.${incident.priority}`)}
          </span>
                    <span
                        className={`incident-badge incident-badge--${incident.status}`}
                        data-testid="incident-status"
                    >
            {t(`incidents.${incident.status}`)}
          </span>
                    <span className="incident-time">
            {formatSimTime(incident.createdAtMinute)}
          </span>
                    {assignedCallSign !== null && (
                        <span className="incident-assigned" data-testid="incident-assigned-to">
              {assignedCallSign}
            </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function IncidentsPanel() {
    const { t } = useTranslation();

    const incidents  = useSimStore((s) => s.incidents);
    const ambulances = useSimStore((s) => s.ambulances);
    const addIncident = useSimStore((s) => s.addIncident);

    const sortedIncidents = [...incidents]
        .sort((a, b) => b.createdAtMinute - a.createdAtMinute)
        .slice(0, MAX_VISIBLE_INCIDENTS);

    function resolveCallSign(ambulanceId: string | null): string | null {
        if (ambulanceId === null) return null;
        return ambulances.find((a) => a.id === ambulanceId)?.callSign ?? null;
    }

    function handleGenerateIncident() {
        const currentMinute = useSimStore.getState().currentMinute;
        const priorities = ['critical', 'urgent', 'urgent', 'standard', 'standard'] as const;

        addIncident({
            id: `inc-${Date.now()}`,
            position: randomIncidentLocation(),
            priority: priorities[Math.floor(Math.random() * priorities.length)]!,
            createdAtMinute: currentMinute,
            status: 'pending',
            assignedAmbulanceId: null,
            label: t('incidents.generate'),
        });
    }

    return (
        <div className="panel" data-testid="incidents-panel">
            <div className="incidents-header">
                <h3 className="panel__title" style={{ marginBottom: 0 }}>
                    {t('incidents.title')}
                </h3>
                <button className="btn btn--danger" onClick={handleGenerateIncident}>
                    {t('incidents.generate')}
                </button>
            </div>

            {sortedIncidents.length === 0 ? (
                <p className="incidents-empty" data-testid="no-incidents-message">
                    {t('incidents.noIncidents')}
                </p>
            ) : (
                <div className="incidents-list">
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