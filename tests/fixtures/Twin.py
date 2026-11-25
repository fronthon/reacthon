def Item(item, on_remove):
    def toggle(event):
        item["done"] = not item["done"]

    def rename(event):
        item["label"] = item["label"] + "!"

    return t"""
        <li class={"done" if item["done"] else "open"}>
            {item["label"]}
            <button class="toggle" onClick={toggle}>t</button>
            <button class="rename" onClick={rename}>r</button>
            <button class="remove" onClick={on_remove}>x</button>
        </li>
    """


def Board():
    items = []
    count = 0
    text = ""
    made = 0

    def add(event):
        made := made + 1
        items.append({"id": made, "label": f"item {made}", "done": False})

    def clear(event):
        items.clear()

    def flip(event):
        items.reverse()

    def order(event):
        items.sort(key=lambda item: item["label"])

    def keep(event):
        items := [item for item in items if not item["done"]]

    def bump(event):
        count := count + 1

    def write(event):
        text := text + "a"

    def remover(item):
        return lambda event: items.remove(item)

    done = sum(1 for item in items if item["done"])

    return t"""
        <div>
            <button class="add" onClick={add}>add</button>
            <button class="clear" onClick={clear}>clear</button>
            <button class="flip" onClick={flip}>flip</button>
            <button class="order" onClick={order}>order</button>
            <button class="keep" onClick={keep}>keep</button>
            <button class="bump" onClick={bump}>bump</button>
            <button class="write" onClick={write}>write</button>
            <ul>{[t'<{Item} key={item["id"]} item={item} on_remove={remover(item)} />' for item in items]}</ul>
            <p>{count} {text} {done}/{len(items)}</p>
        </div>
    """
