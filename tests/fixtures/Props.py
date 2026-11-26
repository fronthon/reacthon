from javascript import NULL
from reacthon import create_context, use_context, use_ref, use_state

__js__ = {"./Frame.js": ["Slotted", "Cloner"]}


def Editor(value, on_change):
    def add(event):
        on_change([*value, len(value)])

    return t"<button onClick={add}>{type(value).__name__} {len(value)}</button>"


def Form():
    rows, set_rows = use_state(lambda: [0])

    return t"<{Editor} value={rows} on_change={set_rows} /><p>{type(rows).__name__} {rows}</p>"


def Kinds(items, options, missing=None):
    return t'<p>{type(items).__name__} {type(options).__name__} {options["size"]} {str(missing)}</p>'


def Card(title, children=None):
    return t'<section><h2>{title}</h2>{children}</section>'


def Page():
    return t'<{Card} title="Hello"><p>first</p><p>second</p></{Card}>'


def Button(className="", variant="plain", children=None, **props):
    return t'<button class={f"button {variant} {className}".strip()} ...{props}>{children}</button>'


def Toolbar():
    pressed = 0

    def press(event):
        pressed := pressed + 1

    return t"""
        <{Button} class="wide" variant="bold" id="go" title="go" onClick={press}>pressed {pressed}</{Button}>
        <{Button} ...{None}>plain</{Button}>
    """


def Tag(className="", **props):
    return t"<span class={className} ...{props} />"


def Tags():
    return t'<{Tag} class="x">hello <b>you</b> {[1, 2]}</{Tag}><{Tag}>{"alone"}</{Tag}>'


Unset = create_context(NULL)


# A Python component between, as shadcn's button between a library's.
def Passed(slot=None):
    return t"<{Slotted} slot={slot} />"


def Nulls():
    state = use_state(NULL)[0]
    box = use_ref(NULL)

    return t"""
        <{Passed} slot={NULL} /><{Passed} />
        <p>{str(state is NULL)} {str(box.current is NULL)} {str(use_context(Unset) is NULL)}</p>
    """


def Received(rows=None, label=None):
    return t'<p class="cloned">{type(rows).__name__} {type(rows[0]).__name__} {rows[0]["x"]} {label}</p>'


def Cloned():
    return t'<{Cloner}><{Received} label="mine" /></{Cloner}>'
