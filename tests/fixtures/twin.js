import { createElement as h, useState } from 'react';

// The same board as Twin.py, written as React is written: every change a new
// value given to a setter.
function Item({ item, onToggle, onRename, onRemove }) {
    return h(
        'li',
        { className: item.done ? 'done' : 'open' },
        item.label,
        h('button', { className: 'toggle', onClick: onToggle }, 't'),
        h('button', { className: 'rename', onClick: onRename }, 'r'),
        h('button', { className: 'remove', onClick: onRemove }, 'x')
    );
}

export function Board() {
    const [items, setItems] = useState([]);
    const [count, setCount] = useState(0);
    const [text, setText] = useState('');
    const [made, setMade] = useState(0);

    const change = (id, update) => setItems(items.map((one) => (one.id === id ? { ...one, ...update(one) } : one)));
    const add = () => {
        setMade(made + 1);
        setItems([...items, { id: made + 1, label: `item ${made + 1}`, done: false }]);
    };
    const done = items.filter((item) => item.done).length;
    const button = (name, onClick) => h('button', { className: name, onClick }, name);

    return h(
        'div',
        null,
        button('add', add),
        button('clear', () => setItems([])),
        button('flip', () => setItems([...items].reverse())),
        button('order', () => setItems([...items].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0)))),
        button('keep', () => setItems(items.filter((item) => !item.done))),
        button('bump', () => setCount(count + 1)),
        button('write', () => setText(text + 'a')),
        h(
            'ul',
            null,
            items.map((item) =>
                h(Item, {
                    key: item.id,
                    item,
                    onToggle: () => change(item.id, (one) => ({ done: !one.done })),
                    onRename: () => change(item.id, (one) => ({ label: `${one.label}!` })),
                    onRemove: () => setItems(items.filter((one) => one.id !== item.id))
                })
            )
        ),
        h('p', null, `${count} ${text} ${done}/${items.length}`)
    );
}
