import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { act } from '@testing-library/react';
import CoveragePanel from '../CoveragePanel';
import { useSimStore } from '../../store/simStore';
import i18n from '../../i18n';

beforeEach(() => {
    useSimStore.getState().reset();
    void i18n.changeLanguage('es');
});

describe('CoveragePanel', () => {
    describe('initial render', () => {
        it('renders the panel title', () => {
            render(<CoveragePanel />);
            expect(
                screen.getByRole('heading', { name: /cobertura de zonas/i }),
            ).toBeInTheDocument();
        });

        it('renders a card for each coverage zone', () => {
            render(<CoveragePanel />);
            const cards = screen.getAllByTestId('coverage-card');
            expect(cards).toHaveLength(8);
        });

        it('renders zone names in Spanish', () => {
            render(<CoveragePanel />);
            expect(screen.getByText('Eixample')).toBeInTheDocument();
            expect(screen.getByText('Nou Barris')).toBeInTheDocument();
        });

        it('shows no active warnings initially', () => {
            render(<CoveragePanel />);
            expect(
                screen.getByTestId('warnings-count'),
            ).toHaveTextContent('0');
        });
    });

    describe('zone card content', () => {
        it('shows required ambulances count for each zone', () => {
            render(<CoveragePanel />);
            const cards = screen.getAllByTestId('coverage-card');

            // zone-eixample requires 2
            const eixampleCard = cards.find((card) =>
                card.textContent?.includes('Eixample'),
            );
            expect(eixampleCard).toHaveTextContent('2');
        });

        it('shows target response time for each zone', () => {
            render(<CoveragePanel />);
            // zone-eixample target is 8 min
            const cards = screen.getAllByTestId('coverage-card');
            const eixampleCard = cards.find((card) =>
                card.textContent?.includes('Eixample'),
            );
            expect(eixampleCard).toHaveTextContent('8');
        });
    });

    describe('warning state', () => {
        it('shows warning count after coverage violation', () => {
            render(<CoveragePanel />);

            act(() => {
                const ambulances = useSimStore.getState().ambulances;
                ambulances.forEach((amb) => {
                    useSimStore.getState().addBreak(amb.id, 300, 30);
                });
                useSimStore.getState().validateCoverage();
            });

            const warningsCount = screen.getByTestId('warnings-count');
            expect(Number(warningsCount.textContent)).toBeGreaterThan(0);
        });

        it('marks zone cards as warning when under-covered', () => {
            render(<CoveragePanel />);

            act(() => {
                const ambulances = useSimStore.getState().ambulances;
                ambulances.forEach((amb) => {
                    useSimStore.getState().addBreak(amb.id, 300, 30);
                });
                useSimStore.getState().validateCoverage();
            });

            const warningCards = screen.getAllByTestId('coverage-card-warning');
            expect(warningCards.length).toBeGreaterThan(0);
        });

        it('clears warnings after reset', () => {
            render(<CoveragePanel />);

            act(() => {
                const ambulances = useSimStore.getState().ambulances;
                ambulances.forEach((amb) => {
                    useSimStore.getState().addBreak(amb.id, 300, 30);
                });
                useSimStore.getState().validateCoverage();
            });

            act(() => {
                useSimStore.getState().reset();
            });

            expect(
                screen.getByTestId('warnings-count'),
            ).toHaveTextContent('0');
        });
    });
});