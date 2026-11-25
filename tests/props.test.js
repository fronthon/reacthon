import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { Form, Kinds, Card, Page, Toolbar, Tags } from './fixtures/Props.py';
import { render } from './render.js';

describe('props', () => {
    it("hands a Python child the parent's own list and setter", async () => {
        const page = await render(Form);

        expect(page.container.querySelector('button').textContent).toBe('list 1');
        await page.click('button');
        expect(page.container.querySelector('button').textContent).toBe('list 2');
        expect(page.container.querySelector('p').textContent).toBe('list 01');
    });

    it("copies a JavaScript parent's data in as Python's", async () => {
        const page = await render(Kinds, { items: [1, 2], options: { size: 3 }, missing: undefined });

        expect(page.text()).toBe('list dict 3 None');
    });

    it('takes children, from Python and from JavaScript', async () => {
        const python = await render(Page);

        expect(python.html()).toBe('<section><h2>Hello</h2><p>first</p><p>second</p></section>');

        const javascript = await render(Card, { title: 'Hi', children: createElement('em', null, 'there') });

        expect(javascript.html()).toBe('<section><h2>Hi</h2><em>there</em></section>');
    });

    it('hands a Python component class as className, and spreads the rest of its props on a tag', async () => {
        const page = await render(Toolbar);
        const [go, plain] = page.container.querySelectorAll('button');

        expect(go.outerHTML).toBe('<button class="button bold wide" id="go" title="go">pressed 0</button>');
        expect(plain.outerHTML).toBe('<button class="button plain">plain</button>');
        await page.click('#go');
        expect(go.textContent).toBe('pressed 1');
    });

    it('spreads children with the other props, as children', async () => {
        const page = await render(Tags);

        expect(page.html()).toBe('<span class="x">hello <b>you</b> 12</span><span class="">alone</span>');
    });
});
