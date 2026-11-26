import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { Form, Kinds, Card, Page, Counted, Counting, Toolbar, Tags, Button, Nulls, Cloned } from './fixtures/Props.py';
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

    it('keeps the default of a prop a JavaScript parent hands as undefined, as React does', async () => {
        const page = await render(Button, { variant: undefined, children: 'x' });

        expect(page.html()).toBe('<button class="button plain">x</button>');
    });

    it('takes children, from Python and from JavaScript', async () => {
        const python = await render(Page);

        expect(python.html()).toBe('<section><h2>Hello</h2><p>first</p><p>second</p></section>');

        const javascript = await render(Card, { title: 'Hi', children: createElement('em', null, 'there') });

        expect(javascript.html()).toBe('<section><h2>Hi</h2><em>there</em></section>');
    });

    it('hands children of several, and an array of them, as a list', async () => {
        expect((await render(Counting)).text()).toBe('list 2 JSObject');
        expect((await render(Counted, { children: [] })).text()).toBe('list 0 -');
        expect((await render(Counted, { children: [['a', 'b'], 'c'] })).text()).toBe('list 2 list');
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

    it("keeps javascript.NULL JavaScript's null through a Python component and in a hook, None undefined", async () => {
        const page = await render(Nulls);

        expect([...page.container.querySelectorAll('.slotted')].map((one) => one.textContent)).toEqual(['null', 'undefined']);
        expect(page.container.querySelector('p').textContent).toBe('True True True');
    });

    it('copies in as Python data what a library adds cloning a Python element, as from a JavaScript parent', async () => {
        const page = await render(Cloned);

        expect(page.container.querySelector('.cloned').textContent).toBe('list dict 1 mine');
    });
});
