import { createContext, createElement as h, useContext, useEffect, useState } from 'react';

// The same board as Twin2.py, written as React is written.
export const log = [];
const Theme = createContext(null);

function Row({ row, onRename, onRemove }) {
    const [clicks, setClicks] = useState(0);
    const theme = useContext(Theme);

    useEffect(() => {
        const key = row.id;
        const label = row.label;
        log.push(`show ${key} ${label}`);
        return () => log.push(`hide ${key} ${label}`);
    }, [row.label]);

    return h(
        'li',
        { className: theme.dark ? 'dark' : 'light' },
        row.label,
        ' ',
        clicks,
        h('button', { className: 'click', onClick: () => setClicks((n) => n + 1) }, 'c'),
        h('button', { className: 'rename', onClick: onRename }, 'r'),
        h('button', { className: 'remove', onClick: onRemove }, 'x')
    );
}

export function Board() {
    const [rows, setRows] = useState([]);
    const [made, setMade] = useState(0);
    const [draft, setDraft] = useState('');
    const [theme, setTheme] = useState({ dark: false });
    const [count, setCount] = useState(0);

    useEffect(() => {
        const seen = count;
        log.push(`count ${seen}`);
        return () => log.push(`uncount ${seen}`);
    }, [count]);

    const add = () => {
        setMade(made + 1);
        setRows([...rows, { id: made + 1, label: draft || `item ${made + 1}` }]);
        setDraft('');
    };
    const later = async () => {
        await Promise.resolve(null);
        setCount((n) => n + 1);
    };
    const button = (name, onClick) => h('button', { className: name, onClick }, name);

    return h(
        Theme.Provider,
        { value: theme },
        h('input', { className: 'draft', value: draft, onChange: (event) => setDraft(event.target.value) }),
        button('add', add),
        button('flip', () => setRows([...rows].reverse())),
        button('order', () => setRows([...rows].sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0)))),
        button('shade', () => setTheme({ dark: !theme.dark })),
        button('later', later),
        h(
            'ul',
            null,
            rows.map((row) =>
                h(Row, {
                    key: row.id,
                    row,
                    onRename: () => setRows(rows.map((one) => (one.id === row.id ? { ...one, label: `${one.label}!` } : one))),
                    onRemove: () => setRows(rows.filter((one) => one.id !== row.id))
                })
            )
        ),
        h('p', null, `${count} ${rows.length}`)
    );
}
