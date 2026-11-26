// What every compiled module imports, on Bryntime's engine, which its one
// entry loads and starts: React's elements made of a t-string, a Python
// function made a React component, and React's hooks under their Python
// names, published as the Python module `reacthon`.
import * as React from 'react';
import htm from 'htm';
import {
    registerModule,
    pyHandler,
    pyExport,
    pyData,
    pyError,
    plainData,
    pyStr,
    pyType,
    isDict,
    pyEntries,
    pyDict,
    track,
    trackEach,
    unsubscribe,
    pyGetattr,
    watchable,
    host,
    NONE
} from 'bryntime';

export { withNamespace, pyError, jsCall } from 'bryntime';

const $B = globalThis.__BRYTHON__;
const _b_ = $B.builtins;

const isPyFunction = (value) => typeof value === 'function' && value.ob_type === $B.function;
const isTemplate = (value) => value !== null && typeof value === 'object' && value.ob_type === $B.Template;
const isElement = (value) => value !== null && typeof value === 'object' && value.$$typeof !== undefined;
const pyCallable = (value) => value !== null && value !== undefined && value !== NONE && _b_.callable(value) === true;

// JavaScript's undefined is Python's None, and its null `javascript.NULL`,
// which is null itself: kept, as a library tells `slot={null}` from no slot.
const orNone = (value) => (value === undefined ? NONE : value);

// A Python call from JavaScript, by keyword when names are given, as Python
// calls `Counter(start=3)`.
const call = (fn, positional = [], keywords = null) =>
    keywords === null || Object.keys(keywords).length === 0
        ? $B.$call(fn, ...positional)
        : $B.$call(fn, ...positional, { [$B.KW]: [keywords] });

// What a hook was handed by Python: by position, or by name as `use_state(initial=0)`.
function hookArgs(name, args, params) {
    const last = args[args.length - 1];
    const keywords = last !== null && typeof last === 'object' && last[$B.KW] ? last[$B.KW][0] : null;
    const positional = keywords === null ? [...args] : args.slice(0, -1);

    if (positional.length > params.length) {
        $B.RAISE(_b_.TypeError, `${name}() takes at most ${params.length} arguments (${positional.length} given)`);
    }

    const values = params.map((_, at) => positional[at]);

    for (const [key, value] of Object.entries(keywords ?? {})) {
        const at = params.indexOf(key);

        if (at === -1) $B.RAISE(_b_.TypeError, `${name}() got an unexpected keyword argument '${key}'`);
        values[at] = value;
    }

    return values;
}

// The text React shows of a value: Python's `str()`, where React would show a
// float as an object. None and the booleans show nothing, as `null` and
// `false` show nothing in JSX, so `{done and t"<b>done</b>"}` reads as it does
// there.
function child(value) {
    if (value === undefined || value === null || value === NONE || value === true || value === false) return null;
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (isTemplate(value)) return element(value);
    if (isElement(value)) return value;
    if (Array.isArray(value)) return value.map(child);
    // A function as children, which the component calls with what it renders
    // by, as React Aria's do: called as a Python callable JavaScript calls.
    if (isPyFunction(value)) return pyHandler(value);

    // A Python iterable is children, as an array is in JSX; a mapping, bytes
    // and every other object show as `str()` shows them.
    if (pyType(value) !== undefined) {
        const iterable = !isDict(value) && _b_.hasattr(value, '__iter__') && !_b_.isinstance(value, _b_.bytes);

        return iterable ? _b_.list.$factory(value).map(child) : pyStr(value);
    }

    return value;
}

// A Python function in a tag's place is a React component: one per function,
// so React keeps its state from one render to the next. What a t-string hands
// it is Python's and stays itself, a list the very list and a setter the very
// setter; what a JavaScript parent hands it is copied in, an array as a list
// and an object as a dict, as Bryntime copies JavaScript's data into Python.
// A library that clones the element is such a parent for what it adds,
// recharts the `payload` of its tooltip's content: the element says which
// props Python gave it, one string a memo compares as the same at each render.
const COMPONENTS = new WeakMap();
const FROM_PYTHON = '__reacthon_python';
const pythonKeys = (given) => Object.keys(given).join('\n');
const KEY_SETS = new Map();
const keySet = (keys) => {
    let set = KEY_SETS.get(keys);

    if (set === undefined) KEY_SETS.set(keys, (set = new Set(keys.split('\n'))));
    return set;
};

// The component rendering now: its cells, and what they hold once it has
// returned, which its effects and their cleanups read, as React's read the
// values of their render.
let rendering = null;

function component(fn) {
    let made = COMPONENTS.get(fn);

    if (made === undefined) {
        const name = fn.$function_infos?.[1] ?? fn.name;
        const where = `${name}() — ${fn.$function_infos?.[3] ?? 'reacthon'}`;

        made = function (props) {
            const keywords = {};
            const given = typeof props[FROM_PYTHON] === 'string' ? keySet(props[FROM_PYTHON]) : null;

            for (const [key, value] of Object.entries(props)) {
                const python = given !== null && given.has(key);

                // A prop JavaScript hands as undefined is absent, as React's
                // destructuring reads it: the parameter keeps its default.
                if (key === FROM_PYTHON || (!python && value === undefined)) continue;
                keywords[key] = python || key === 'children' || isElement(value) ? orNone(value) : pyData(value);
            }

            const outer = rendering;
            const frame = { cells: [], effects: false, seen: [] };

            rendering = frame;
            try {
                const made = call(fn, [], keywords);

                if (frame.effects) {
                    frame.seen = frame.cells.map(({ holder, names }) => ({
                        holder,
                        names,
                        values: names.map((name) => pyGetattr(holder, name, NONE))
                    }));
                }
                return child(made);
            } catch (error) {
                throw pyError(error, where);
            } finally {
                rendering = outer;
            }
        };

        Object.defineProperty(made, 'name', { value: name });
        made.displayName = name;
        COMPONENTS.set(fn, made);
    }

    return made;
}

const DOM_NAMES = { class: 'className', for: 'htmlFor' };
const CONTEXT = Symbol.for('react.context');
// The contexts `create_context` made, whose values are Python's; a library's
// is handed its value as its other props are.
const PY_CONTEXTS = new WeakSet();
// The components `memo` made of Python ones, whose props are Python's.
const PY_MEMOS = new WeakSet();

// `use_ref()`'s object, the class `reacthon.py` declares, read once the module
// has run.
const refClass = () => $B.imported.reacthon?.Ref;
const isRef = (value) => refClass() !== undefined && _b_.isinstance(value, refClass()) === true;

// An element named by `ref={box}` is set on `box.current`, and NULL once it
// leaves the page, React's null: one setter per ref, so React does not detach
// it at each render.
const REF_SETTERS = new WeakMap();

function refSetter(ref) {
    let made = REF_SETTERS.get(ref);

    if (made === undefined) {
        made = (node) => void $B.$setattr1(ref, 'current', orNone(node));
        REF_SETTERS.set(ref, made);
    }

    return made;
}

// A prop of an element of the page crosses into JavaScript: a callable as a
// handler that hands Python its event, a container as a plain copy, None as
// absent. A prop of a Python component stays the Python value it was.
function domProps(props) {
    const out = {};

    for (const [key, value] of Object.entries(props)) {
        const name = DOM_NAMES[key] ?? key;

        if (key === 'ref' && isRef(value)) out.ref = refSetter(value);
        else if (pyCallable(value) && !isElement(value)) out[name] = pyHandler(value);
        else if (value === NONE) out[name] = undefined;
        // An attribute is text, and a float's is Python's: `value={21.0}` is "21.0".
        else if (value?.ob_type === _b_.float) out[name] = pyStr(value);
        else out[name] = plainData(value);
    }

    return out;
}

// A component's `class` is its `className`, the name every React component
// takes, written in Python or in JavaScript.
const renamed = (props) => Object.fromEntries(Object.entries(props ?? {}).map(([key, value]) => [DOM_NAMES[key] ?? key, value]));

// A prop of a component written in JavaScript: what Python hands it crosses as
// Bryntime exports a value, a callable as a function; a list, a tuple or a dict
// as a plain copy (`copied`), as React's props are data a library keeps and
// may freeze, `style` as on an element of the page: React freezes it. A
// t-string is its element, and a function named as a component, `Label`, a
// React component, alone or in a container, as a render prop, a set of icons
// or the parts a library renders with are in JSX.
const isPyComponent = (value) => isPyFunction(value) && /^[A-Z]/.test(value.$function_infos?.[1] ?? value.name);

const propValue = (value, where) =>
    isTemplate(value) ? element(value) : isPyComponent(value) ? component(value) : isContainer(value) ? copied(value) : pyExport(value, where);

function jsProps(props) {
    const out = {};

    for (const [key, value] of Object.entries(renamed(props))) {
        if (value === NONE) out[key] = undefined;
        else if (key === 'style') out[key] = plainData(value);
        else out[key] = propValue(value, `${key} — reacthon`);
    }

    return out;
}

function h(type, props, ...children) {
    const kids = children.map(child);

    if (isPyFunction(type) || PY_MEMOS.has(type)) {
        const given = renamed(props);

        return React.createElement(PY_MEMOS.has(type) ? type : component(type), { ...given, [FROM_PYTHON]: pythonKeys(given) }, ...kids);
    }
    if (typeof type === 'string') return React.createElement(type, props === null ? null : domProps(props), ...kids);

    // A context's value is Python's, read back by `use_context`.
    if (type?.$$typeof === CONTEXT && PY_CONTEXTS.has(type)) return React.createElement(type, props, ...kids);

    // What an import from JavaScript made of a component is an adapter for
    // Python's calls; React is handed the component itself.
    const own = typeof type === 'function' ? (type[$B.JSOBJ] ?? type) : type;

    return React.createElement(own, props === null ? null : jsProps(props), ...kids);
}

const html = htm.bind(h);

const QUOTED = 1;
const SPREAD = 2;

// What each interpolation is to htm: inside a quoted attribute,
// `class="row {kind}"`, where htm joins the text with JavaScript's `+` and each
// is written as an f-string writes it; or spread on a tag, `<button ...{props}>`,
// where htm assigns it over the props before it.
function slotKinds(strings) {
    const kinds = [];
    let inTag = false;
    let quote = null;

    strings.forEach((text, at) => {
        for (const c of text) {
            if (quote !== null) {
                if (c === quote) quote = null;
            } else if (inTag) {
                if (c === '"' || c === "'") quote = c;
                else if (c === '>') inTag = false;
            } else if (c === '<') {
                inTag = true;
            }
        }
        if (at < strings.length - 1) kinds.push(quote !== null ? QUOTED : inTag && text.endsWith('...') ? SPREAD : null);
    });

    return kinds;
}

// A dict spread on a tag is its items, each value Python's, as keyword
// arguments are; None spreads nothing.
const spread = (value) => (value === NONE || value == null ? {} : isDict(value) ? Object.fromEntries(pyEntries(value)) : value);

// htm parses a template once and keeps it by the identity of its strings,
// which Python builds again at each evaluation: the same text is handed the
// same array.
const STRINGS = new Map();

function statics(strings) {
    const key = strings.join('\u0000');
    let held = STRINGS.get(key);

    if (held === undefined) {
        held = { strings: Object.freeze([...strings]), kinds: slotKinds(strings) };
        STRINGS.set(key, held);
    }

    return held;
}

const CONVERSIONS = { r: _b_.repr, s: _b_.str.$factory, a: _b_.ascii };

// An interpolation's value, its `!r` and its format spec applied as an
// f-string applies them: `{price:.2f}` is text.
function interpolated(one) {
    const conversion = one.conversion === NONE ? null : CONVERSIONS[one.conversion];
    const value = conversion ? conversion(one.value) : one.value;

    return one.format_spec ? _b_.format(value, one.format_spec) : value;
}

function element(template) {
    const { strings, kinds } = statics(template.strings);
    const values = template.interpolations.map((one, at) =>
        kinds[at] === QUOTED ? pyStr(interpolated(one)) : kinds[at] === SPREAD ? spread(interpolated(one)) : interpolated(one)
    );
    const made = html(strings, ...values);

    // A template that is only an interpolation, `t"{rows}"`, is handed back as
    // its value, which no `h` has made a child yet.
    return Array.isArray(made) ? React.createElement(React.Fragment, null, ...made.map(child)) : child(made);
}

// The copy of a container a prop holds, the last one while it holds the same,
// so that a library that compares its data by identity sees the same rows.
const COPIES = new WeakMap();

const isContainer = (value) => $B.is_list(value) || $B.is_tuple(value) || isDict(value);
const isPlainObject = (value) => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;

function snapshot(value, seen = new Map()) {
    if (seen.has(value)) return seen.get(value);

    const one = (item) => (isContainer(item) ? snapshot(item, seen) : propValue(item, 'reacthon'));
    const copy = isDict(value) ? {} : [];

    seen.set(value, copy);
    if (isDict(value)) for (const [key, item] of pyEntries(value)) copy[key] = one(item);
    else for (const item of value) copy.push(one(item));
    return copy;
}

function same(one, other, seen = new Set()) {
    if (one === other) return true;
    if (seen.has(one)) return true;
    seen.add(one);
    if (Array.isArray(one)) return Array.isArray(other) && one.length === other.length && one.every((item, at) => same(item, other[at], seen));
    if (!isPlainObject(one) || !isPlainObject(other)) return false;

    const keys = Object.keys(one);

    return keys.length === Object.keys(other).length && keys.every((key) => Object.hasOwn(other, key) && same(one[key], other[key], seen));
}

function copied(value) {
    const fresh = snapshot(value);
    const held = COPIES.get(value);

    if (held !== undefined && same(held, fresh)) return held;
    COPIES.set(value, fresh);
    return fresh;
}

// A template JavaScript is handed by any other door, an argument of a
// library's function, the answer of a function it calls back, an item of a
// list, is the element it renders, as at a prop: TanStack's cell.
host.crossesAs = (value) => (isTemplate(value) ? element(value) : undefined);

// A container held in a state is the same object after `items.append(x)`, and
// React compares a dependency by identity: each change Python makes to it, or
// to anything inside it, moves its version, which a dependency is compared
// with as well.
const VERSIONS = new WeakMap();

const moved = (value) => VERSIONS.set(value, (VERSIONS.get(value) ?? 0) + 1);
const version = (value) => (value !== null && typeof value === 'object' ? (VERSIONS.get(value) ?? 0) : 0);

// React compares a dependency with `Object.is`, and Brython builds a new float
// at each computation: a number is compared as its value. Two slots per
// dependency, so that the list keeps its length from one render to the next.
const dependencies = (deps) =>
    deps === undefined || deps === NONE
        ? undefined
        : [...deps].flatMap((one) => (one?.ob_type === _b_.float ? [one.value, 0] : [one, version(one)]));

const increment = (count) => count + 1;

// What a state holds is watched once it is on the page, and the component
// renders again at every change Python makes to it in place: `items.append(x)`,
// `todo["done"] = True`, `point.x += 1`, as a JavaScript reader of MobX's or
// Valtio's state sees its writes. Off when the state holds another value, or
// the component leaves.
function useWatched(value) {
    const [, rerender] = React.useReducer(increment, 0);

    React.useEffect(() => {
        if (!watchable(value)) return undefined;

        const owner = [];

        track(value, () => {
            moved(value);
            rerender();
        }, owner);

        return () => unsubscribe(owner);
    }, [value]);
}

// `_reacthon_cells(names)`, which the compiler has a component with a state
// call before its first cell (`state.js`): one object for the life of the
// component, `reacthon._Cells`, which renders it again when a cell is written
// anew, and when Python changes in place what a cell holds.
const cellsClass = () => $B.imported.reacthon?._Cells;

function cells(names) {
    const [, rerender] = React.useReducer(increment, 0);
    const held = React.useRef(null);

    if (held.current === null) {
        const bumps = new Map();
        const made = { owner: [], bumps };

        made.bumpOf = (name) => {
            let bump = bumps.get(name);

            if (bump === undefined) {
                bump = () => {
                    moved(bump.held);
                    rerender();
                };
                bumps.set(name, bump);
            }

            return bump;
        };
        made.holder = call(cellsClass(), [rerender]);
        held.current = made;
    }

    const own = held.current;

    rendering?.cells.push({ holder: own.holder, names });

    // Read once the render has given each cell its value, the first render's
    // included: what a cell holds now is followed, what it held before is let
    // go.
    React.useEffect(() => {
        for (const name of names) {
            const value = pyGetattr(own.holder, name, NONE);
            const bump = own.bumpOf(name);

            if (bump.held !== value) track(value, bump, own.owner);
        }
    });
    React.useEffect(
        () => () => {
            unsubscribe(own.owner);
            own.owner = [];
            for (const bump of own.bumps.values()) bump.held = undefined;
        },
        []
    );

    return own.holder;
}

const SETTERS = new WeakMap();

function setterOf(set) {
    let made = SETTERS.get(set);

    if (made === undefined) {
        made = (next) => {
            set(pyCallable(next) ? (previous) => call(next, [previous]) : next);
            return NONE;
        };
        SETTERS.set(set, made);
    }

    return made;
}

// `run` with the cells as its render left them, then as they are now: through
// Python only when a cell was written since.
function asSeen(seen, run) {
    return seen.reduceRight((inner, { holder, names, values }) => {
        const changed = names.flatMap((name, at) =>
            pyGetattr(holder, name, NONE) === values[at] ? [] : [$B.fast_tuple([name, values[at]])]
        );

        return changed.length === 0 ? inner : () => call(pyGetattr(holder, '_as_seen'), [$B.fast_tuple(changed), inner]);
    }, run)();
}

// An effect and its cleanup read the state of the render that made them, as
// React's do: `return lambda: chat.leave(room)` leaves the room the effect
// joined. A handler reads the state of now.
function effectOf(effect) {
    const frame = rendering;

    if (frame !== null) frame.effects = true;

    return () => {
        const seen = frame?.seen ?? [];
        const result = asSeen(seen, () => call(effect));

        return pyCallable(result) ? () => void asSeen(seen, () => call(result)) : undefined;
    };
}

const hooks = {
    use_state(...args) {
        const [initial] = hookArgs('use_state', args, ['initial']);
        const [value, set] = React.useState(() => (pyCallable(initial) ? call(initial) : orNone(initial)));

        useWatched(value);
        return $B.fast_tuple([value, setterOf(set)]);
    },

    use_effect(...args) {
        const [effect, deps] = hookArgs('use_effect', args, ['effect', 'dependencies']);

        React.useEffect(effectOf(effect), dependencies(deps));
        return NONE;
    },

    use_layout_effect(...args) {
        const [effect, deps] = hookArgs('use_layout_effect', args, ['effect', 'dependencies']);

        React.useLayoutEffect(effectOf(effect), dependencies(deps));
        return NONE;
    },

    use_memo(...args) {
        const [compute, deps] = hookArgs('use_memo', args, ['compute', 'dependencies']);

        return React.useMemo(() => call(compute), dependencies(deps));
    },

    use_callback(...args) {
        const [fn, deps] = hookArgs('use_callback', args, ['callback', 'dependencies']);

        return React.useCallback(fn, dependencies(deps));
    },

    use_reducer(...args) {
        const [reducer, initial, init] = hookArgs('use_reducer', args, ['reducer', 'initial', 'init']);
        const [state, dispatch] = React.useReducer(
            (current, action) => call(reducer, [current, action]),
            orNone(initial),
            (given) => (init === undefined || init === NONE ? given : call(init, [given]))
        );

        useWatched(state);
        return $B.fast_tuple([state, dispatcherOf(dispatch)]);
    },

    use_ref(...args) {
        const [initial] = hookArgs('use_ref', args, ['initial']);
        const held = React.useRef(null);

        if (held.current === null) held.current = call(refClass(), [orNone(initial)]);
        return held.current;
    },

    // A context's value is watched as a state's is: what Python changes in it
    // renders again each component that reads it.
    use_context(...args) {
        const [context] = hookArgs('use_context', args, ['context']);
        const value = React.useContext(context);

        useWatched(value);
        return value;
    },

    create_context(...args) {
        const [initial] = hookArgs('create_context', args, ['default']);
        const made = React.createContext(orNone(initial));

        PY_CONTEXTS.add(made);
        return made;
    },

    use_id() {
        return React.useId();
    },

    // React's memo() of a Python component: its render skipped while its props
    // are the last ones, each compared as React compares them, by identity, or
    // by `are_equal(previous, next)` on their dicts.
    memo(...args) {
        const [fn, areEqual] = hookArgs('memo', args, ['component', 'are_equal']);
        const props = (one) => pyDict(Object.entries(one).filter(([key]) => key !== FROM_PYTHON));
        const compare = areEqual === undefined || areEqual === NONE ? undefined : (one, other) => _b_.bool.$factory(call(areEqual, [props(one), props(other)]));
        const made = React.memo(component(fn), compare);

        PY_MEMOS.add(made);
        return made;
    }
};

const DISPATCHERS = new WeakMap();

function dispatcherOf(dispatch) {
    let made = DISPATCHERS.get(dispatch);

    if (made === undefined) {
        made = (action) => {
            dispatch(action);
            return NONE;
        };
        DISPATCHERS.set(dispatch, made);
    }

    return made;
}

// The hooks' own module, which `reacthon.py` imports and publishes under
// `reacthon` beside what Python writes better itself.
registerModule('_reacthon', { ...hooks });

// A module's own namespace, published under its Python name before its body
// runs, so that another module's `import` finds it.
export function moduleNamespace(name) {
    const namespace = { js: globalThis, _reacthon_cells: cells };

    registerModule(name, namespace);
    return namespace;
}

// What JavaScript imports of a module: a function whose name is capitalised is
// a component, as React reads a capitalised tag; anything else crosses as
// Bryntime exports it.
export function exported(namespace, name) {
    const value = namespace[name];

    if (isPyFunction(value) && /^[A-Z]/.test(name)) return component(value);

    return pyExport(value, `${name}() — ${namespace.__name__}`);
}

export { component, element };
