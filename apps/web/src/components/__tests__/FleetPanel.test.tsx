import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { act } from '@testing-library/react';
import FleetPanel from '../FleetPanel';
import { useSimStore } from '../../store/simStore';
import i18n from '../../i18n';

beforeEach(() => {
    useSimStore.getState().reset();
    void i18n.changeLanguage('es');
});

describe('FleetPanel', () => {
    describe('fleet list', () => {
        it('renders a row for each ambulance', () => {
            render(<FleetPanel />);
            const rows = screen.getAllByRole('row');
            // 8 ambulances + 1 header row
            expect(rows).toHaveLength(9);
        });

        it('displays call sign for each ambulance', () => {
            render(<FleetPanel />);
            expect(screen.getByText('SEM-01')).toBeInTheDocument();
            expect(screen.getByText('SEM-08')).toBeInTheDocument();
        });

        it('displays idle status for all ambulances at start', () => {
            render(<FleetPanel />);
            const statusCells = screen.getAllByTestId('ambulance-status');
            statusCells.forEach((cell) => {
                expect(cell).toHaveTextContent(/disponible en base/i);
            });
        });

        it('displays dash when ambulance has no ETA', () => {
            render(<FleetPanel />);
            const etaCells = screen.getAllByTestId('ambulance-eta');
            etaCells.forEach((cell) => {
                expect(cell).toHaveTextContent('—');
            });
        });
    });

    describe('status updates', () => {
        it('updates status display after ambulance is dispatched', () => {
            render(<FleetPanel />);

            act(() => {
                useSimStore.getState().addIncident({
                    id: 'inc-1',
                    position: { lat: 41.39, lng: 2.17 },
                    priority: 'critical',
                    createdAtMinute: 0,
                    status: 'pending',
                    assignedAmbulanceId: null,
                    label: 'Test',
                });
                useSimStore.getState().toggleRunning();
                useSimStore.getState().tick(1);
            });

            const statusCells = screen.getAllByTestId('ambulance-status');
            const enRouteCells = statusCells.filter((cell) =>
                cell.textContent?.match(/en camino/i),
            );
            expect(enRouteCells.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('break indicator', () => {
        it('shows on-break status when ambulance is on break', () => {
            render(<FleetPanel />);

            const firstAmbulanceId = useSimStore.getState().ambulances[0]!.id;

            act(() => {
                useSimStore.getState().addBreak(firstAmbulanceId, 0, 60);
                useSimStore.getState().toggleRunning();
                useSimStore.getState().tick(1);
            });

            const statusCells = screen.getAllByTestId('ambulance-status');
            const onBreakCell = statusCells[0];
            expect(onBreakCell).toHaveTextContent(/en descanso/i);
        });
    });

    describe('coverage radius', () => {
        it('displays coverage radius in km', () => {
            render(<FleetPanel />);
            const coverageCells = screen.getAllByTestId('ambulance-coverage');
            coverageCells.forEach((cell) => {
                expect(cell.textContent).toMatch(/\d+(\.\d+)?\s*km/i);
            });
        });
    });
});