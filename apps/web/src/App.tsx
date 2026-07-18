import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSimStore } from './store/simStore';
import SimulationControls from './components/SimulationControls';
import FleetPanel from './components/FleetPanel';
import BreaksPanel from './components/BreaksPanel';
import CoveragePanel from './components/CoveragePanel';
import IncidentsPanel from './components/IncidentsPanel';

type Tab = 'fleet' | 'breaks' | 'coverage' | 'incidents';

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

export default function App() {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<Tab>('fleet');

    const running = useSimStore((s) => s.running);
    const speedMultiplier = useSimStore((s) => s.speedMultiplier);
    const tick = useSimStore((s) => s.tick);

    useEffect(() => {
        if (!running) return;
        const intervalId = setInterval(() => {
            tick(speedMultiplier);
        }, 1000);
        return () => clearInterval(intervalId);
    }, [running, speedMultiplier, tick]);

    function renderActivePanel() {
        switch (activeTab) {
            case 'fleet':     return <FleetPanel />;
            case 'breaks':    return <BreaksPanel />;
            case 'coverage':  return <CoveragePanel />;
            case 'incidents': return <IncidentsPanel />;
        }
    }

    return (
        <div className="app-shell" data-testid="app-shell">
            <header className="app-header">
                <h1 className="app-header__title">{t('app.title')}</h1>
                <p className="app-header__subtitle">{t('app.subtitle')}</p>
            </header>

            <SimulationControls />

            <div className="main-grid">
                <div className="map-container" data-testid="map-container">
                    <div className="map-placeholder">
                        <span className="map-placeholder__icon">🗺</span>
                        <span>Google Maps — Phase 3</span>
                    </div>
                </div>

                <div className="side-panel" data-testid="side-panel">
                    <div className="tabs" role="tablist">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={activeTab === tab.id}
                                className={`tab ${activeTab === tab.id ? 'tab--active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {t(tab.labelKey)}
                            </button>
                        ))}
                    </div>

                    <div className="tab-content" role="tabpanel">
                        {renderActivePanel()}
                    </div>
                </div>
            </div>

            <footer className="app-footer">
                <p>{t('footer.note')}</p>
            </footer>
        </div>
    );
}