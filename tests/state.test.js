import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { Counter } from './fixtures/Counter.py';
import { Counter as Plain, Basket, Nested, Shapes, Total, Removable, Parent, Room, kept, joined } from './fixtures/State.py';
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

describe('a name a nested function rebinds or changes is the state', () => {
    it('keeps a name rebound under nonlocal, and computes the rest again', async () => {
        kept.length = 0;
        const page = await render(Plain, { start: 3 });

        expect(page.text()).toBe('3 6');
        await page.click('button');
        await page.click('button');
        expect(page.text()).toBe('5 10');
    });

    it('lets a handler made at the first render read the state of now', async () => {
        kept.length = 0;
        const page = await render(Plain);
        const first = kept[0];

        for (let i = 0; i < 3; i++) await act(() => first(null));
        expect(page.text()).toBe('3 6');
    });

    it('keeps its first value when the prop it came from moves, as a state does', async () => {
        const page = await render(Plain, { start: 3 });

        await page.rerender({ start: 10 });
        expect(page.text()).toBe('3 6');
    });

    it('keeps a list a lambda appends to, and moves a memo that depends on it', async () => {
        const page = await render(Basket);
        const items = () => [...page.container.querySelectorAll('li')].map((li) => li.textContent);

        await page.click('.add');
        await page.click('.add');
        expect(items()).toEqual(['0', '1']);
        expect(page.container.querySelector('p').textContent).toBe('2');
    });

    it('follows a nonlocal two functions down, and leaves a name a function binds for itself', async () => {
        const page = await render(Nested);

        await page.click('.outer');
        await page.click('.shadow');
        expect(page.container.querySelector('.outer').textContent).toBe('2');
    });

    it('keeps a dict written by key and an instance written by attribute, read from a class inside', async () => {
        const page = await render(Shapes);

        expect(page.text()).toBe('0:False');
        await page.click('button');
        expect(page.text()).toBe('1:True');
    });

    it('computes again what a function the render calls accumulates', async () => {
        const page = await render(Total);

        await page.rerender({ prices: [1, 2, 3] });
        await page.rerender({ prices: [1, 2, 3] });
        expect(page.text()).toBe('6');
    });

    it('keeps a list a handler changes, where a function the render calls made the handler', async () => {
        const page = await render(Removable);

        await page.click('button');
        expect(page.text()).toBe('b');
    });

    it('renders the parent again when a child changes the list the parent keeps', async () => {
        const page = await render(Parent);
        const shown = () => page.container.querySelector('p').textContent;

        await page.click('.parent');
        await page.click('.child');
        expect(shown()).toBe('parent, parent, child');
    });

    it("reads in an effect's cleanup the state of its render, and the state of now after it", async () => {
        joined.length = 0;
        const page = await render(Room);

        await page.click('button');
        expect(page.text()).toBe('sport');
        await page.unmount();
        expect([...joined]).toEqual(['join general', 'leave general', 'join sport', 'leave sport']);
    });
});
