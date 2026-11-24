import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { Attributes, Loader, log } from './fixtures/Edges.py';
import { render } from './render.js';

describe('edges', () => {
    it('writes a value inside an attribute as Python writes it', async () => {
        const page = await render(Attributes);
        const p = page.container.querySelector('p');

        expect(p.getAttribute('title')).toBe('Total 2.5');
        expect(p.className).toBe('row None');
        expect(p.dataset.count).toBe('n3');
    });

    it('runs an async handler to its end', async () => {
        log.length = 0;
        const page = await render(Loader);

        await page.click('button');
        await act(() => new Promise((done) => setTimeout(done, 50)));

        expect([...log]).toEqual([42]);
        expect(page.text()).toBe('loaded 42');
    });
});
