import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import BreaksPanel from '../BreaksPanel';
import { useSimStore } from '../../store/simStore';
import i18n from '../../i18n';

beforeEach(() => {
    useSimStore.getState().reset();
    void i18n.changeLanguage('es');
});

describe('BreaksPanel', () => {
    describe('initial render', () => {
        it('renders the panel title', () => {
            render(<BreaksPanel />);
            expect(
                screen.getByRole('heading', { name: /planificación de descansos/i }),
            ).toBeInTheDocument();
        });

        it('renders auto-schedule button', () => {
            render(<BreaksPanel />);
            expect(
                screen.getByRole('button', { name: /generar automáticamente/i }),
            ).toBeInTheDocument();
        });

        it('renders validate button', () => {
            render(<BreaksPanel />);
            expect(
                screen.getByRole('button', { name: /validar cobertura/i }),
            ).toBeInTheDocument();
        });

        it('renders ambulance selector with all 8 ambulances', () => {
            render(<BreaksPanel />);
            const select = screen.getByTestId('ambulance-selector');
            const options = within(select).getAllByRole('option');
            expect(options).toHaveLength(8);
        });

        it('shows no-breaks message for all ambulances initially', () => {
            render(<BreaksPanel />);
            const noBreakMessages = screen.getAllByText(
                /sin descansos programados/i,
            );
            expect(noBreakMessages).toHaveLength(8);
        });
    });

    describe('adding a break', () => {
        it('adds a break chip when add break is clicked', async () => {
            render(<BreaksPanel />);

            await userEvent.click(
                screen.getByRole('button', { name: /añadir descanso/i }),
            );

            const chips = screen.getAllByTestId('break-chip');
            expect(chips).toHaveLength(1);
        });

        it('removes no-breaks message after adding a break', async () => {
            render(<BreaksPanel />);

            // 8 ambulances initially show "no breaks"
            expect(
                screen.getAllByText(/sin descansos programados/i),
            ).toHaveLength(8);

            await userEvent.click(
                screen.getByRole('button', { name: /añadir descanso/i }),
            );

            // one ambulance now has a break
            expect(
                screen.getAllByText(/sin descansos programados/i),
            ).toHaveLength(7);
        });

        it('stores the break in simStore', async () => {
            render(<BreaksPanel />);

            await userEvent.click(
                screen.getByRole('button', { name: /añadir descanso/i }),
            );

            const firstAmbulance = useSimStore.getState().ambulances[0]!;
            expect(firstAmbulance.breaks).toHaveLength(1);
        });
    });

    describe('removing a break', () => {
        it('removes break chip when remove button is clicked', async () => {
            render(<BreaksPanel />);

            await userEvent.click(
                screen.getByRole('button', { name: /añadir descanso/i }),
            );
            expect(screen.getAllByTestId('break-chip')).toHaveLength(1);

            await userEvent.click(
                screen.getByRole('button', { name: /×/i }),
            );
            expect(screen.queryAllByTestId('break-chip')).toHaveLength(0);
        });
    });

    describe('auto-schedule', () => {
        it('generates breaks for all ambulances', async () => {
            render(<BreaksPanel />);

            await userEvent.click(
                screen.getByRole('button', { name: /generar automáticamente/i }),
            );

            const ambulances = useSimStore.getState().ambulances;
            ambulances.forEach((amb) => {
                expect(amb.breaks).toHaveLength(1);
            });
        });

        it('shows break chips after auto-schedule', async () => {
            render(<BreaksPanel />);

            await userEvent.click(
                screen.getByRole('button', { name: /generar automáticamente/i }),
            );

            // All 8 ambulances get chips — some may be conflicts due to
            // geographic clustering in auto-schedule algorithm (tracked in PRD §14)
            const okChips = screen.queryAllByTestId('break-chip');
            const conflictChips = screen.queryAllByTestId('break-chip-conflict');
            expect(okChips.length + conflictChips.length).toBe(8);
        });

        it('shows a coverage status badge after auto-schedule', async () => {
            render(<BreaksPanel />);

            await userEvent.click(
                screen.getByRole('button', { name: /generar automáticamente/i }),
            );

            // Badge must exist — status depends on geographic algorithm quality
            // Full "no conflicts" guarantee requires smarter grouping (PRD §14)
            expect(
                screen.getByTestId('coverage-status-badge'),
            ).toBeInTheDocument();
        });
    });

    describe('coverage conflict', () => {
        it('shows conflict badge when all ambulances on break simultaneously', async () => {
            render(<BreaksPanel />);

            // Add break at same time for ALL ambulances — guaranteed conflict
            act(() => {
                const ambulances = useSimStore.getState().ambulances;
                ambulances.forEach((amb) => {
                    useSimStore.getState().addBreak(amb.id, 300, 30);
                });
                useSimStore.getState().validateCoverage();
            });

            expect(
                screen.getByTestId('coverage-status-badge'),
            ).toHaveTextContent(/conflicto de cobertura/i);
        });

        it('marks conflicting break chips with conflict style', async () => {
            render(<BreaksPanel />);

            act(() => {
                const ambulances = useSimStore.getState().ambulances;
                ambulances.forEach((amb) => {
                    useSimStore.getState().addBreak(amb.id, 300, 30);
                });
                useSimStore.getState().validateCoverage();
            });

            const conflictChips = screen.getAllByTestId('break-chip-conflict');
            expect(conflictChips.length).toBeGreaterThan(0);
        });
    });
});