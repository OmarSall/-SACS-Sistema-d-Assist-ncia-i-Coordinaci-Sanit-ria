import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSimStore } from './store/simStore';
import SimulationControls from './components/SimulationControls';
import FleetPanel from './components/FleetPanel';
import BreaksPanel from './components/BreaksPanel';
import CoveragePanel from './components/CoveragePanel';
import IncidentsPanel from './components/IncidentsPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'fleet' | 'breaks' | 'coverage' | 'incidents';

// ─── Tab configuration ────────────────────────────────────────────────────────

interface TabConfig {
    id: Tab;
    labelKey: string;
}

const TABS: TabConfig[] = [
    { id: 'fleet',     labelKey: 'nav.fleet'     },
    { id: 'breaks',    labelKey: 'nav.breaks'    },
    { id: 'coverage',  labelKey: 'nav.coverage'  },
    { id: 'incidents', labelKey: 'nav.incidents' },
];

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<Tab>('fleet');

    const running = useSimStore((s) => s.running);
    const speedMultiplier = useSimStore((s) => s.speedMultiplier);
    const tick = useSimStore((s) => s.tick);

    // ── Simulation loop ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!running) return;

        const intervalId = setInterval(() => {
            tick(speedMultiplier);
        }, 1000);

        return () => clearInterval(intervalId);
    }, [running, speedMultiplier, tick]);

    // ── Active panel ────────────────────────────────────────────────────────────
    function renderActivePanel() {
        switch (activeTab) {
            case 'fleet':     return <FleetPanel />;
            case 'breaks':    return <BreaksPanel />;
            case 'coverage':  return <CoveragePanel />;
            case 'incidents': return <IncidentsPanel />;
        }
    }

    return (
        <div data-testid="app-shell">
            {/* ── Header ── */}
            <header>
                <h1>{t('app.title')}</h1>
                <p>{t('app.subtitle')}</p>
            </header>

            {/* ── Simulation controls ── */}
            <SimulationControls />

            {/* ── Main layout ── */}
            <div>
                {/* Map placeholder — Google Maps integration in Phase 3 */}
                <div data-testid="map-container">
                    <p>Map loading...</p>
                </div>

                {/* Side panel with tabs */}
                <div data-testid="side-panel">
                    {/* Tab buttons */}
                    <div role="tablist">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {t(tab.labelKey)}
                            </button>
                        ))}
                    </div>

                    {/* Active panel */}
                    <div role="tabpanel">
                        {renderActivePanel()}
                    </div>
                </div>
            </div>

            {/* ── Footer ── */}
            <footer>
                <p>{t('footer.note')}</p>
            </footer>
        </div>
    );
}