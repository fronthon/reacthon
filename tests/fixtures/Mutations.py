from reacthon import use_state, use_memo

counted = []


def Basket():
    items, set_items = use_state(["apple"])

    def count():
        counted.append(len(items))
        return len(items)

    size = use_memo(count, [items])

    def add(event):
        items.append("pear")

    def rename(event):
        items[0] = "APPLE"

    def replace(event):
        set_items(["fig"])

    return t"""
        <button class="add" onClick={add}>add</button>
        <button class="rename" onClick={rename}>rename</button>
        <button class="replace" onClick={replace}>replace</button>
        <ul>{[t"<li key={at}>{item}</li>" for at, item in enumerate(items)]}</ul>
        <p>{size}</p>
    """


def Item(todo):
    def flip(event):
        todo["done"] = not todo["done"]

    return t'<li class={"done" if todo["done"] else "open"} onClick={flip}>{todo["text"]}</li>'


def Todos():
    todos, _ = use_state(lambda: [{"text": "a", "done": False}, {"text": "b", "done": False}])
    left = sum(not todo["done"] for todo in todos)

    return t'<ul>{[t"<{Item} key={todo["text"]} todo={todo} />" for todo in todos]}</ul><p>{left} left</p>'


class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y


def Mover():
    point, _ = use_state(lambda: Point(0, 0))

    def right(event):
        point.x += 1

    return t"<button onClick={right}>{point.x},{point.y}</button>"
