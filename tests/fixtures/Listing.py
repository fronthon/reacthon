__js__ = {"./Count.js": ["Count"]}


def Listing():
    items = ["a"]

    def add(event):
        items.append("b")

    return t"""
        <div>
            <{Count} items={items} />
            <button onClick={add}>add</button>
        </div>
    """
