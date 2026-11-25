from reacthon import use_effect, use_memo
from Todos import Todos

__js__ = {"./Stars.js": ["Stars"]}


def Counter():
    count = 0

    def increment(event):
        count := count + 1

    return t"<button onClick={increment}>clicked {count} times</button>"


def Temperature():
    celsius = 21.0
    fahrenheit = celsius * 9 / 5 + 32

    def change(event):
        try:
            celsius := float(event.target.value)
        except ValueError:
            pass

    return t"""
        <label>
            <input type="number" step="0.5" value={celsius} onChange={change} /> °C
        </label>
        <span> = {fahrenheit:.1f} °F</span>
    """


def Rating():
    stars = 3
    words = {1: "poor", 2: "fair", 3: "good", 4: "great", 5: "superb"}

    def rate(value):
        stars := value

    return t"""
        <{Stars} value={stars} onRate={rate} />
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
    seconds = 0

    def tick():
        seconds := seconds + 1

    def start():
        timer = js.setInterval(tick, 1000)
        return lambda: js.clearInterval(timer)

    use_effect(start, [])

    primes = use_memo(lambda: [n for n in range(2, 60) if all(n % d for d in range(2, n))], [])

    return t"""
        <main>
            <h1>Reacthon</h1>
            <p class="lead">React components in Python: compiled at build time, rendered by React itself.</p>
            <{Card} title="State" note="a name a handler writes is the state: count = 0, then count := count + 1">
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
            <{Card} title="Effects and memos" note="a timer made at the first render reads the state of now: seconds := seconds + 1">
                <p>Open for {seconds} s. Primes under 60: {", ".join(str(p) for p in primes)}.</p>
            </{Card}>
        </main>
    """
