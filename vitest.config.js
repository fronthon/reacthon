import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import reacthon from './src/reacthon.js';

export default defineConfig({
    plugins: [reacthon()],
    resolve: { alias: { 'reacthon/bridge': fileURLToPath(new URL('./src/bridge.js', import.meta.url)) } },
    test: { environment: 'jsdom', include: ['tests/**/*.test.js'] }
});
