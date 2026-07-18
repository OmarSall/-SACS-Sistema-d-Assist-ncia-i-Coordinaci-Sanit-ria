import { useTranslation } from 'react-i18next';
import { useSimStore } from '../store/simStore';
import { formatSimTime } from '@sacs/core-logic';
import type { TrafficModel } from '@sacs/shared-types';
import type { SupportedLanguage } from '../i18n';

const SPEED_OPTIONS = [1, 2, 5, 10] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

const LANGUAGES: { code: SupportedLanguage; label: string }[] = [
    { code: 'ca', label: 'CA' },
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' },
];

export default function SimulationControls() {
    const { t, i18n } = useTranslation();

    const running       = useSimStore((s) => s.running);
    const speedMultiplier = useSimStore((s) => s.speedMultiplier);
    const currentMinute = useSimStore((s) => s.currentMinute);
    const trafficModel  = useSimStore((s) => s.trafficModel);

    const toggleRunning    = useSimStore((s) => s.toggleRunning);
    const setSpeedMultiplier = useSimStore((s) => s.setSpeedMultiplier);
    const setTrafficModel  = useSimStore((s) => s.setTrafficModel);
    const reset            = useSimStore((s) => s.reset);

    function handleTrafficModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
        setTrafficModel(e.target.value as TrafficModel);
    }

    function handleLanguageClick(lang: SupportedLanguage) {
        void i18n.changeLanguage(lang);
    }

    return (
        <div className="simulation-controls" data-testid="simulation-controls">
            <div className="controls-row">
                <button
                    className={`btn ${running ? 'btn--pause' : 'btn--primary'}`}
                    onClick={toggleRunning}
                >
                    {running ? t('sim.pause') : t('sim.start')}
                </button>

                <button className="btn" onClick={reset}>
                    {t('sim.reset')}
                </button>

                <div className="sim-clock">
                    <span className="control-label">{t('sim.currentTime')}</span>
                    <span className="sim-clock__value" data-testid="sim-clock">
            {formatSimTime(currentMinute)}
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

                <button className="btn btn--incident" onClick={() => useSimStore.getState().addIncident({
                    id: `inc-${Date.now()}`,
                    position: { lat: 41.25 + Math.random() * 0.33, lng: 1.92 + Math.random() * 0.38 },
                    priority: (['critical', 'urgent', 'urgent', 'standard', 'standard'] as const)[Math.floor(Math.random() * 5)]!,
                    createdAtMinute: useSimStore.getState().currentMinute,
                    status: 'pending',
                    assignedAmbulanceId: null,
                    label: t('incidents.generate'),
                })}>
                    {t('incidents.generate')}
                </button>
            </div>
        </div>
    );
}