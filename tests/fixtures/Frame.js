import { createElement } from 'react';

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
