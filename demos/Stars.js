import { createElement } from 'react';

// A component written in JavaScript, as any npm package's is, which Python
// renders as a tag and hands a Python callback.
export function Stars({ value, onRate }) {
    return createElement(
        'span',
        { className: 'stars', role: 'radiogroup' },
        [1, 2, 3, 4, 5].map((n) =>
            createElement(
                'button',
                { key: n, className: n <= value ? 'on' : 'off', 'aria-label': `${n} stars`, onClick: () => onRate(n) },
                '★'
            )
        )
    );
}
