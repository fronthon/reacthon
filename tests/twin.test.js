import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import { Board as PythonBoard } from './fixtures/Twin.py';
import { Board as ReactBoard } from './fixtures/twin.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// A small seeded generator, so that a failing run says the seed that replays it.
function random(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Weighted so that a list grows past ten rows, where `"item 10"` sorts before
// `"item 2"`, and is cleared now and then.
const BOARD = { add: 6, clear: 0.3, flip: 1, order: 1, keep: 1, bump: 1, write: 1 };
const ITEM = { toggle: 1, rename: 1, remove: 1 };

const pick = (weights, draw) => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let at = draw() * total;

    for (const [name, weight] of Object.entries(weights)) {
        if ((at -= weight) < 0) return name;
    }
    return Object.keys(weights)[0];
};

async function mount(type) {
    const container = document.createElement('div');
    const root = createRoot(container);

    document.body.append(container);
    await act(() => root.render(createElement(type)));
    return { container, root };
}

// The same events, drawn from the seed, to the board written in Python and to
// the one written for React: their pages must not differ after any of them.
async function replay(seed, steps) {
    const draw = random(seed);
    const python = await mount(PythonBoard);
    const react = await mount(ReactBoard);
    const done = [];

    try {
        for (let step = 0; step < steps; step++) {
            const rows = react.container.querySelectorAll('li').length;
            const onItem = rows > 0 && draw() < 0.5;
            const name = pick(onItem ? ITEM : BOARD, draw);
            const row = onItem ? Math.floor(draw() * rows) : null;
            const press = (container) =>
                (onItem ? container.querySelectorAll('li')[row] : container).querySelector(`button.${name}`).click();

            done.push(onItem ? `${name}(${row})` : name);
            await act(() => press(python.container));
            await act(() => press(react.container));

            if (python.container.innerHTML !== react.container.innerHTML) {
                return { seed, done, python: python.container.innerHTML, react: react.container.innerHTML };
            }
        }
        return null;
    } finally {
        await act(() => python.root.unmount());
        await act(() => react.root.unmount());
    }
}

describe('a board written in Python against the same board written for React', () => {
    it('shows the same page after every event of two hundred random runs', async () => {
        for (let seed = 1; seed <= 200; seed++) {
            const differs = await replay(seed, 60);

            expect(differs).toBeNull();
        }
    }, 120000);
});
