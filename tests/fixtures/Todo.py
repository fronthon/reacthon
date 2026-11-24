from reacthon import use_state


def TodoItem(text, done=False, on_toggle=None):
    return t'<li class={"done" if done else "open"} onClick={on_toggle}>{text}</li>'


def TodoList(items=()):
    todos, set_todos = use_state(lambda: [{"text": text, "done": False} for text in items])
    draft, set_draft = use_state("")

    def add(event):
        event.preventDefault()
        if draft.strip():
            set_todos([*todos, {"text": draft.strip(), "done": False}])
            set_draft("")

    def toggle(index):
        def flip(event):
            set_todos([{**todo, "done": not todo["done"]} if at == index else todo for at, todo in enumerate(todos)])

        return flip

    left = sum(1 for todo in todos if not todo["done"])

    return t"""
        <form onSubmit={add}>
            <input value={draft} onChange={(lambda event: set_draft(event.target.value))} />
            <button>Add</button>
        </form>
        <ul>
            {[t'<{TodoItem} key={at} text={todo["text"]} done={todo["done"]} on_toggle={toggle(at)} />' for at, todo in enumerate(todos)]}
        </ul>
        <p>{left} left</p>
    """
