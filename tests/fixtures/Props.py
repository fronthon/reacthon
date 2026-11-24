from reacthon import use_state


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
