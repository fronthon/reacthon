import { describe, expect, it } from 'vitest';

import { Counter } from './fixtures/Counter.py';
import { render } from './render.js';

describe('use_state', () => {
    it('renders the initial state and updates on a click', async () => {
        const page = await render(Counter, { start: 3 });

        expect(page.html()).toBe('<button>3</button>');
        await page.click('button');
        await page.click('button');
        expect(page.text()).toBe('5');
    });

    it('takes the default of a keyword the parent leaves out', async () => {
        const page = await render(Counter);

        expect(page.text()).toBe('0');
    });
});
