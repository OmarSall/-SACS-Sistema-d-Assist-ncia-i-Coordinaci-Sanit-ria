import {useTranslation} from 'react-i18next';
import {useSimStore} from '../store/simStore';
import {formatSimTime} from '@sacs/core-logic';
import type {TrafficModel} from '@sacs/shared-types';
import type {SupportedLanguage} from '../i18n';
import {randomIncidentLocation} from '../data/locations';
import {getQuotaStatus} from '../utils/directionsServices';

const SPEED_OPTIONS = [1, 2, 5, 10] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
    {code: 'ca', label: 'CA'},
    {code: 'es', label: 'ES'},
    {code: 'en', label: 'EN'},
];

export default function SimulationControls() {
    const {t, i18n} = useTranslation();

    const running = useSimStore((s) => s.running);
    const speedMultiplier = useSimStore((s) => s.speedMultiplier);
    const currentMinute = useSimStore((s) => s.currentMinute);
    const trafficModel = useSimStore((s) => s.trafficModel);

    const toggleRunning = useSimStore((s) => s.toggleRunning);
    const setSpeedMultiplier = useSimStore((s) => s.setSpeedMultiplier);
    const setTrafficModel = useSimStore((s) => s.setTrafficModel);
    const reset = useSimStore((s) => s.reset);

    const quota = getQuotaStatus();
    const quotaWarning = quota.remaining < 20;

    function handleTrafficModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setTrafficModel(e.target.value as TrafficModel);
    }

    function handleLanguageClick(lang: SupportedLanguage) {
        void i18n.changeLanguage(lang);
    }

    function handleGenerateIncident() {
        const priorities = ['critical', 'urgent', 'urgent', 'standard', 'standard'] as const;
        useSimStore.getState().addIncident({
            id: `inc-${Date.now()}`,
            position: randomIncidentLocation(),  // ← zamiast Math.random() * bounds
            priority: priorities[Math.floor(Math.random() * priorities.length)]!,
            createdAtMinute: useSimStore.getState().currentMinute,
            status: 'pending',
            assignedAmbulanceId: null,
            label: t('incidents.generate'),
        });
    }

    function startButtonLabel(): string {
        if (running) return t('sim.pause');
        if (currentMinute > 0) return t('sim.continue');
        return t('sim.start');
    }

    return (
        <div className="simulation-controls" data-testid="simulation-controls">
            <div className="controls-row">
                <button
                    className={`btn ${running ? 'btn--pause' : 'btn--primary'}`}
                    onClick={toggleRunning}
                >
                    {startButtonLabel()}
                </button>

                <button className="btn" onClick={reset}>
                    {t('sim.reset')}
                </button>

                <div className="sim-clock">
                    <span className="control-label">{t('sim.currentTime')}</span>
                    <span className="sim-clock__value" data-testid="sim-clock">
                        {formatSimTime(currentMinute)}
                    </span>
                    <span style={{
                        fontSize: 10,
                        color: quotaWarning ? 'var(--red)' : 'var(--text-dim)'
                    }}>
                        API: {quota.remaining}/{quota.limit}
                    </span>
                </div>
            </div>

            <div className="controls-row">
                <div className="control-group">
                    <span className="control-label">{t('sim.speed')}</span>
                    <div className="segmented">
                        {SPEED_OPTIONS.map((speed) => (
                            <button
                                key={speed}
                                className={`segmented__option ${speedMultiplier === speed ? 'segmented__option--active' : ''}`}
                                data-active={speedMultiplier === speed}
                                onClick={() => setSpeedMultiplier(speed)}
                            >
                                {speed}x
                            </button>
                        ))}
                    </div>
                </div>

                <div className="control-group">
                    <span className="control-label">{t('sim.trafficModel')}</span>
                    <select
                        className="select"
                        value={trafficModel}
                        onChange={handleTrafficModelChange}
                    >
                        <option value="best_guess">{t('sim.trafficBestGuess')}</option>
                        <option value="pessimistic">{t('sim.trafficPessimistic')}</option>
                        <option value="optimistic">{t('sim.trafficOptimistic')}</option>
                    </select>
                </div>

                <div className="control-group">
                    <span className="control-label">Language</span>
                    <div className="segmented">
                        {LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                className={`segmented__option ${i18n.language === lang.code ? 'segmented__option--active' : ''}`}
                                data-active={i18n.language === lang.code}
                                onClick={() => handleLanguageClick(lang.code)}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button className="btn btn--incident" onClick={handleGenerateIncident}>
                    {t('incidents.generate')}
                </button>
            </div>
        </div>
    );
}