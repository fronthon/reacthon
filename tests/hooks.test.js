import { createElement, Component } from 'react';
import { describe, expect, it } from 'vitest';

import { Focus, Stepper, Themed, Broken, seen } from './fixtures/Hooks.py';
import { render } from './render.js';

describe('hooks', () => {
    it('keeps one ref across renders and sets the element it names', async () => {
        seen.length = 0;
        const page = await render(Focus);

        expect(page.container.querySelector('p').textContent).toBe('True 1');
        expect(seen[0]).toMatch(/^Ref\(<HTMLInputElement/);

        await page.click('button');
        expect(document.activeElement).toBe(page.container.querySelector('input'));
        expect(seen[1]).toBe('INPUT');
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

        expect(caught.message).toMatch(/IndexError/);
        expect(caught.message).toMatch(/list index out of range/);
    });
});
