import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/react';
import SimulationControls from '../SimulationControls';
import { useSimStore } from '../../store/simStore';
import i18n from '../../i18n';

beforeEach(() => {
    useSimStore.getState().reset();
    void i18n.changeLanguage('es');
});

describe('SimulationControls', () => {
    describe('start/pause button', () => {
        it('shows start button when simulation is paused', () => {
            render(<SimulationControls />);
            expect(
                screen.getByRole('button', { name: /iniciar simulación/i }),
            ).toBeInTheDocument();
        });

        it('shows pause button when simulation is running', async () => {
            render(<SimulationControls />);
            await userEvent.click(
                screen.getByRole('button', { name: /iniciar simulación/i }),
            );
            expect(
                screen.getByRole('button', { name: /pausar/i }),
            ).toBeInTheDocument();
        });

        it('toggles simulation running state on click', async () => {
            render(<SimulationControls />);
            expect(useSimStore.getState().running).toBe(false);

            await userEvent.click(
                screen.getByRole('button', { name: /iniciar simulación/i }),
            );
            expect(useSimStore.getState().running).toBe(true);

            await userEvent.click(
                screen.getByRole('button', { name: /pausar/i }),
            );
            expect(useSimStore.getState().running).toBe(false);
        });
    });

    describe('reset button', () => {
        it('renders a reset button', () => {
            render(<SimulationControls />);
            expect(
                screen.getByRole('button', { name: /reiniciar/i }),
            ).toBeInTheDocument();
        });

        it('resets simulation state on click', async () => {
            render(<SimulationControls />);

            // Start simulation
            await userEvent.click(
                screen.getByRole('button', { name: /iniciar simulación/i }),
            );
            expect(useSimStore.getState().running).toBe(true);

            // Reset
            await userEvent.click(
                screen.getByRole('button', { name: /reiniciar/i }),
            );
            expect(useSimStore.getState().running).toBe(false);
            expect(useSimStore.getState().currentMinute).toBe(0);
        });
    });

    describe('speed multiplier', () => {
        it('renders all speed options', () => {
            render(<SimulationControls />);
            expect(screen.getByRole('button', { name: '1x' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '2x' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '5x' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '10x' })).toBeInTheDocument();
        });

        it('updates speed multiplier in store on click', async () => {
            render(<SimulationControls />);
            await userEvent.click(screen.getByRole('button', { name: '5x' }));
            expect(useSimStore.getState().speedMultiplier).toBe(5);
        });

        it('highlights the active speed', async () => {
            render(<SimulationControls />);
            const btn5x = screen.getByRole('button', { name: '5x' });
            await userEvent.click(btn5x);
            expect(btn5x).toHaveAttribute('data-active', 'true');
        });
    });

    describe('traffic model', () => {
        it('renders traffic model selector', () => {
            render(<SimulationControls />);
            expect(screen.getByRole('combobox')).toBeInTheDocument();
        });

        it('updates traffic model in store on change', async () => {
            render(<SimulationControls />);
            await userEvent.selectOptions(
                screen.getByRole('combobox'),
                'pessimistic',
            );
            expect(useSimStore.getState().trafficModel).toBe('pessimistic');
        });
    });

    describe('simulation clock', () => {
        it('shows 06:00 at minute 0', () => {
            render(<SimulationControls />);
            expect(screen.getByText('06:00')).toBeInTheDocument();
        });

        it('updates clock after tick', () => {
            render(<SimulationControls />);
            act(() => {
                useSimStore.getState().toggleRunning();
                useSimStore.getState().tick(90);
            });
            expect(screen.getByText('07:30')).toBeInTheDocument();
        });
    });

    describe('language switcher', () => {
        it('renders CA ES EN buttons', () => {
            render(<SimulationControls />);
            expect(screen.getByRole('button', { name: 'CA' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'ES' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
        });

        it('switches language on click', async () => {
            render(<SimulationControls />);
            await userEvent.click(screen.getByRole('button', { name: 'EN' }));
            expect(
                screen.getByRole('button', { name: /start simulation/i }),
            ).toBeInTheDocument();
        });
    });
});