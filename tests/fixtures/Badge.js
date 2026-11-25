import { createElement } from 'react';

// A component written in JavaScript, which a Python component renders.
export function Badge({ label, count, items, onPick, className, style }) {
    return createElement(
        'span',
        { className: className ? `badge ${className}` : 'badge', style, onClick: () => onPick?.(label) },
        `${label}: ${count}`,
        items ? ` [${Array.isArray(items)} ${items.length}]` : ''
    );
}
