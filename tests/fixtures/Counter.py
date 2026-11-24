from reacthon import use_state


def Counter(start=0):
    count, set_count = use_state(start)

    def increment(event):
        set_count(count + 1)

    return t"<button onClick={increment}>{count}</button>"
