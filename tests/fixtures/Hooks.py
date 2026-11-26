from reacthon import use_state, use_ref, use_reducer, use_context, create_context, use_effect, memo, Ref

seen = []
drawn = []


@memo
def Entry(entry=None):
    drawn.append(entry["name"])
    return t'<li>{entry["name"]}</li>'


def Named(entry=None):
    drawn.append(entry["name"])
    return t'<li>{entry["name"]}</li>'


# Drawn again only when the name changes, whichever dict holds it.
ByName = memo(Named, lambda previous, current: previous["entry"]["name"] == current["entry"]["name"])


def Entries():
    entries, set_entries = use_state([{"name": "a"}, {"name": "b"}])

    def rename(event):
        set_entries([entries[0], {"name": "c"}])

    def copy(event):
        set_entries([dict(entry) for entry in entries])

    return t"""
        <ul>{[t'<{Entry} key={at} entry={entry} />' for at, entry in enumerate(entries)]}</ul>
        <ol>{[t'<{ByName} key={at} entry={entry} />' for at, entry in enumerate(entries)]}</ol>
        <button class="rename" onClick={rename}>rename</button>
        <button class="copy" onClick={copy}>copy</button>
    """


def Focus():
    box = use_ref()
    renders = use_ref(0)
    renders.current += 1

    def focus(event):
        box.current.focus()
        seen.append(box.current.tagName)

    use_effect(lambda: seen.append(repr(box)), [])

    return t'<input ref={box} /><button onClick={focus}>focus</button><p>{str(isinstance(box, Ref))} {renders.current}</p>'


def Remembered():
    last = use_ref("none")
    count, set_count = use_state(0)

    def press(event):
        last.current = f"pressed at {count}"
        set_count(count + 1)

    return t'<button onClick={press}>{count}, {last.current}</button>'


def reducer(state, action):
    if action == "up":
        return state + 1
    if action == "reset":
        return 0
    return state


def Stepper():
    count, dispatch = use_reducer(reducer, 10)

    return t"""
        <button class="up" onClick={(lambda event: dispatch("up"))}>up</button>
        <button class="reset" onClick={(lambda event: dispatch("reset"))}>reset</button>
        <p>{count}</p>
    """


Theme = create_context({"color": "blue"})


def Swatch():
    theme = use_context(Theme)
    return t'<span class="swatch">{theme["color"]}</span>'


def Themed():
    theme, _ = use_state(lambda: {"color": "red"})

    def darken(event):
        theme["color"] = "dark" + theme["color"]

    return t"""
        <{Theme} value={theme}>
            <{Swatch} />
            <button onClick={darken}>darken</button>
        </{Theme}>
        <{Swatch} />
    """


def Broken(items=()):
    return t"<p>{items[3]}</p>"
