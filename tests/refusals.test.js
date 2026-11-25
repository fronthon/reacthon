// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { compile } from '../src/compile.js';

const refused = (text) => {
    try {
        compile(text, 'tests/Refused.py');
    } catch (error) {
        return error.message;
    }
    return null;
};

describe('a state the compiler cannot keep is refused at its line', () => {
    it('refuses a nonlocal of a prop', () => {
        expect(refused(`def Card(title):\n    def rename(event):\n        nonlocal title\n        title = "x"\n    return t"<p>{title}</p>"\n`)).toBe(
            "reacthon — `title` is a prop, which the parent holds: copy it into a name of the component's own to change it (tests/Refused.py:3)"
        );
    });

    it('refuses a state bound twice', () => {
        expect(refused(`def Card():\n    count = 0\n    count = 1\n    def up(event):\n        nonlocal count\n        count += 1\n    return t"<p>{count}</p>"\n`)).toBe(
            "reacthon — `count` is the component's state, since a nested function rebinds it: it takes its first value from one assignment of its own, `count = …`, at the top of the component (tests/Refused.py:2)"
        );
    });

    it('refuses a value the component makes inside a block and a handler changes', () => {
        expect(refused(`def Card(on):\n    if on:\n        items = []\n    def add(event):\n        items.append(1)\n    return t"<p>{len(items)}</p>"\n`)).toBe(
            'reacthon — `items` is made by the component and changed in place by a nested function: it takes its first value from one assignment of its own, `items = …`, at the top of the component, or what the handler changes is lost at the next render (tests/Refused.py:3)'
        );
    });

    it('refuses a state that a function the render calls rebinds', () => {
        expect(refused(`def Card():\n    count = 0\n    def up(event):\n        nonlocal count\n        count += 1\n    def reset():\n        nonlocal count\n        count = 0\n    reset()\n    return t"<p>{count}</p>"\n`)).toBe(
            "reacthon — `count` is the component's state, which a function the render calls rebinds: a state changes after the render, in a handler (tests/Refused.py:7)"
        );
    });

    it('leaves a hook\'s value, an alias of a prop and what the render computes as they were written', () => {
        const text = [
            'def Card(rows):',
            '    theme, set_theme = use_state(lambda: {"color": "red"})',
            '    shown = rows',
            '    total = 0',
            '    def add(n):',
            '        nonlocal total',
            '        total += n',
            '    for row in rows:',
            '        add(row)',
            '    def change(event):',
            '        theme["color"] = "blue"',
            '        shown.append(1)',
            '    return t"<p>{total}</p>"',
            ''
        ].join('\n');

        expect(compile(text, 'tests/Plain.py').code).not.toMatch(/_reacthon_s/);
    });

    it('refuses a state rebound by a walrus in the render', () => {
        expect(refused(`def Card():\n    count = 0\n    print((count := 2))\n    def up(event):\n        nonlocal count\n        count += 1\n    return t"<p>{count}</p>"\n`)).toMatch(
            /`count` is the component's state.*\(tests\/Refused\.py:2\)$/
        );
    });

    it('refuses a return before the state is made', () => {
        expect(refused(`def Card(hidden=False):\n    if hidden:\n        return None\n    count = 0\n    def up(event):\n        nonlocal count\n        count += 1\n    return t"<p>{count}</p>"\n`)).toBe(
            'reacthon — a component returns after its state is made, so that React finds it at every render (tests/Refused.py:3)'
        );
    });

    it('keeps a list a comprehension builds, whose own names the component does not hold', () => {
        const text = `def Card():\n    rows = [{"id": i} for i in range(3)]\n    def add(event):\n        rows.append({"id": len(rows)})\n    return t"<p>{len(rows)}</p>"\n`;

        expect(compile(text, 'tests/Rows.py').code).toMatch(/_reacthon_cells/);
    });

    it('leaves a component with no state as it was written', () => {
        const text = `def Card(title):\n    shown = title.upper()\n    return t"<p>{shown}</p>"\n`;

        expect(compile(text, 'tests/Plain.py').code).not.toMatch(/_reacthon_s/);
    });
});
