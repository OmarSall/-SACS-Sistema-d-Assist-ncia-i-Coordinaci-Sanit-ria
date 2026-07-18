import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
    plugins: [react()],
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
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});