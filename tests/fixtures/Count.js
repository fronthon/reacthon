import { createElement, memo } from 'react';

// A component written in JavaScript that React renders again only when a prop
// is another value than at the last render.
export const Count = memo(({ items }) => createElement('span', { className: 'count' }, items.length));
