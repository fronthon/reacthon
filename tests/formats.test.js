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

describe.skipIf(oracle === null)('a field written as CPython writes it', () => {
    it('formats each value by each specification CPython accepts for it', async () => {
        const page = await render(Formats, { cases: oracle.cases });
        const shown = texts(page);
        const cases = oracle.cases.map(([value, spec], at) => ({
            value: oracle.named[value],
            spec: oracle.specs[spec],
            cpython: oracle.formatted[at],
            reacthon: shown[at]
        }));

        expect(cases.length).toBeGreaterThan(300);
        expect(cases.filter((one) => one.cpython !== one.reacthon)).toEqual([]);
    });

    it('converts each value by !r, !s and !a', async () => {
        expect(texts(await render(Converted))).toEqual(oracle.converted);
    });

    it('writes a field alone as str(), None and the booleans as nothing', async () => {
        expect(texts(await render(Plain))).toEqual(oracle.plain);
    });
});
