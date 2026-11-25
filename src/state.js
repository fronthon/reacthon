// A component's state, read off Python's own scopes.
//
// React calls a component again at each render, so its locals start over. A
// local that a nested function rebinds (`nonlocal`) or changes in place has to
// outlive the render that made it, or what the handler did is lost at the next
// one: those, and only those, are the component's state. Each becomes a cell
// of the component, which Python reads and writes wherever it reads and writes
// the name, from the render or from a handler made at any earlier render. The
// rest is computed again at each render, which is what React means by a value
// derived from state.
//
// What a handler does to a parameter is done to what the parent handed it,
// whose own state follows it: a prop is never made a cell.
import { walkScoped, scopeIn, refuse } from 'brycomp';

// The hook every component with a state calls, and the local that holds what
// it hands back. One leading underscore: two would be mangled inside a class
// the component defines.
export const CELLS = '_reacthon_cells';
const HOLDER = '_reacthon_s';

// The methods that change their receiver in place, on Python's containers.
const MUTATORS = new Set([
    'append', 'extend', 'insert', 'remove', 'pop', 'clear', 'sort', 'reverse',
    'update', 'setdefault', 'popitem', 'add', 'discard',
    'difference_update', 'intersection_update', 'symmetric_difference_update'
]);

const $B = () => globalThis.__BRYTHON__;
const is = (node, ...names) => names.some((one) => node instanceof $B().ast[one]);

// What a write or a call changes: `x` in `x[0]["done"] = True`, `x.a.b = 1`,
// `x.get("k").append(1)`.
function changed(node) {
    for (;;) {
        if (is(node, 'Subscript', 'Attribute')) node = node.value;
        else if (is(node, 'Call') && is(node.func, 'Attribute')) node = node.func.value;
        else return is(node, 'Name') ? node : null;
    }
}

// The block a name read in `block` is bound in: up through the functions that
// only pass it on, past a class, whose names a function inside never sees.
// Null for the module's and the builtins.
function owner(table, parents, block, name) {
    const flags = $B().SYMBOL_FLAGS;

    for (let at = block, first = true; at !== undefined; at = parents.get(at), first = false) {
        if (!first && at.type === flags.TYPE_CLASS) continue;

        const scope = scopeIn(at, name);

        if (scope === flags.LOCAL || scope === flags.CELL) return at;
        if (scope !== flags.FREE && scope !== 0) return null;
    }

    return null;
}

const isComponent = (node) => is(node, 'FunctionDef') && /^[A-Z]/.test(node.name);

// The text of a component module, its state made cells: the same lines, so an
// error and the source map keep the author's line. Null when no component
// keeps a state.
export function withState(host, text, table, ast, source) {
    const flags = $B().SYMBOL_FLAGS;
    const parents = new Map();
    const index = (block) => block.children.forEach((child) => (parents.set(child, block), index(child)));
    const lines = text.split('\n');
    const edits = [];

    index(table.top);

    for (const component of ast.body.filter(isComponent)) {
        const own = table.blockOf(component);
        const ours = (scope, name) => owner(table, parents, table.blockOf(scope), name) === own;
        const param = (name) => ($B().str_dict_get(own.symbols, name, 0) & flags.DEF_PARAM) !== 0;
        const fail = (message, node) => {
            throw refuse(`${host.name} — ${message} (${source}:${node.lineno})`, source, node.lineno, node.col_offset);
        };

        const names = [];
        const nonlocals = [];
        const rebinds = [];
        const changes = [];
        const bindings = new Map();
        const returns = [];
        const defs = [];
        const called = new Set();

        walkScoped([component], (node, scope, line, parent) => {
            // The `def` itself, its decorators and its defaults, which the
            // module evaluates.
            if (scope === null) return;

            const nested = scope !== component;

            if (is(node, 'Name')) {
                names.push({ node, scope });
                if (!nested && !is(node.ctx, 'Load')) bindings.set(node.id, [...(bindings.get(node.id) ?? []), { node, parent }]);
                return;
            }

            if (!nested) {
                if (is(node, 'Return')) returns.push(node);
                if (is(node, 'FunctionDef', 'AsyncFunctionDef')) defs.push(node);
                if (is(node, 'Call') && is(node.func, 'Name')) called.add(node.func.id);
                for (const name of bound(node)) bindings.set(name, [...(bindings.get(name) ?? []), { node, parent }]);
                return;
            }

            if (is(node, 'Nonlocal')) {
                const kept = node.names.filter((name) => ours(scope, name));

                for (const name of kept) rebinds.push({ name, node, scope });
                if (kept.length) nonlocals.push({ node, kept });
                return;
            }

            const targets = is(node, 'Assign') ? node.targets : is(node, 'AugAssign', 'AnnAssign') ? [node.target] : is(node, 'Delete') ? node.targets : [];
            const found = [...targets.filter((one) => is(one, 'Subscript', 'Attribute')).map(changed)];

            if (is(node, 'Call') && is(node.func, 'Attribute') && MUTATORS.has(node.func.attr)) found.push(changed(node.func.value));

            for (const name of found) {
                if (name !== null && ours(scope, name.id) && !param(name.id)) changes.push({ name: name.id, node: name, scope });
            }
        });

        // A function the render calls itself is part of the render: what its
        // own body rebinds or changes is computed again at each render, an
        // accumulator as much as a value. What a handler does, after the
        // render, is what has to last, one a called function makes and hands
        // back included.
        const rendering = (scope) => defs.includes(scope) && called.has(scope.name);

        // Given its first value once, by one assignment of its own at the top
        // of the component, which the hook precedes.
        const assignment = (binding) =>
            is(binding.node, 'Name') &&
            ((is(binding.parent, 'Assign') && binding.parent.targets.length === 1) || (is(binding.parent, 'AnnAssign') && binding.parent.value));
        const simple = (name) => {
            const found = bindings.get(name) ?? [];

            return found.length === 1 && assignment(found[0]) && component.body.includes(found[0].parent);
        };

        // A value the component makes itself, `[]`, `{}`, `Point(0)`: it reads
        // no name of the component's, as an alias of a prop or a copy of one
        // does.
        const ownName = (id) => {
            const scope = scopeIn(own, id);

            return scope === flags.LOCAL || scope === flags.CELL || param(id);
        };
        // The names the value binds itself, a comprehension's targets, are
        // not read from the component.
        const made = (value) => {
            const read = new Set();
            const bound = new Set();

            walkScoped([value], (node) => {
                if (is(node, 'Name')) (is(node.ctx, 'Load') ? read : bound).add(node.id);
            });

            return ![...read].some((id) => !bound.has(id) && ownName(id));
        };
        const fresh = (name) => (bindings.get(name) ?? []).every((binding) => assignment(binding) && made(binding.parent.value));

        const state = new Set();

        for (const { name, node, scope } of rebinds) {
            if (rendering(scope)) continue;
            if (param(name)) fail(`\`${name}\` is a prop, which the parent holds: copy it into a name of the component's own to change it`, node);
            if (!simple(name)) {
                const first = bindings.get(name)?.[0]?.node ?? node;

                fail(
                    `\`${name}\` is the component's state, since a nested function rebinds it: it takes its first ` +
                        `value from one assignment of its own, \`${name} = …\`, at the top of the component`,
                    first
                );
            }
            state.add(name);
        }

        // A name changed in place holds a state of the component's when the
        // component made its value. Bound otherwise, `items, set_items =
        // use_state([])` or `items = rows`, it holds what something else keeps.
        for (const { name, scope } of changes) {
            if (rendering(scope) || !fresh(name)) continue;
            if (!simple(name)) {
                fail(
                    `\`${name}\` is made by the component and changed in place by a nested function: it takes its ` +
                        `first value from one assignment of its own, \`${name} = …\`, at the top of the component, ` +
                        `or what the handler changes is lost at the next render`,
                    bindings.get(name)[0].node
                );
            }
            state.add(name);
        }

        for (const { name, node, scope } of rebinds) {
            if (state.has(name) && rendering(scope)) fail(`\`${name}\` is the component's state, which a function the render calls rebinds: a state changes after the render, in a handler`, node);
        }

        if (state.size === 0) continue;

        const inits = [...state].map((name) => ({ name, statement: bindings.get(name)[0].parent }));

        const head = inits.reduce((a, b) => (before(b.statement, a.statement) ? b : a)).statement;
        const early = returns.find((one) => before(one, head));

        if (early) fail(`a component returns after its state is made, so that React finds it at every render`, early);

        const list = `(${[...state].map((name) => JSON.stringify(name)).join(', ')},)`;

        for (const { name, statement } of inits) {
            const lead = statement === head ? `${HOLDER} = ${CELLS}(${list}); ` : '';
            const equals = afterEquals(lines, is(statement, 'Assign') ? statement.targets[0] : statement.annotation);

            if (equals === null) fail(`\`${name} = …\` is written with its \`=\` on the line of its name`, statement);
            edits.push({ from: at(statement), to: equals, text: `${lead}${HOLDER}._has("${name}") or ${HOLDER}._first("${name}",` });
            edits.push({ from: end(statement.value), to: end(statement.value), text: ')' });
        }

        for (const { node, kept } of nonlocals) {
            const rest = node.names.filter((name) => !kept.includes(name));

            if (node.lineno !== node.end_lineno) fail('a `nonlocal` of the state is written on one line', node);
            edits.push({ from: at(node), to: end(node), text: rest.length ? `nonlocal ${rest.join(', ')}` : 'pass' });
        }

        const targets = new Set(inits.map(({ statement }) => (is(statement, 'Assign') ? statement.targets[0] : statement.target)));

        for (const { node, scope } of names) {
            if (state.has(node.id) && !targets.has(node) && ours(scope, node.id)) {
                edits.push({ from: at(node), to: end(node), text: `${HOLDER}.${node.id}` });
            }
        }
    }

    return edits.length ? applied(text, edits) : null;
}

// What a statement binds in its own scope besides a plain name: a `def`, a
// class, an import, an `except … as`, a `match` capture.
function bound(node) {
    if (is(node, 'FunctionDef', 'AsyncFunctionDef', 'ClassDef')) return [node.name];
    if (is(node, 'Import', 'ImportFrom')) return node.names.map((alias) => (alias.asname ?? alias.name).split('.')[0]);
    if (is(node, 'ExceptHandler') && node.name) return [node.name];
    if (is(node, 'MatchAs', 'MatchStar') && node.name) return [node.name];
    if (is(node, 'MatchMapping') && node.rest) return [node.rest];
    return [];
}

const at = (node) => ({ line: node.lineno, column: node.col_offset });
const end = (node) => ({ line: node.end_lineno, column: node.end_col_offset });
const before = (one, other) => one.lineno < other.lineno || (one.lineno === other.lineno && one.col_offset < other.col_offset);

// Just past the `=` that follows `node`, the target or the annotation of an
// assignment, when it stands on the same line.
function afterEquals(lines, node) {
    const rest = lines[node.end_lineno - 1].slice(node.end_col_offset);
    const found = /^\s*=/.exec(rest);

    return found === null ? null : { line: node.end_lineno, column: node.end_col_offset + found[0].length };
}

// The edits, each on one line, applied from the last: none moves another's
// place, and none adds a line.
function applied(text, edits) {
    const lines = text.split('\n');
    const order = (a, b) => b.from.line - a.from.line || b.from.column - a.from.column;

    for (const { from, to, text: inserted } of [...edits].sort(order)) {
        const line = lines[from.line - 1];
        lines[from.line - 1] = line.slice(0, from.column) + inserted + line.slice(to.column);
    }

    return lines.join('\n');
}
