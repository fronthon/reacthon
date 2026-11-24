// What every compiled module imports, on Bryntime's engine, which its one
// entry loads and starts: React's elements made of a t-string, a Python
// function made a React component, and React's hooks under their Python
// names, published as the Python module `reacthon`.
import * as React from 'react';
import htm from 'htm';
import { registerModule, pyHandler, pyExport, pyArg, plainData, pyStr, pyType, isDict, track, unsubscribe, watchable, NONE } from 'bryntime';

export { withNamespace, pyError, jsCall } from 'bryntime';

const $B = globalThis.__BRYTHON__;
const _b_ = $B.builtins;

const isPyFunction = (value) => typeof value === 'function' && value.ob_type === $B.function;
const isTemplate = (value) => value !== null && typeof value === 'object' && value.ob_type === $B.Template;
const isElement = (value) => value !== null && typeof value === 'object' && value.$$typeof !== undefined;
const pyCallable = (value) => value !== null && value !== undefined && value !== NONE && _b_.callable(value) === true;

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

    // A Python iterable is children, as an array is in JSX; a mapping, bytes
    // and every other object show as `str()` shows them.
    if (pyType(value) !== undefined) {
        const iterable = !isDict(value) && _b_.hasattr(value, '__iter__') && !_b_.isinstance(value, _b_.bytes);

        return iterable ? _b_.list.$factory(value).map(child) : pyStr(value);
    }

    return value;
}

// A Python function in a tag's place is a React component: one per function,
// so React keeps its state from one render to the next.
const COMPONENTS = new WeakMap();

function component(fn) {
    let made = COMPONENTS.get(fn);

    if (made === undefined) {
        made = function (props) {
            const keywords = {};

            for (const [key, value] of Object.entries(props)) keywords[key] = pyArg(value);

            return child(call(fn, [], keywords));
        };

        const name = fn.$function_infos?.[1] ?? fn.name;

        Object.defineProperty(made, 'name', { value: name });
        made.displayName = name;
        COMPONENTS.set(fn, made);
    }

    return made;
}

const DOM_NAMES = { class: 'className', for: 'htmlFor' };

// A prop of an element of the page crosses into JavaScript: a callable as a
// handler that hands Python its event, a container as a plain copy, None as
// absent. A prop of a Python component stays the Python value it was.
function domProps(props) {
    const out = {};

    for (const [key, value] of Object.entries(props)) {
        const name = DOM_NAMES[key] ?? key;

        if (pyCallable(value) && !isElement(value)) out[name] = pyHandler(value);
        else if (value === NONE) out[name] = undefined;
        else out[name] = plainData(value);
    }

    return out;
}

// A prop of a component written in JavaScript: what Python hands it crosses as
// Bryntime exports a value, a callable as a function, a list as its live view.
function jsProps(props) {
    const out = {};

    for (const [key, value] of Object.entries(props)) out[key] = value === NONE ? undefined : pyExport(value, `${key} — reacthon`);

    return out;
}

function h(type, props, ...children) {
    const kids = children.map(child);

    if (isPyFunction(type)) return React.createElement(component(type), props, ...kids);
    if (typeof type === 'string') return React.createElement(type, props === null ? null : domProps(props), ...kids);

    // What an import from JavaScript made of a component is an adapter for
    // Python's calls; React is handed the component itself.
    const own = typeof type === 'function' ? (type[$B.JSOBJ] ?? type) : type;

    return React.createElement(own, props === null ? null : jsProps(props), ...kids);
}

const html = htm.bind(h);

// htm parses a template once and keeps it by the identity of its strings,
// which Python builds again at each evaluation: the same text is handed the
// same array.
const STRINGS = new Map();

function statics(strings) {
    const key = strings.join('\u0000');
    let held = STRINGS.get(key);

    if (held === undefined) {
        held = Object.freeze([...strings]);
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
    const made = html(statics(template.strings), ...template.interpolations.map(interpolated));

    return Array.isArray(made) ? React.createElement(React.Fragment, null, ...made) : made;
}

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

const cleanup = (result) => (pyCallable(result) ? () => void call(result) : undefined);

const hooks = {
    use_state(...args) {
        const [initial] = hookArgs('use_state', args, ['initial']);
        const [value, set] = React.useState(() => (pyCallable(initial) ? call(initial) : initial ?? NONE));

        useWatched(value);
        return $B.fast_tuple([value, setterOf(set)]);
    },

    use_effect(...args) {
        const [effect, deps] = hookArgs('use_effect', args, ['effect', 'dependencies']);

        React.useEffect(() => cleanup(call(effect)), dependencies(deps));
        return NONE;
    },

    use_layout_effect(...args) {
        const [effect, deps] = hookArgs('use_layout_effect', args, ['effect', 'dependencies']);

        React.useLayoutEffect(() => cleanup(call(effect)), dependencies(deps));
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

    use_id() {
        return React.useId();
    }
};

registerModule('reacthon', { ...hooks });

// A module's own namespace, published under its Python name before its body
// runs, so that another module's `import` finds it.
export function moduleNamespace(name) {
    const namespace = {};

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
