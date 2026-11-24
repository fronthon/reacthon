<div align="center">

# Reacthon

**React components in Python.**

</div>

```python
from reacthon import use_state


def Counter(start=0):
    count, set_count = use_state(start)

    def increment(event):
        set_count(count + 1)

    return t"<button onClick={increment}>clicked {count} times</button>"
```

A component is a Python function, its markup a
[t-string](https://peps.python.org/pep-0750/), Python 3.14's own template
literal, and its hooks React's, under their Python names. The function is
compiled to JavaScript at build time and handed to React itself: it is a React
component, which React renders, reconciles and shows in its DevTools, beside
any component of npm. The browser receives only JavaScript.

## Why

- **The real React.** [ReactPy](https://github.com/reactive-python/reactpy)
  rewrites React in Python and draws the page itself. A Reacthon component *is*
  a React component: React's renderer, its hooks, its rules, and every
  component on npm.
- **Compiled, not interpreted.** The Python is translated by
  [Brython](https://brython.info) when the site is built, through
  [Brycomp](https://github.com/svelthon/brycomp) and
  [Bryntime](https://github.com/svelthon/bryntime): nothing is downloaded to
  interpret it, where Pyodide ships an interpreter of several megabytes.
- **Markup is a t-string.** JSX is a JavaScript extension; Python 3.14 has its
  own template literal, which keeps each interpolation a value: a component, a
  handler, a list of elements.
- **Python's values stay Python's.** A float shows as Python writes it, a list
  changed in place renders again, an exception raised in a component is raised
  with its line.

## Install

```sh
npm install reacthon react react-dom vite
```

```js
// vite.config.js
import { defineConfig } from 'vite';
import reacthon from 'reacthon';

export default defineConfig({ plugins: [reacthon()] });
```

```js
// main.js
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.py';

createRoot(document.getElementById('root')).render(createElement(App));
```

A `.py` is an ordinary Python module. JavaScript imports its names: a function
whose name is capitalised is a component, as React reads a capitalised tag.

## Markup

```python
def TodoItem(todo, on_remove):
    return t"""
        <li class={"done" if todo["done"] else ""}>
            {todo["text"]}
            <button onClick={on_remove}>×</button>
        </li>
    """


def TodoList(todos):
    return t"""
        <ul>
            {[t'<{TodoItem} key={todo["id"]} todo={todo} on_remove={remover(todo)} />' for todo in todos]}
        </ul>
    """
```

| You write | React receives |
|---|---|
| `<{TodoItem} todo={todo} />` | the Python function as a component, its props as keywords: `TodoItem(todo=todo)` |
| `<{Card}>…</{Card}>` | its content as the `children` keyword |
| `onClick={handler}` | a handler that calls the Python callable with React's event |
| `class=`, `for=` | `className`, `htmlFor` |
| `{price:.2f}`, `{name!r}` | the text an f-string writes |
| `{1.0}` | `1.0`, Python's `str()`; an attribute's float too |
| `{items}`, a list, a tuple, a generator | its items, as children |
| `{None}`, `{False}`, `{True}` | nothing, as JSX shows `null` and the booleans |
| `{a_dict}`, any other object | Python's `str()` |
| `ref={box}` | `box.current`, the element |

A lambda inside an interpolation takes parentheses, as Python requires in any
f-string or t-string: `onChange={(lambda event: set_text(event.target.value))}`.

## Hooks

```python
from reacthon import use_state, use_effect, use_memo, use_ref
```

| Python | React |
|---|---|
| `value, set_value = use_state(initial)` | `useState`; `initial` may be a callable, `set_value` takes a value or a function of the previous one |
| `state, dispatch = use_reducer(reducer, initial, init=None)` | `useReducer` |
| `use_effect(effect, dependencies=None)` | `useEffect`; `effect` may return its cleanup |
| `use_layout_effect(effect, dependencies=None)` | `useLayoutEffect` |
| `use_memo(compute, dependencies)` | `useMemo` |
| `use_callback(callback, dependencies)` | `useCallback` |
| `ref = use_ref(initial=None)` | `useRef`; a `Ref` whose `current` is what it holds |
| `Theme = create_context(default)`, `use_context(Theme)` | `createContext`, `useContext`; `<{Theme} value={…}>` provides it |
| `use_id()` | `useId` |

React's rules hold as they are: hooks at the top of a component, in the same
order at every render.

## A state changed in place

```python
def Basket():
    items, set_items = use_state(["apple"])

    def add(event):
        items.append("pear")  # renders again

    return t"<button onClick={add}>{len(items)} items</button>"
```

React compares a state by identity, so in JavaScript a list must be copied to be
seen changed. Python changes its containers in place, and Reacthon follows what
it changes, as MobX and Valtio follow a JavaScript state: what a state holds, a
list, a dict, an instance, and anything inside it, renders its component again
when Python changes it, `items.append(x)`, `todo["done"] = True`,
`point.x += 1`, from that component or from a child it handed it to. A
dependency of `use_memo`, `use_effect` or `use_callback` moves with it. The
setter works as React's, for a new value.

A context's value is followed the same way, so a dict handed down a context is a
store its readers render again from.

## Props

What a t-string hands a Python component is Python's own: the very list, the
very setter. What a JavaScript parent hands it is copied in, an array as a list
and an object as a dict; `children` and React's elements stay as they are.

## JavaScript

A module names the JavaScript it imports with `__js__`:

```python
__js__ = {"./Stars.js": ["Stars"]}


def Rating():
    stars, set_stars = use_state(3)
    return t"<{Stars} value={stars} onRate={set_stars} />"
```

A JavaScript component is rendered as itself, its props crossing as Bryntime
hands Python's values to JavaScript: a callable as a function, a list as its
live view. `js` is JavaScript's globals: `js.setInterval(tick, 1000)`.

## Demo

`demos/` is a page of Python components: state, a list changed in place, a
controlled form, Python's numbers, a JavaScript component, effects and memos.

```sh
npm install
npm run dev
```

## What is not done yet

This is a prototype.

- **A t-string is parsed when it first renders**, by
  [htm](https://github.com/developit/htm), and kept for the next renders; the
  build could compile it to `createElement` calls, and refuse a bad tag at its
  line.
- **No Fast Refresh**: an edited `.py` reloads the page, its state lost.
- **No server rendering** yet.
- **A JavaScript component wrapped in `React.memo`** is handed a list changed in
  place as the same view, which `memo` takes for unchanged: hand it a copy,
  `list(items)`.

## Licence

Reacthon is MIT, the licence of React. See `LICENSE`.

Bryntime, Brycomp and Bryvend, which Reacthon depends on, are BSD-3-Clause, the
same licence as Brython.
