from reacthon import use_state


def Attributes(price=2.5, kind=None, count=3):
    return t'<p title="Total {price}" class="row {kind}" data-count="n{count}">x</p>'


log = []


def Loader():
    status, set_status = use_state("idle")

    async def load(event):
        set_status("loading")
        value = await js.Promise.resolve(42)
        log.append(value)
        set_status(f"loaded {value}")

    return t"<button onClick={load}>{status}</button>"
