import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '../App';
import { useSimStore } from '../store/simStore';
import i18n from '../i18n';

beforeEach(() => {
    useSimStore.getState().reset();
    void i18n.changeLanguage('es');
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('App', () => {
    describe('layout', () => {
        it('renders the app shell', () => {
            render(<App />);
            expect(screen.getByTestId('app-shell')).toBeInTheDocument();
        });

        it('renders the simulation controls', () => {
            render(<App />);
            expect(
                screen.getByTestId('simulation-controls'),
            ).toBeInTheDocument();
        });

        it('renders the map placeholder', () => {
            render(<App />);
            expect(screen.getByTestId('map-container')).toBeInTheDocument();
        });

        it('renders the side panel with tabs', () => {
            render(<App />);
            expect(screen.getByTestId('side-panel')).toBeInTheDocument();
        });

        it('renders fleet tab by default', () => {
            render(<App />);
            expect(screen.getByTestId('fleet-panel')).toBeInTheDocument();
        });
    });

    describe('tab navigation', () => {
        it('switches to breaks panel on tab click', async () => {
            const { getByRole } = render(<App />);
            await act(async () => {
                getByRole('tab', { name: /descansos/i }).click();
            });
            expect(screen.getByTestId('breaks-panel')).toBeInTheDocument();
        });

        it('switches to coverage panel on tab click', async () => {
            const { getByRole } = render(<App />);
            await act(async () => {
                getByRole('tab', { name: /cobertura/i }).click();
            });
            expect(screen.getByTestId('coverage-panel')).toBeInTheDocument();
        });

        it('switches to incidents panel on tab click', async () => {
            const { getByRole } = render(<App />);
            await act(async () => {
                getByRole('tab', { name: /incidentes/i }).click();
            });
            expect(screen.getByTestId('incidents-panel')).toBeInTheDocument();
        });
    });

    describe('simulation loop', () => {
        it('advances simulation time when running', () => {
            render(<App />);

            // Osobny act — pozwala React re-renderować i podpiąć useEffect z setInterval
            act(() => {
                useSimStore.getState().toggleRunning();
            });

            // Dopiero teraz timery mają zarejestrowany interval
            act(() => {
                vi.advanceTimersByTime(3000);
            });

            expect(useSimStore.getState().currentMinute).toBeGreaterThan(0);
        });

        it('does not advance time when paused', () => {
            render(<App />);
            act(() => {
                vi.advanceTimersByTime(3000);
            });
            expect(useSimStore.getState().currentMinute).toBe(0);
        });
    });
});