# Reacthon

<div align="center">
    <img src="img/reacthon-512.png" alt="Reacthon" width="172"/>
</div>

**React components in Python.**

```python
def Counter(start=0):
    count = start

    def increment(event):
        count := count + 1

    return t"<button onClick={increment}>clicked {count} times</button>"
```

A component is a Python function, its markup a
[t-string](https://peps.python.org/pep-0750/), Python 3.14's own template
literal, and its state the names its handlers write with `:=`. React's hooks
are there too, under their Python names. The function
is compiled to JavaScript at build time and handed to React itself: it is a
React component, which React renders, reconciles and shows in its DevTools,
beside any component of npm. The browser receives only JavaScript.

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
npm install reacthon
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
f-string or t-string, and so does a `:=` inside a lambda:
`onChange={(lambda event: (draft := event.target.value))}`.

## State

```python
def TodoList():
    todos = []
    draft = ""

    def edit(event):
        draft := event.target.value

    def add(event):
        todos.append(draft)
        draft := ""

    left = len(todos)

    return t"""
        <input value={draft} onChange={edit} /><button onClick={add}>add</button>
        <p>{left} to do</p>
    """
```

React calls a component again at each render, so its names start over. A name
that a nested function writes with `:=`, or changes in place when the component
made its value, `todos = []` then `todos.append(…)`, is the component's state:
it keeps its value from one render to the next, and the component renders again
when a handler writes it or changes what it holds. Everything else is computed
again at each render, which is what React means by a value derived from state:
`left` here.

**`:=` writes the component's name, `=` a name of the function's own.** In a
handler, `draft := ""` is `nonlocal draft` then `draft = ""`, on one line:
explicit, where a closure of JavaScript writes the outer name with `=` and
nothing to see. Python asks for parentheses around a `:=` on a statement of its
own; Reacthon reads it without. `=` keeps its meaning, and a handler that binds
a name of the component with it, and never reads it, is refused at its line, as
is `count += 1` on a name the handler has given no value: the component's was
meant. Python's own `nonlocal` works as well.

- **A handler reads the state of now**, not the state of the render that made
  it: a timer started at the first render counts with
  `seconds := seconds + 1`, where React's `setSeconds(seconds + 1)` reads 0 for
  ever.
- **An effect and its cleanup read the state of the render that made them**, as
  React's do: `return lambda: chat.leave(room)` leaves the room the effect
  joined, once `room` has moved on. A list changed in place since is the same
  list, changed.
- **A name bound from a prop keeps its first value**, as `useState(prop)` does:
  `count = start`.
- **A function the render calls itself is part of the render**: what it
  rebinds or changes is computed again, an accumulator as much as a value.
- **A name bound otherwise holds what something else keeps**, and is left as it
  is: `items = rows`, an alias of a prop, or `theme, set_theme = use_state(…)`.
- **What cannot be kept is refused at its line** when the site is built: a state
  bound twice or inside a block, a prop rebound, a state a function of the render
  rebinds, a `return` before the state is made.

## Hooks

```python
from reacthon import use_effect, use_memo, use_ref
```

A component's state is its names, above. The hooks are for the rest: an
effect, a memo, a ref, a context. `use_state` is there as React has it, for
code written after React's documentation and for a copy of a prop that a
handler changes in place.

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
    items = ["apple"]

    def add(event):
        items.append("pear")  # renders again

    return t"<button onClick={add}>{len(items)} items</button>"
```

React compares a state by identity, so in JavaScript a list must be copied to be
seen changed. Python changes its containers in place, and Reacthon follows what
it changes: what a state holds, a name's or a hook's, a list, a dict, an
instance, and anything inside it, renders its component again when Python
changes it, `items.append(x)`, `todo["done"] = True`, `point.x += 1`, from
that component or from a child it handed it to. A dependency of `use_memo`,
`use_effect` or `use_callback` moves with it. `use_state`'s setter works as
React's, for a new value.

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
    stars = 3

    def rate(value):
        stars := value

    return t"<{Stars} value={stars} onRate={rate} />"
```

A JavaScript component is rendered as itself, its props crossing as React's
data is: a callable as a function, a list, a tuple or a dict as a copy, the
same while it holds the same, which a library may keep and freeze. A t-string
is its element, there and wherever else JavaScript is handed one: the answer
of a Python function a library calls back, a column's cell for TanStack's
table. `js` is JavaScript's globals: `js.setInterval(tick, 1000)`.

## Demo

`demos/` is a page of Python components: state, a list changed in place, a
controlled form, Python's numbers, a JavaScript component, effects and memos.

```sh
npm install
npm run dev
```

## What is not done yet

- **A t-string is parsed when it first renders**, by
  [htm](https://github.com/developit/htm), and kept for the next renders; the
  build could compile it to `createElement` calls, and refuse a bad tag at its
  line.
- **The state is read off the source**: a list a handler changes through
  another function, `helper(items)`, is not seen changed, and a copy of a prop a
  handler changes in place, `items = list(initial)`, is computed again at each
  render; `use_state(lambda: list(initial))` keeps it.
- **No Fast Refresh**: an edited `.py` reloads the page, its state lost.
- **No server rendering** yet.

## Licence

Reacthon is MIT, the licence of React. See `LICENSE`.

Bryntime, Brycomp and Bryvend, which Reacthon depends on, are BSD-3-Clause, the
same licence as Brython.
