import { createElement } from 'react';

// A component written in JavaScript that takes elements as props, as a render
// prop and a set of icons, and components to render its parts with.
export function Frame({ render, icons, components }) {
    return createElement(
        'div',
        { className: 'frame' },
        render,
        icons?.ok,
        components?.Label ? createElement(components.Label, { text: 'part', className: 'x' }) : null
    );
}
