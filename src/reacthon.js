// Reacthon's Vite plugin: a `.py` imported from JavaScript, or from another
// `.py`, is compiled at build time into an ES module whose components React
// renders. Nothing is translated while the page loads.
import { relative, resolve, dirname } from 'node:path';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { compile } from './compile.js';

// `import reacthon` is the package's own module, wherever the importer stands.
const OWN = { reacthon: fileURLToPath(new URL('./reacthon.py', import.meta.url)) };

export function reacthon(options = {}) {
    // Mirrors PYTHONPATH: where `import cart` looks after the importer's own folder.
    const searchPath = (options.path || []).map((one) => resolve(one));
    const compiled = new Map();

    const compileFile = (file) => {
        const stamp = statSync(file).mtimeMs;
        const held = compiled.get(file);

        if (held && held.stamp === stamp) return held.result;

        const result = compile(readFileSync(file, 'utf8'), relative(process.cwd(), file));

        compiled.set(file, { stamp, result });
        return result;
    };

    // `import cart` → the file it names, evaluated first, so that the module is
    // published before the importer's body runs.
    const pythonImports = (names, fromDirectory) =>
        names
            .flatMap(
                (one) =>
                    OWN[one] ??
                    ([fromDirectory, ...searchPath]
                        .map((directory) => resolve(directory, `${one.replace(/\./g, '/')}.py`))
                        .find((candidate) => existsSync(candidate)) ||
                        [])
            )
            .map((path) => `import ${JSON.stringify(path)};`)
            .join('\n');

    return {
        name: 'reacthon',
        enforce: 'pre',

        resolveId(id, importer) {
            if (id.endsWith('.py') && (id.startsWith('.') || id.startsWith('/'))) {
                const found = importer && id.startsWith('.') ? resolve(dirname(importer), id) : resolve(id);

                if (existsSync(found)) return found;
            }
        },

        load(id) {
            if (!id.endsWith('.py')) return;

            const { code, map, imports } = compileFile(id);
            const prelude = pythonImports(imports, dirname(id));

            this.addWatchFile(id);

            // The prelude adds lines above the module, which its source map
            // counts as lines that map to nothing.
            if (!prelude) return { code, map };

            const lines = prelude.split('\n').length;

            return { code: `${prelude}\n${code}`, map: { ...map, mappings: ';'.repeat(lines) + map.mappings } };
        }
    };
}

export default reacthon;
