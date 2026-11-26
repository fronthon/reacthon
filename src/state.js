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

// A hook, React's or the author's, named as React names one: `use_ref`.
const HOOK = /^use_/;

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

// `draft := ""` on a statement of its own, the way a handler writes a name of
// its component, where Python asks for parentheses: they are added as Python
// reads them, `(draft := "")`, on the same lines. Where a statement starts and
// ends is read by the engine's own tokenizer, which knows a string, a comment,
// a `;` and a line a bracket left open. A text it cannot read is left as it is,
// for the compile to say why.
export function parenthesized(text, source) {
    const engine = $B();
    const names = Object.fromEntries(Object.entries(engine.py_tokens).map(([name, number]) => [number, name]));
    const kind = (token) => names[token.type];
    const ends = (token) => kind(token) === 'NEWLINE' || kind(token) === 'ENDMARKER' || (kind(token) === 'OP' && token.string === ';');
    const quiet = (token) => ['NL', 'COMMENT', 'INDENT', 'DEDENT', 'ENCODING'].includes(kind(token));
    let tokens;

    try {
        tokens = engine.tokenizer(text, source, 'file');
    } catch {
        return text;
    }

    const edits = [];
    let starting = true;

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (ends(token) || ['INDENT', 'DEDENT'].includes(kind(token))) {
            starting = true;
            continue;
        }
        if (quiet(token)) continue;

        const next = tokens[i + 1];

        if (starting && kind(token) === 'NAME' && next && kind(next) === 'OP' && next.string === ':=') {
            let depth = 0;
            let last = next;

            for (let j = i + 2; j < tokens.length; j++) {
                const one = tokens[j];

                if (kind(one) === 'OP' && '([{'.includes(one.string)) depth++;
                if (kind(one) === 'OP' && ')]}'.includes(one.string)) depth--;
                if (depth <= 0 && ends(one)) break;
                if (!quiet(one)) last = one;
            }

            edits.push({ from: at(token), to: at(token), text: '(' });
            edits.push({ from: end(last), to: end(last), text: ')' });
        }

        starting = false;
    }

    return edits.length ? applied(text, edits) : text;
}

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
        const walruses = [];
        const augmented = [];
        const bindings = new Map();
        const returns = [];
        const defs = [];
        const called = new Set();

        // A name the component binds, a prop included.
        const ownName = (id) => {
            const scope = scopeIn(own, id);

            return scope === flags.LOCAL || scope === flags.CELL || param(id);
        };
        const blockOf = (scope, id) => owner(table, parents, table.blockOf(scope), id);

        walkScoped([component], (node, scope, line, parent) => {
            // The `def` itself, its decorators and its defaults, which the
            // module evaluates.
            if (scope === null) return;

            const nested = scope !== component;

            if (is(node, 'Name')) {
                names.push({ node, scope, parent });
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

            // `draft := value` in a nested function writes the component's
            // `draft`, as `nonlocal draft` then `draft = value` would. Python
            // binds it in the function, which then holds a name of its own
            // that dies with the call: nothing it could mean is taken.
            if (is(node, 'NamedExpr') && is(node.target, 'Name') && ownName(node.target.id)) {
                const block = blockOf(scope, node.target.id);

                if (block !== own) walruses.push({ name: node.target.id, node, scope, block });
            }

            if (is(node, 'AugAssign') && is(node.target, 'Name') && ownName(node.target.id) && blockOf(scope, node.target.id) !== own) {
                augmented.push({ node, scope });
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
        // does. The names the value binds itself, a comprehension's targets, are
        // not read from the component. A hook's, `use_ref(None)`, is React's to
        // keep, and its call React's to find at every render.
        const made = (value) => {
            const read = new Set();
            const bound = new Set();
            let hooked = false;

            walkScoped([value], (node) => {
                if (is(node, 'Name')) (is(node.ctx, 'Load') ? read : bound).add(node.id);
                if (is(node, 'Call') && HOOK.test(is(node.func, 'Name') ? node.func.id : is(node.func, 'Attribute') ? node.func.attr : '')) hooked = true;
            });

            return !hooked && ![...read].some((id) => !bound.has(id) && ownName(id));
        };
        const fresh = (name) => (bindings.get(name) ?? []).every((binding) => assignment(binding) && made(binding.parent.value));

        // What a nested function reads and writes of a name it holds itself,
        // apart from what `:=` writes.
        const walrusTargets = new Set(walruses.map(({ node }) => node.target));
        const reads = new Map();
        const writes = new Map();
        const noted = (map, block, id, node) => {
            if (!map.has(block)) map.set(block, new Map());
            map.get(block).set(id, [...(map.get(block).get(id) ?? []), node]);
        };

        for (const { node, scope, parent } of names) {
            if (scope === component) continue;

            const block = blockOf(scope, node.id);

            if (block === own || block === null) continue;
            if (is(node.ctx, 'Load')) noted(reads, block, node.id, node);
            else if (!walrusTargets.has(node)) noted(writes, block, node.id, { node, parent });
        }

        const walrusBlocks = new Map();

        for (const { name, node, scope, block } of walruses) {
            if (param(name)) fail(`\`${name}\` is a prop, which the parent holds: copy it into a name of the component's own to change it`, node);
            if (writes.get(block)?.has(name)) {
                fail(`\`${name}\` is written with \`:=\`, the component's, and with \`=\`, a name of the function's own, in one function: rename the second`, node);
            }
            if (rendering(scope)) {
                fail(`\`${name} := …\` writes the component's \`${name}\` after the render, and this function is called by the render: write \`nonlocal ${name}\` there`, node);
            }
            if (!walrusBlocks.has(block)) walrusBlocks.set(block, new Set());
            walrusBlocks.get(block).add(name);
            rebinds.push({ name, node, scope });
        }

        // `draft = ""` in a handler, on a name of the component's, binds a name
        // of the handler's own that nothing reads, and `count += 1` alone one
        // that has no value yet: the component's was meant.
        for (const [block, written] of writes) {
            for (const [id, found] of written) {
                if (!ownName(id) || param(id) || walrusBlocks.get(block)?.has(id) || reads.get(block)?.has(id)) continue;
                if (found.every(({ parent }) => is(parent, 'Assign'))) {
                    fail(`\`${id} = …\` in a nested function binds a name of its own that nothing reads: \`${id} := …\` writes the component's`, found[0].node);
                }
            }
        }
        for (const { node, scope } of augmented) {
            const id = node.target.id;
            const found = writes.get(blockOf(scope, id))?.get(id) ?? [];

            if (!param(id) && found.every(({ parent }) => is(parent, 'AugAssign'))) {
                fail(`\`${id} ${opSign(node)}= …\` reads a name of the function's own that has no value yet: \`${id} := ${id} ${opSign(node)} …\` writes the component's`, node);
            }
        }

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
            const equals = afterSign(lines, is(statement, 'Assign') ? statement.targets[0] : statement.annotation, '=');

            if (equals === null) fail(`\`${name} = …\` is written with its \`=\` on the line of its name`, statement);
            edits.push({ from: at(statement), to: equals, text: `${lead}${HOLDER}._has("${name}") or ${HOLDER}._first("${name}",` });
            edits.push({ from: end(statement.value), to: end(statement.value), text: ')' });
        }

        for (const { node, kept } of nonlocals) {
            const rest = node.names.filter((name) => !kept.includes(name));

            if (node.lineno !== node.end_lineno) fail('a `nonlocal` of the state is written on one line', node);
            edits.push({ from: at(node), to: end(node), text: rest.length ? `nonlocal ${rest.join(', ')}` : 'pass' });
        }

        // `draft := value` becomes a write of the cell, which answers the
        // value as `:=` does.
        for (const { name, node } of walruses) {
            const walrus = afterSign(lines, node.target, ':=');

            if (walrus === null) fail(`\`${name} := …\` is written with its \`:=\` on the line of its name`, node);
            edits.push({ from: at(node.target), to: walrus, text: `${HOLDER}._set("${name}",` });
            edits.push({ from: end(node.value), to: end(node.value), text: ')' });
        }

        const targets = new Set(inits.map(({ statement }) => (is(statement, 'Assign') ? statement.targets[0] : statement.target)));
        const reached = (scope, id) => ours(scope, id) || walrusBlocks.get(blockOf(scope, id))?.has(id);

        for (const { node, scope } of names) {
            if (state.has(node.id) && !targets.has(node) && !walrusTargets.has(node) && reached(scope, node.id)) {
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

// Just past the sign, `=` or `:=`, that follows `node`, the target or the
// annotation of an assignment, when it stands on the same line.
function afterSign(lines, node, sign) {
    const rest = lines[node.end_lineno - 1].slice(node.end_col_offset);

    return rest.trimStart().startsWith(sign)
        ? { line: node.end_lineno, column: node.end_col_offset + (rest.length - rest.trimStart().length) + sign.length }
        : null;
}

const SIGNS = { Add: '+', Sub: '-', Mult: '*', Div: '/', FloorDiv: '//', Mod: '%', Pow: '**', BitOr: '|', BitAnd: '&', BitXor: '^', LShift: '<<', RShift: '>>', MatMult: '@' };
const opSign = (node) => SIGNS[Object.keys(SIGNS).find((name) => is(node.op, name))] ?? '+';

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
