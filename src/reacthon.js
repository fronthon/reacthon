// Reacthon's Vite plugin: a `.py` imported from JavaScript, or from another
// `.py`, is compiled at build time into an ES module whose components React
// renders. Nothing is translated while the page loads.
import { relative, resolve, dirname } from 'node:path';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { compile } from './compile.js';

// `import reacthon` is the package's own module, wherever the importer stands.
const OWN = { reacthon: fileURLToPath(new URL('./reacthon.py', import.meta.url)) };

// Vite hands its optimizer the scan's plugins too, where a `.py` is no module
// to read the imports of: the scan is told apart by its own plugin.
const pythonScan = (scanned) => {
    let scanning = false;

    return {
        name: 'reacthon:dep-scan',
        options(options) {
            scanning = options.plugins.some((one) => one?.name === 'vite:dep-scan:resolve');
        },
        transform(code, id) {
            return scanning && id.endsWith('.py') ? { code: scanned(id), moduleType: 'js' } : null;
        }
    };
};

const pythonScanEsbuild = (scanned) => ({
    name: 'reacthon:dep-scan',
    setup(build) {
        if (!build.initialOptions?.plugins?.some((one) => one.name === 'vite:dep-scan')) return;

        build.onLoad({ filter: /\.py$/ }, ({ path }) => ({ contents: scanned(path), loader: 'js', resolveDir: dirname(path) }));
    }
});

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
    const pythonFiles = (names, fromDirectory) =>
        names.flatMap(
            (one) =>
                OWN[one] ??
                ([fromDirectory, ...searchPath]
                    .map((directory) => resolve(directory, `${one.replace(/\./g, '/')}.py`))
                    .find((candidate) => existsSync(candidate)) ||
                    [])
        );
    const importLines = (paths) => paths.map((path) => `import ${JSON.stringify(path)};`).join('\n');

    // What Vite's dependency scanner reads of a `.py`: its module, which
    // imports the bridge and what `__js__` names, and the files of its Python
    // imports, which the scanner reads in turn, beside the importer: an
    // absolute path is external to the scan. One that does not compile is
    // left to its load, which says why.
    const scanned = (file) => {
        try {
            const { code, imports } = compileFile(file);
            const files = pythonFiles(imports, dirname(file)).map((path) => `./${relative(dirname(file), path).replaceAll('\\', '/')}`);

            return `${importLines(files)}\n${code}`;
        } catch {
            return '';
        }
    };

    return {
        name: 'reacthon',
        enforce: 'pre',

        // A package a `.py` imports, Brylters, is bundled with the bridge
        // before the first page, both on one Bryntime, as Svelthon has it: the
        // scanner, which reads JavaScript, is handed what each `.py` imports
        // (`pythonScan`), by Rolldown's option or by esbuild's, whichever
        // scans; and Bryntime is deduplicated for the browser, where a linked
        // package, which Vite serves as it is, found a copy of its own.
        config() {
            const scan = this?.meta?.rolldownVersion
                ? { rolldownOptions: { plugins: [pythonScan(scanned)] } }
                : { esbuildOptions: { plugins: [pythonScanEsbuild(scanned)] } };

            return {
                environments: { client: { resolve: { dedupe: ['bryntime'] } } },
                optimizeDeps: { ...scan, extensions: ['.py'] }
            };
        },

        resolveId(id, importer) {
            if (id.endsWith('.py') && (id.startsWith('.') || id.startsWith('/'))) {
                const found = importer && id.startsWith('.') ? resolve(dirname(importer), id) : resolve(id);

                if (existsSync(found)) return found;
            }
        },

        load(id) {
            if (!id.endsWith('.py')) return;

            const { code, map, imports } = compileFile(id);
            const prelude = importLines(pythonFiles(imports, dirname(id)));

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
