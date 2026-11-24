from reacthon import use_state, use_effect, use_memo

log = []


def Clock(label="tick"):
    seconds, set_seconds = use_state(0)

    def start():
        log.append(f"start {label}")

        def stop():
            log.append(f"stop {label}")

        return stop

    use_effect(start, [label])

    squared = use_memo(lambda: (log.append(f"square {seconds}"), seconds * seconds)[1], [seconds])

    def tick(event):
        set_seconds(lambda previous: previous + 1)

    return t"<button onClick={tick}>{label} {seconds} {squared}</button>"
