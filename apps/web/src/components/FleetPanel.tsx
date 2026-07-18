import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/simStore';
import type { Ambulance } from '@sacs/shared-types';

const STATUS_COLORS: Record<Ambulance['status'], string> = {
    idle:         'var(--green)',
    en_route:     'var(--amber)',
    on_scene:     'var(--orange)',
    transporting: 'var(--red)',
    returning:    'var(--blue)',
    on_break:     'var(--gray)',
};

function StatusDot({ status }: { status: Ambulance['status'] }) {
    return (
        <span
            className="status-dot"
            style={{ background: STATUS_COLORS[status] }}
        />
    );
}

function AmbulanceRow({ ambulance }: { ambulance: Ambulance }) {
    const { t } = useTranslation();

    const etaDisplay =
        ambulance.etaSeconds !== null
            ? `${Math.round(ambulance.etaSeconds / 60)} ${t('sim.minutes')}`
            : t('fleet.noEta');

    const coverageKm = (ambulance.coverageRadiusMeters / 1000).toFixed(1);

    return (
        <tr>
            <td className="mono" data-testid="ambulance-callsign">{ambulance.callSign}</td>
            <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {t(`bases.${ambulance.homeBase.id}`)}
            </td>
            <td data-testid="ambulance-status">
                <div className="status-cell">
                    <StatusDot status={ambulance.status} />
                    {t(`status.${ambulance.status}`)}
                </div>
            </td>
            <td className="mono" data-testid="ambulance-eta">{etaDisplay}</td>
            <td className="mono" data-testid="ambulance-coverage">{coverageKm} km</td>
            <td className="mono" data-testid="ambulance-traffic">
                {(ambulance.trafficFactor * 100).toFixed(0)}%
            </td>
        </tr>
    );
}

export default function FleetPanel() {
    const { t } = useTranslation();
    const ambulances = useSimStore((s) => s.ambulances);

    return (
        <div className="panel" data-testid="fleet-panel">
            <h3 className="panel__title">{t('fleet.title')}</h3>
            <table className="fleet-table">
                <thead>
                <tr>
                    <th>{t('fleet.callSign')}</th>
                    <th>{t('fleet.base')}</th>
                    <th>{t('fleet.status')}</th>
                    <th>{t('fleet.eta')}</th>
                    <th>{t('fleet.coverage')}</th>
                    <th>{t('fleet.traffic')}</th>
                </tr>
                </thead>
                <tbody>
                {ambulances.map((ambulance) => (
                    <AmbulanceRow key={ambulance.id} ambulance={ambulance} />
                ))}
                </tbody>
            </table>
        </div>
    );
}