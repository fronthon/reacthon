from reacthon import use_memo

kept = []


def Counter(start=0):
    count = start
    doubled = count * 2

    def increment(event):
        nonlocal count
        count += 1

    if not kept:
        kept.append(increment)

    return t"<button onClick={increment}>{count} {doubled}</button>"


def Basket():
    items = []
    counted = use_memo(lambda: len(items), [items])

    return t"""
        <button class="add" onClick={(lambda event: items.append(len(items)))}>add</button>
        <ul>{[t"<li key={at}>{item}</li>" for at, item in enumerate(items)]}</ul>
        <p>{counted}</p>
    """


def Nested():
    level = 0

    def outer(event):
        def inner():
            nonlocal level
            level += 1

        inner()
        inner()

    def shadow(event):
        level = 100
        return level

    return t'<button class="outer" onClick={outer}>{level}</button><button class="shadow" onClick={shadow}>shadow</button>'


class Point:
    def __init__(self, x):
        self.x = x


def Shapes():
    todos = [{"done": False}]
    point = Point(0)

    class Label:
        def text(self):
            return f"{point.x}:{todos[0]['done']}"

    def flip(event):
        todos[0]["done"] = not todos[0]["done"]
        point.x += 1

    return t"<button onClick={flip}>{Label().text()}</button>"


def Total(prices=(1, 2, 3)):
    total = 0

    def add(price):
        nonlocal total
        total += price

    for price in prices:
        add(price)

    return t"<p>{total}</p>"


def Removable():
    items = ["a", "b"]

    def remover(item):
        return lambda event: items.remove(item)

    return t'{[t"<button key={item} onClick={remover(item)}>{item}</button>" for item in items]}'


def Child(rows):
    def add(event):
        rows.append("child")

    return t'<button class="child" onClick={add}>add from child</button>'


def Parent():
    rows = ["parent"]

    def add(event):
        rows.append("parent")

    return t'<button class="parent" onClick={add}>add</button><{Child} rows={rows} /><p>{", ".join(rows)}</p>'
