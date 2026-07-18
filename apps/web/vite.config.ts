import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
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
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});