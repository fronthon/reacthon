import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

import reacthon from '../src/reacthon.js';

export default defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    base: './',
    plugins: [reacthon()],
    resolve: { alias: { 'reacthon/bridge': fileURLToPath(new URL('../src/bridge.js', import.meta.url)) } },
    build: { outDir: '../dist', emptyOutDir: true }
});
