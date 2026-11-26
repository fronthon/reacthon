import { createContext, createElement, useContext } from 'react';

// A context of a library's, as React Aria's LabelContext, and what reads it.
export const NameContext = createContext('none');
export function Named() {
    const name = useContext(NameContext);

    return createElement('i', { className: 'named' }, name === undefined ? 'undefined' : String(name));
}

// A component that tells null from undefined, as React Aria's `slot={null}`.
export function Slotted({ slot }) {
    return createElement('b', { className: 'slotted' }, slot === null ? 'null' : String(slot));
}

// A component written in JavaScript that takes elements as props, as a render
// prop and a set of icons, and components to render its parts with; and rows,
// which it freezes, as recharts' store freezes the rows of its chart.
export function Frame({ render, icons, components, rows }) {
    if (rows) Object.freeze(rows).forEach(Object.freeze);

    return createElement(
        'div',
        { className: 'frame' },
        render,
        icons?.ok,
        components?.Label ? createElement(components.Label, { text: 'part', className: 'x' }) : null,
        rows ? createElement('span', { className: 'rows' }, rows.map((row) => row.x).join(',')) : null
    );
}

// A library that calls back a render function, as TanStack's table renders a
// column's cell.
export const rendered = (cell) => cell({ n: 1 });

// A component that calls its children with what it renders by, as React
// Aria's progress bar calls them with its percentage.
export function Meter({ children }) {
    return createElement('p', { className: 'meter' }, children({ percentage: 40 }));
}
