import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// A component mounted in a fresh element of the page, read and clicked as a
// reader would.
export async function render(type, props = null) {
    const container = document.createElement('div');
    const root = createRoot(container);

    document.body.append(container);
    await act(() => root.render(createElement(type, props)));

    return {
        container,
        text: () => container.textContent,
        html: () => container.innerHTML,
        click: (selector) => act(() => container.querySelector(selector).click()),
        unmount: () => act(() => root.unmount())
    };
}
