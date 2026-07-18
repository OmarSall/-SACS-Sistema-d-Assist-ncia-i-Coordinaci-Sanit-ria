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

    const running = useSimStore((s) => s.running);
    const speedMultiplier = useSimStore((s) => s.speedMultiplier);
    const currentMinute = useSimStore((s) => s.currentMinute);
    const trafficModel = useSimStore((s) => s.trafficModel);

    const toggleRunning = useSimStore((s) => s.toggleRunning);
    const setSpeedMultiplier = useSimStore((s) => s.setSpeedMultiplier);
    const setTrafficModel = useSimStore((s) => s.setTrafficModel);
    const reset = useSimStore((s) => s.reset);

    function handleSpeedClick(speed: SpeedOption) {
        setSpeedMultiplier(speed);
    }

    function handleTrafficModelChange(
        e: React.ChangeEvent<HTMLSelectElement>,
    ) {
        setTrafficModel(e.target.value as TrafficModel);
    }

    function handleLanguageClick(lang: SupportedLanguage) {
        void i18n.changeLanguage(lang);
    }

    return (
        <div data-testid="simulation-controls">
            {/* ── Row 1: start/pause, reset, clock ── */}
            <div>
                <button onClick={toggleRunning}>
                    {running ? t('sim.pause') : t('sim.start')}
                </button>

                <button onClick={reset}>
                    {t('sim.reset')}
                </button>

                <span data-testid="sim-clock">
          {formatSimTime(currentMinute)}
        </span>
            </div>

            {/* ── Row 2: speed, traffic model, language ── */}
            <div>
                {/* Speed multiplier */}
                <div>
                    <span>{t('sim.speed')}</span>
                    {SPEED_OPTIONS.map((speed) => (
                        <button
                            key={speed}
                            onClick={() => handleSpeedClick(speed)}
                            data-active={speedMultiplier === speed}
                        >
                            {speed}x
                        </button>
                    ))}
                </div>

                {/* Traffic model */}
                <select
                    value={trafficModel}
                    onChange={handleTrafficModelChange}
                >
                    <option value="best_guess">
                        {t('sim.trafficBestGuess')}
                    </option>
                    <option value="pessimistic">
                        {t('sim.trafficPessimistic')}
                    </option>
                    <option value="optimistic">
                        {t('sim.trafficOptimistic')}
                    </option>
                </select>

                {/* Language switcher */}
                <div>
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageClick(lang.code)}
                            data-active={i18n.language === lang.code}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}