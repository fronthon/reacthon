from reacthon import use_effect, use_context, create_context

log = []
Theme = create_context(None)


def reset():
    log.clear()


def Row(row, on_remove):
    clicks = 0
    theme = use_context(Theme)

    def click(event):
        clicks := clicks + 1

    def rename(event):
        row["label"] = row["label"] + "!"

    def watch():
        key, label = row["id"], row["label"]
        log.append(f"show {key} {label}")
        return lambda: log.append(f"hide {key} {label}")

    use_effect(watch, [row["label"]])

    return t"""
        <li class={"dark" if theme["dark"] else "light"}>
            {row["label"]} {clicks}
            <button class="click" onClick={click}>c</button>
            <button class="rename" onClick={rename}>r</button>
            <button class="remove" onClick={on_remove}>x</button>
        </li>
    """


def Board():
    rows = []
    made = 0
    draft = ""
    theme = {"dark": False}
    count = 0

    def add(event):
        made := made + 1
        rows.append({"id": made, "label": draft or f"item {made}"})
        draft := ""

    def edit(event):
        draft := event.target.value

    def flip(event):
        rows.reverse()

    def order(event):
        rows.sort(key=lambda row: row["label"])

    def shade(event):
        theme["dark"] = not theme["dark"]

    async def later(event):
        await js.Promise.resolve(None)
        count := count + 1

    def remover(row):
        return lambda event: rows.remove(row)

    def watch():
        seen = count
        log.append(f"count {seen}")
        return lambda: log.append(f"uncount {seen}")

    use_effect(watch, [count])

    return t"""
        <{Theme} value={theme}>
            <input class="draft" value={draft} onChange={edit} />
            <button class="add" onClick={add}>add</button>
            <button class="flip" onClick={flip}>flip</button>
            <button class="order" onClick={order}>order</button>
            <button class="shade" onClick={shade}>shade</button>
            <button class="later" onClick={later}>later</button>
            <ul>{[t'<{Row} key={row["id"]} row={row} on_remove={remover(row)} />' for row in rows]}</ul>
            <p>{count} {len(rows)}</p>
        </{Theme}>
    """
