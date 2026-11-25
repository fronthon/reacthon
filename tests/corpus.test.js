// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parenthesized } from '../src/state.js';

// CPython's standard library, where the machine has one: Python as it is
// written, in which no `:=` stands alone on its statement.
const LIBRARY = ['/usr/lib/python3.14', '/usr/local/lib/python3.14'].find((one) => existsSync(one));

function* sources(folder) {
    for (const name of readdirSync(folder)) {
        const path = join(folder, name);

        if (name === 'site-packages' || name === 'dist-packages') continue;
        if (statSync(path).isDirectory()) yield* sources(path);
        else if (name.endsWith('.py')) yield path;
    }
}

describe.skipIf(LIBRARY === undefined)("CPython's standard library", () => {
    it('comes out of the parenthesising of `name := value` as it went in', () => {
        const changed = [];
        let read = 0;

        for (const path of sources(LIBRARY)) {
            const text = readFileSync(path, 'utf8');

            read += 1;
            if (parenthesized(text, path) !== text) changed.push(path);
        }

        expect(read).toBeGreaterThan(500);
        expect(changed).toEqual([]);
    }, 120000);
});
