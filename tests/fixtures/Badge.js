import { createElement } from 'react';

// A component written in JavaScript, which a Python component renders.
export function Badge({ label, count, items, onPick }) {
    return createElement(
        'span',
        { className: 'badge', onClick: () => onPick?.(label) },
        `${label}: ${count}`,
        items ? ` [${Array.isArray(items)} ${items.length}]` : ''
    );
}
