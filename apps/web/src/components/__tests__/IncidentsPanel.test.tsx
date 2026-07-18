import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from '@testing-library/react';
import IncidentsPanel from '../IncidentsPanel';
import { useSimStore } from '../../store/simStore';
import i18n from '../../i18n';
import type { Incident } from '@sacs/shared-types';

beforeEach(() => {
    useSimStore.getState().reset();
    void i18n.changeLanguage('es');
});

const makeIncident = (overrides: Partial<Incident> = {}): Incident => ({
    id: 'inc-1',
    position: { lat: 41.39, lng: 2.17 },
    priority: 'urgent',
    createdAtMinute: 0,
    status: 'pending',
    assignedAmbulanceId: null,
    label: 'Dificultad respiratoria',
    ...overrides,
});

describe('IncidentsPanel', () => {
    describe('initial render', () => {
        it('renders the panel title', () => {
            render(<IncidentsPanel />);
            expect(
                screen.getByRole('heading', { name: /incidentes/i }),
            ).toBeInTheDocument();
        });

        it('shows empty state when no incidents', () => {
            render(<IncidentsPanel />);
            expect(
                screen.getByTestId('no-incidents-message'),
            ).toBeInTheDocument();
        });

        it('renders generate incident button', () => {
            render(<IncidentsPanel />);
            expect(
                screen.getByRole('button', { name: /generar incidente aleatorio/i }),
            ).toBeInTheDocument();
        });
    });

    describe('incident list', () => {
        it('renders a row for each incident', () => {
            act(() => {
                useSimStore.getState().addIncident(makeIncident({ id: 'inc-1' }));
                useSimStore.getState().addIncident(makeIncident({ id: 'inc-2' }));
            });

            render(<IncidentsPanel />);

            const rows = screen.getAllByTestId('incident-row');
            expect(rows).toHaveLength(2);
        });

        it('displays incident label', () => {
            act(() => {
                useSimStore.getState().addIncident(
                    makeIncident({ label: 'Parada cardiorespiratoria' }),
                );
            });

            render(<IncidentsPanel />);
            expect(
                screen.getByText('Parada cardiorespiratoria'),
            ).toBeInTheDocument();
        });

        it('displays incident priority', () => {
            act(() => {
                useSimStore.getState().addIncident(
                    makeIncident({ priority: 'critical' }),
                );
            });

            render(<IncidentsPanel />);
            expect(
                screen.getByTestId('incident-priority'),
            ).toHaveTextContent(/crítica/i);
        });

        it('displays incident status', () => {
            act(() => {
                useSimStore.getState().addIncident(makeIncident());
            });

            render(<IncidentsPanel />);
            expect(
                screen.getByTestId('incident-status'),
            ).toHaveTextContent(/pendiente/i);
        });

        it('shows most recent incident first', () => {
            act(() => {
                useSimStore.getState().addIncident(
                    makeIncident({ id: 'inc-old', label: 'Primero', createdAtMinute: 0 }),
                );
                useSimStore.getState().addIncident(
                    makeIncident({ id: 'inc-new', label: 'Segundo', createdAtMinute: 10 }),
                );
            });

            render(<IncidentsPanel />);

            const rows = screen.getAllByTestId('incident-row');
            expect(rows[0]).toHaveTextContent('Segundo');
            expect(rows[1]).toHaveTextContent('Primero');
        });
    });

    describe('assigned incident', () => {
        it('shows assigned ambulance call sign', () => {
            act(() => {
                useSimStore.getState().addIncident(
                    makeIncident({ status: 'assigned', assignedAmbulanceId: 'amb-1' }),
                );
            });

            render(<IncidentsPanel />);

            expect(
                screen.getByTestId('incident-status'),
            ).toHaveTextContent(/asignado/i);

            expect(
                screen.getByTestId('incident-assigned-to'),
            ).toHaveTextContent('SEM-01');
        });
    });

    describe('resolved incident', () => {
        it('shows resolved status', () => {
            act(() => {
                useSimStore.getState().addIncident(
                    makeIncident({ status: 'resolved' }),
                );
            });

            render(<IncidentsPanel />);
            expect(
                screen.getByTestId('incident-status'),
            ).toHaveTextContent(/resuelto/i);
        });
    });
});