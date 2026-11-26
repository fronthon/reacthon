// Build-time half of Reacthon. Brycomp translates the Python; this file says
// to it what is Reacthon's (`HOST`) and wraps the module it hands back: a `.py`
// is an ordinary Python module, run once, whose functions are React's
// components and whose other names JavaScript imports as they are.
import { compile as compileCommon, declaredExports, jsImportLine, JS_RESERVED } from 'brycomp';

import { withState, parenthesized, CELLS } from './state.js';

const HOST = {
    name: 'reacthon',
    bridge: 'reacthon/bridge',
    runtime: { withNamespace: 'withNamespace', pyError: 'pyError' },
    reserved: { words: [], said: '' },
    instead: {
        json: '`js.JSON.parse(text)` reads JSON and `js.JSON.stringify(value)` writes it',
        random: '`js.Math.random()` draws a number',
        time: '`js.Date.now()` reads the clock'
    },
    pathOption: 'path',
    // Bryntime's `d[k]`, `x in c`, `==` and the rest done inline, which the
    // bridge's Bryntime always carries.
    fast: '$bryntimeFast'
};

const pythonModuleName = (source) => source.split('/').pop().replace(/\.py$/, '');

const exportable = (name) => /^[A-Za-z_$][\w$]*$/.test(name) && !JS_RESERVED.has(name);

// The names the module binds at its top level, which JavaScript may import:
// `__all__` when the module declares it, as a Python caller reads it.
function topLevelNames(body) {
    const names = new Set();
    const targets = (node) => {
        if (node.id) names.add(node.id);
        for (const one of node.elts || []) targets(one);
    };

    for (const node of body) {
        if (node.name && !node.names) names.add(node.name);
        for (const one of node.targets || []) targets(one);
        if (node.target) targets(node.target);
        for (const alias of node.names || []) if (alias.name !== '*') names.add((alias.asname || alias.name).split('.')[0]);
    }

    return [...names];
}

export function compile(written, source) {
    const named = pythonModuleName(source);
    const text = parenthesized(written, source);
    const options = {
        name: source.replace(/\W/g, '_'),
        source,
        named,
        // `js`, JavaScript's globals, which every module reads by that name,
        // and the hook a component's state is kept by.
        jsNames: ['js', CELLS],
        sourceContent: written
    };
    let compiled = compileCommon(HOST, text, options);

    // Read on the author's text, and compiled again with the state made cells:
    // the same lines, so the source map and the errors keep their place.
    const stated = withState(HOST, text, compiled.table, compiled.root._ast, source);

    if (stated !== null) compiled = compileCommon(HOST, stated, options);

    const { root, table, module, map, imported, jsImports, jsImported } = compiled;

    const declaration = declaredExports(HOST, root._ast, table, source, 0, compiled.src);
    const exported = (declaration === null ? topLevelNames(root._ast.body) : declaration.names)
        .filter((n) => !n.startsWith('_') && exportable(n) && !jsImported.includes(n) && n !== '__js__');
    // What `__js__` imports is the module's too, as a name Python imports is:
    // handed on to JavaScript as it is.
    const handedOn = [...new Set(jsImported)].filter((n) => !n.startsWith('_') && exportable(n) && (declaration === null || declaration.names.includes(n)));

    // Appended after Brycomp's module, so its source map stays true line for
    // line: what follows maps to nothing, which is what it is.
    const tail = [
        ``,
        `import { moduleNamespace as __reacthon_namespace, exported as __reacthon_exported, jsCall as __reacthon_jsCall } from 'reacthon/bridge';`,
        ...jsImports.map((one) => jsImportLine(HOST, one)),
        `const __reacthon_ns = __reacthon_namespace(${JSON.stringify(named)});`,
        // Wrapped once, so that Python reads the same object at every read.
        ...[...new Set(jsImported)].map((n) => `__reacthon_ns.${n} = __reacthon_jsCall(${n});`),
        `init(__reacthon_ns);`,
        ...exported.map((n) => `export const ${n} = __reacthon_exported(__reacthon_ns, ${JSON.stringify(n)});`),
        ...(handedOn.length ? [`export { ${handedOn.join(', ')} };`] : []),
        `export default __reacthon_ns;`
    ];

    // The cells are the `reacthon` module's, loaded first even where the
    // source imports nothing of it.
    return { code: `${module}\n${tail.join('\n')}`, map, imports: stated === null ? imported : [...imported, 'reacthon'] };
}
