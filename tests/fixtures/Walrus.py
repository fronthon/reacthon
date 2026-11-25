from reacthon import use_effect

kept = []


def Todos():
    todos = []
    draft = ""
    seconds = 0

    def edit(event):
        draft := event.target.value

    def add(event):
        todos.append(draft)
        draft := ""

    def tick():
        seconds := seconds + 1

    if not kept:
        kept.append(tick)

    return t"""
        <input value={draft} onChange={edit} />
        <button onClick={add}>add</button>
        <p>{len(todos)} to do, {seconds} s</p>
    """


def OneLine():
    count = 0

    return t"<button onClick={(lambda event: (count := count + 1))}>{count}</button>"


def Several():
    rows = []
    label = "none"

    def fill(event):
        rows := [
            "a",
            "b",
        ]  # a comment after
        label := "two"; print(label)

    return t"<button onClick={fill}>{len(rows)} {label}</button>"
