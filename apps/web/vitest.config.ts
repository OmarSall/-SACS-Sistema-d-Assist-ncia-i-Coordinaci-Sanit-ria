import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

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
            '@sacs/core-logic': new URL(
                '../../packages/core-logic/src/index.ts',
                import.meta.url,
            ).pathname,
            '@sacs/shared-types': new URL(
                '../../packages/shared-types/src/index.ts',
                import.meta.url,
            ).pathname,
        },
    },
});