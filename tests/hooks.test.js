import { act, createElement, Component } from 'react';
import { describe, expect, it } from 'vitest';

import { Focus, Remembered, Entries, Stepper, Themed, Broken, seen, drawn } from './fixtures/Hooks.py';
import { Waits } from './fixtures/Waits.py';
import { render } from './render.js';

const turn = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

describe('hooks', () => {
    it('runs a coroutine an effect starts with aio.run, and an async handler, each awaiting a promise', async () => {
        const page = await render(Waits);

        await turn();
        expect(page.text()).toBe('loaded none');
        await page.click('button');
        await turn();
        expect(page.text()).toBe('loaded copied');
    });

    it('keeps one ref across renders and sets the element it names', async () => {
        seen.length = 0;
        const page = await render(Focus);

        expect(page.container.querySelector('p').textContent).toBe('True 1');
        expect(seen[0]).toMatch(/^Ref\(<HTMLInputElement/);

        await page.click('button');
        expect(document.activeElement).toBe(page.container.querySelector('input'));
        expect(seen[1]).toBe('INPUT');
    });

    it('calls a ref a handler writes at every render, as React finds its hooks', async () => {
        const page = await render(Remembered);

        await page.click('button');
        await page.click('button');
        expect(page.text()).toBe('2, pressed at 1');
    });

    it("skips a memo's render while its Python props are the same objects, or what are_equal says", async () => {
        drawn.length = 0;
        const page = await render(Entries);

        expect(drawn).toEqual(['a', 'b', 'a', 'b']);
        await page.click('.rename');
        expect(drawn.slice(4)).toEqual(['c', 'c']);
        await page.click('.copy');
        expect(drawn.slice(6)).toEqual(['a', 'c']);
        expect(page.container.querySelector('ol').textContent).toBe('ac');
    });

    it('reduces actions with a Python reducer', async () => {
        const page = await render(Stepper);
        const count = () => page.container.querySelector('p').textContent;

        expect(count()).toBe('10');
        await page.click('.up');
        await page.click('.up');
        expect(count()).toBe('12');
        await page.click('.reset');
        expect(count()).toBe('0');
    });

    it('hands a Python value down a context, and renders its readers again when it changes in place', async () => {
        const page = await render(Themed);
        const swatches = () => [...page.container.querySelectorAll('.swatch')].map((one) => one.textContent);

        expect(swatches()).toEqual(['red', 'blue']);
        await page.click('button');
        expect(swatches()).toEqual(['darkred', 'blue']);
    });

    it("raises Python's error, with its message and its component", async () => {
        let caught = null;

        class Boundary extends Component {
            state = { failed: false };
            static getDerivedStateFromError() {
                return { failed: true };
            }
            componentDidCatch(error) {
                caught = error;
            }
            render() {
                return this.state.failed ? 'failed' : this.props.children;
            }
        }

        const quiet = console.error;
        console.error = () => {};

        try {
            const page = await render(Boundary, { children: createElement(Broken, { items: [1] }) });

            expect(page.text()).toBe('failed');
        } finally {
            console.error = quiet;
        }

        expect(caught.message).toBe('IndexError: list index out of range (Broken() — tests/fixtures/Hooks.py:106)');
    });
});
