from reacthon import use_state, use_ref, use_reducer, use_context, create_context, use_effect, Ref

seen = []


def Focus():
    box = use_ref()
    renders = use_ref(0)
    renders.current += 1

    def focus(event):
        box.current.focus()
        seen.append(box.current.tagName)

    use_effect(lambda: seen.append(repr(box)), [])

    return t'<input ref={box} /><button onClick={focus}>focus</button><p>{str(isinstance(box, Ref))} {renders.current}</p>'


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
