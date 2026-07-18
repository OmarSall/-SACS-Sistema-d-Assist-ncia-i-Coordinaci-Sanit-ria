import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 65,
            },
            include: ['src/**'],
            exclude: ['src/test/**', 'src/main.tsx', 'src/i18n/**'],
        },
    },
    resolve: {
        alias: {
            '@sacs/core-logic': fileURLToPath(
                new URL('../../packages/core-logic/src/index.ts', import.meta.url)
            ),
            '@sacs/shared-types': fileURLToPath(
                new URL('../../packages/shared-types/src/index.ts', import.meta.url)
            ),
        },
    },
});