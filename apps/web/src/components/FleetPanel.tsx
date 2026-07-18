import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/simStore';
import type { Ambulance } from '@sacs/shared-types';

// ─── Status color mapping ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<Ambulance['status'], string> = {
    idle: '#34d399',
    en_route: '#fbbf24',
    on_scene: '#f97316',
    transporting: '#f87171',
    returning: '#60a5fa',
    on_break: '#94a3b8',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: Ambulance['status'] }) {
    return (
        <span
            style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: STATUS_COLORS[status],
                marginRight: 6,
                flexShrink: 0,
            }}
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
            <td data-testid="ambulance-callsign">{ambulance.callSign}</td>
            <td>{t(`bases.${ambulance.homeBase.id}`)}</td>
            <td data-testid="ambulance-status">
                <StatusDot status={ambulance.status} />
                {t(`status.${ambulance.status}`)}
            </td>
            <td data-testid="ambulance-eta">{etaDisplay}</td>
            <td data-testid="ambulance-coverage">{coverageKm} km</td>
            <td data-testid="ambulance-traffic">
                {(ambulance.trafficFactor * 100).toFixed(0)}%
            </td>
        </tr>
    );
}

// ─── FleetPanel ───────────────────────────────────────────────────────────────

export default function FleetPanel() {
    const { t } = useTranslation();
    const ambulances = useSimStore((s) => s.ambulances);

    return (
        <div data-testid="fleet-panel">
            <h3>{t('fleet.title')}</h3>
            <table>
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