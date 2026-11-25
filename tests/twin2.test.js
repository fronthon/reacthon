import { act, createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';

import { Board as PythonBoard, log as pythonLog, reset } from './fixtures/Twin2.py';
import { Board as ReactBoard, log as reactLog } from './fixtures/twin2.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function random(seed) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const BOARD = { add: 5, type: 2, flip: 1, order: 1, shade: 1, later: 1 };
const ROW = { click: 2, rename: 1, remove: 1 };

const pick = (weights, draw) => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let at = draw() * total;

    for (const [name, weight] of Object.entries(weights)) {
        if ((at -= weight) < 0) return name;
    }
    return Object.keys(weights)[0];
};

const settle = () => act(() => new Promise((done) => setTimeout(done, 5)));

async function mount(type, strict) {
    const container = document.createElement('div');
    const root = createRoot(container);
    const board = createElement(type);

    document.body.append(container);
    await act(() => root.render(strict ? createElement(StrictMode, null, board) : board));
    return { container, root };
}

function type(container, text) {
    const input = container.querySelector('input.draft');

    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

// The same events to both boards; after each, the same page and the same
// journal of effects, mounted, updated and cleaned up.
async function replay(seed, steps, strict) {
    const draw = random(seed);

    reset();
    reactLog.length = 0;

    const python = await mount(PythonBoard, strict);
    const react = await mount(ReactBoard, strict);
    const done = [];
    const differs = (where) => {
        const pythonSide = [...pythonLog];

        if (python.container.innerHTML !== react.container.innerHTML || JSON.stringify(pythonSide) !== JSON.stringify(reactLog)) {
            return { seed, strict, where, done, python: python.container.innerHTML, react: react.container.innerHTML, pythonLog: pythonSide, reactLog: [...reactLog] };
        }
        return null;
    };

    for (let step = 0; step < steps; step++) {
        const rows = react.container.querySelectorAll('li').length;
        const onRow = rows > 0 && draw() < 0.4;
        const name = pick(onRow ? ROW : BOARD, draw);
        const row = onRow ? Math.floor(draw() * rows) : null;
        const text = `w${Math.floor(draw() * 100)}`;
        const press = (container) => {
            if (name === 'type') return type(container, text);
            (onRow ? container.querySelectorAll('li')[row] : container).querySelector(`button.${name}`).click();
        };

        done.push(onRow ? `${name}(${row})` : name === 'type' ? `type(${text})` : name);
        await act(() => press(python.container));
        await act(() => press(react.container));
        if (name === 'later') await settle();

        const found = differs(name);
        if (found) return found;
    }

    await act(() => python.root.unmount());
    await act(() => react.root.unmount());

    return differs('unmount');
}

describe('a board with state in its rows, effects, a context and a field, against React', () => {
    it.each([false, true])('shows the same page and runs the same effects, StrictMode %s', async (strict) => {
        for (let seed = 1; seed <= 100; seed++) {
            expect(await replay(seed, 50, strict)).toBeNull();
        }
    }, 240000);
});
