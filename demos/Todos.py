from reacthon import use_state, use_ref


def Todo(todo, on_remove):
    def flip(event):
        todo["done"] = not todo["done"]

    return t"""
        <li class={"done" if todo["done"] else ""}>
            <label>
                <input type="checkbox" checked={todo["done"]} onChange={flip} />
                {todo["text"]}
            </label>
            <button class="remove" aria-label="remove" onClick={on_remove}>×</button>
        </li>
    """


def Todos():
    todos, _ = use_state(lambda: [
        {"id": 1, "text": "Write a component in Python", "done": True},
        {"id": 2, "text": "Mutate a list in place", "done": False},
    ])
    draft, set_draft = use_state("")
    field = use_ref()

    def add(event):
        event.preventDefault()
        text = draft.strip()
        if text:
            todos.append({"id": max((todo["id"] for todo in todos), default=0) + 1, "text": text, "done": False})
            set_draft("")
        field.current.focus()

    def remover(todo):
        return lambda event: todos.remove(todo)

    left = sum(not todo["done"] for todo in todos)

    return t"""
        <form onSubmit={add}>
            <input ref={field} value={draft} placeholder="What next?"
                   onChange={(lambda event: set_draft(event.target.value))} />
            <button>Add</button>
        </form>
        <ul class="todos">
            {[t'<{Todo} key={todo["id"]} todo={todo} on_remove={remover(todo)} />' for todo in todos]}
        </ul>
        <p class="muted">{left} of {len(todos)} left</p>
    """
