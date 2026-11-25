import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { Formats, Converted, Plain } from './fixtures/Formats.py';
import { render } from './render.js';

const fixtures = resolve('tests/fixtures');

// CPython 3.14 reads the same file, t-strings included, and says what each
// field writes: the oracle, where there is one on the machine.
const oracle = (() => {
    try {
        const output = execFileSync('python3', ['-B', `${fixtures}/formats_oracle.py`, fixtures], { encoding: 'utf8' });
        return JSON.parse(output);
    } catch {
        return null;
    }
})();

const texts = (page) => [...page.container.querySelectorAll('li')].map((li) => li.textContent);

// What the engine writes otherwise today, each family by the number of its
// entry in the list of things to do: the test fails when one of them comes out
// right, so that its line here goes with it.
const KNOWN = [
    ['294, a float with a precision alone', (kind, spec) => kind === 'float' && spec === '.3'],
    ['295, % of an infinity or a NaN', (kind, spec, named) => /inf|nan/.test(named) && spec.endsWith('%')],
    ['296, a complex number', (kind) => kind === 'complex'],
    ['297, a string filled with 0', (kind, spec) => kind === 'str' && spec === '08']
];

const known = (kind, spec, named) => KNOWN.find(([, applies]) => applies(kind, spec, named))?.[0];

describe.skipIf(oracle === null)('a field written as CPython writes it', () => {
    it('formats each value by each specification CPython accepts for it', async () => {
        const page = await render(Formats, { cases: oracle.cases });
        const shown = texts(page);
        const cases = oracle.cases.map(([value, spec], at) => ({
            value: oracle.named[value],
            spec: oracle.specs[spec],
            cpython: oracle.formatted[at],
            reacthon: shown[at],
            known: known(oracle.kinds[value], oracle.specs[spec], oracle.named[value])
        }));

        expect(cases.length).toBeGreaterThan(300);
        expect(cases.filter((one) => !one.known && one.cpython !== one.reacthon)).toEqual([]);

        for (const [family] of KNOWN) {
            expect(cases.some((one) => one.known === family && one.cpython !== one.reacthon), family).toBe(true);
        }
    });

    it('converts each value by !r, !s and !a', async () => {
        expect(texts(await render(Converted))).toEqual(oracle.converted);
    });

    it('writes a field alone as str(), None and the booleans as nothing', async () => {
        expect(texts(await render(Plain))).toEqual(oracle.plain);
    });
});
