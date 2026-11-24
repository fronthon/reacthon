from reacthon import use_state, use_effect, use_memo
from Todos import Todos

__js__ = {"./Stars.js": ["Stars"]}


def Counter():
    count, set_count = use_state(0)

    return t"""
        <button onClick={(lambda event: set_count(count + 1))}>clicked {count} times</button>
    """


def Temperature():
    celsius, set_celsius = use_state(21.0)
    fahrenheit = celsius * 9 / 5 + 32

    def change(event):
        try:
            set_celsius(float(event.target.value))
        except ValueError:
            pass

    return t"""
        <label>
            <input type="number" step="0.5" value={celsius} onChange={change} /> °C
        </label>
        <span> = {fahrenheit:.1f} °F</span>
    """


def Rating():
    stars, set_stars = use_state(3)
    words = {1: "poor", 2: "fair", 3: "good", 4: "great", 5: "superb"}

    return t"""
        <{Stars} value={stars} onRate={set_stars} />
        <span class="muted"> {words[stars]}</span>
    """


def Card(title, children=None, note=None):
    return t"""
        <section class="card">
            <h2>{title}</h2>
            {children}
            {note and t'<p class="note">{note}</p>'}
        </section>
    """


def App():
    seconds, set_seconds = use_state(0)

    def start():
        timer = js.setInterval(lambda: set_seconds(lambda s: s + 1), 1000)
        return lambda: js.clearInterval(timer)

    use_effect(start, [])

    primes = use_memo(lambda: [n for n in range(2, 60) if all(n % d for d in range(2, n))], [])

    return t"""
        <main>
            <h1>Reacthon</h1>
            <p class="lead">React components in Python: compiled at build time, rendered by React itself.</p>
            <{Card} title="State" note="use_state, as React's useState">
                <{Counter} />
            </{Card}>
            <{Card} title="Lists changed in place" note="todos.append(...) renders again: no copy, no setter">
                <{Todos} />
            </{Card}>
            <{Card} title="Python's numbers" note="a float shows as Python writes it, :.1f included">
                <{Temperature} />
            </{Card}>
            <{Card} title="A JavaScript component" note="Stars.js, called with a Python callback">
                <{Rating} />
            </{Card}>
            <{Card} title="Effects and memos" note="use_effect with its cleanup, use_memo">
                <p>Open for {seconds} s. Primes under 60: {", ".join(str(p) for p in primes)}.</p>
            </{Card}>
        </main>
    """
