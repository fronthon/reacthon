import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { TodoList } from './fixtures/Todo.py';
import { Values } from './fixtures/Values.py';
import { Shop } from './fixtures/Shop.py';
import { Clock, log } from './fixtures/Effects.py';
import { render } from './render.js';

// What a reader typing in a field does: the value set as the browser sets it,
// then the event React listens to.
const type = (input, text) =>
    act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });

const submit = (form) => act(() => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));

describe('components', () => {
    it('renders a list of child components with keys, a controlled field and a form', async () => {
        const page = await render(TodoList, { items: ['milk', 'eggs'] });
        const items = () => [...page.container.querySelectorAll('li')].map((li) => `${li.className}:${li.textContent}`);

        expect(items()).toEqual(['open:milk', 'open:eggs']);
        expect(page.container.querySelector('p').textContent).toBe('2 left');

        await type(page.container.querySelector('input'), '  bread ');
        expect(page.container.querySelector('input').value).toBe('  bread ');

        await submit(page.container.querySelector('form'));
        expect(items()).toEqual(['open:milk', 'open:eggs', 'open:bread']);
        expect(page.container.querySelector('input').value).toBe('');

        await page.click('li');
        expect(items()[0]).toBe('done:milk');
        expect(page.container.querySelector('p').textContent).toBe('2 left');
    });

    it('shows each value as Python writes it', async () => {
        const page = await render(Values);
        const text = (name) => page.container.querySelector(`.${name}`).textContent;

        expect(text('float')).toBe('1.0');
        expect(text('spec')).toBe('3.50');
        expect(text('repr')).toBe("'a'");
        expect(text('none')).toBe('');
        expect(text('flag')).toBe('');
        expect(text('list')).toBe('123');
        expect(text('tuple')).toBe('1.52.5');
        expect(text('dict')).toBe("{'a': 1}");
        expect(text('big')).toBe('18446744073709551616');
        expect(text('when')).toBe('');

        const input = page.container.querySelector('input');

        expect(input.value).toBe('21.0');
        expect(input.style.opacity).toBe('0.5');
    });

    it('renders a JavaScript component, calls a sibling module, and takes a callback back', async () => {
        const page = await render(Shop);

        expect(page.container.querySelector('.badge').textContent).toBe('items: 2 [true 2]');
        expect(page.container.querySelector('.total').textContent).toBe('36.0');

        await page.click('.badge');
        expect(page.container.querySelector('.picked').textContent).toBe('ITEMS');
    });

    it('runs an effect with its cleanup, and recomputes a memo only when its dependency moves', async () => {
        log.length = 0;
        const page = await render(Clock, { label: 'a' });

        expect(page.text()).toBe('a 0 0');
        await page.click('button');
        await page.click('button');
        expect(page.text()).toBe('a 2 4');
        await page.unmount();

        expect([...log]).toEqual(['square 0', 'start a', 'square 1', 'square 2', 'stop a']);
    });
});
