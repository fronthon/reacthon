import { describe, expect, it } from 'vitest';

import { Basket, Todos, Mover, counted } from './fixtures/Mutations.py';
import { render } from './render.js';

describe('a state changed in place', () => {
    it('renders again after an append and an item write, and moves a memo that depends on it', async () => {
        counted.length = 0;
        const page = await render(Basket);
        const items = () => [...page.container.querySelectorAll('li')].map((li) => li.textContent);
        const size = () => page.container.querySelector('p').textContent;

        expect(items()).toEqual(['apple']);
        await page.click('.add');
        expect(items()).toEqual(['apple', 'pear']);
        expect(size()).toBe('2');

        await page.click('.rename');
        expect(items()).toEqual(['APPLE', 'pear']);

        await page.click('.replace');
        expect(items()).toEqual(['fig']);
        expect(size()).toBe('1');

        // The list it replaced is no longer followed.
        await page.click('.add');
        expect(items()).toEqual(['fig', 'pear']);
        expect([...counted]).toEqual([1, 2, 2, 1, 2]);
    });

    it('renders the parent again when a child changes a dict the parent holds', async () => {
        const page = await render(Todos);
        const items = () => [...page.container.querySelectorAll('li')].map((li) => li.className);

        expect(page.container.querySelector('p').textContent).toBe('2 left');
        await page.click('li');
        expect(items()).toEqual(['done', 'open']);
        expect(page.container.querySelector('p').textContent).toBe('1 left');
    });

    it('renders again when an attribute of an instance moves', async () => {
        const page = await render(Mover);

        await page.click('button');
        await page.click('button');
        expect(page.text()).toBe('2,0');
    });
});
