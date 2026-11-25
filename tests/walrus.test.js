import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { Todos, OneLine, Several, kept } from './fixtures/Walrus.py';
import { render } from './render.js';

const type = (input, text) =>
    act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });

describe('`name := value` in a nested function writes the component\'s name', () => {
    it('types, adds, and counts from a handler made at the first render', async () => {
        kept.length = 0;
        const page = await render(Todos);

        await type(page.container.querySelector('input'), 'milk');
        await page.click('button');
        await type(page.container.querySelector('input'), 'eggs');
        await page.click('button');
        for (let i = 0; i < 3; i++) await act(() => kept[0]());

        expect(page.container.querySelector('p').textContent).toBe('2 to do, 3 s');
        expect(page.container.querySelector('input').value).toBe('');
    });

    it('writes it from a lambda of the markup', async () => {
        const page = await render(OneLine);

        await page.click('button');
        await page.click('button');
        expect(page.text()).toBe('2');
    });

    it('takes a value on several lines, a comment after it, and a statement after a `;`', async () => {
        const page = await render(Several);

        await page.click('button');
        expect(page.text()).toBe('2 two');
    });
});
