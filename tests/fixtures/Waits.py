from browser import aio
from reacthon import use_effect, use_state

__js__ = {"./Frame.js": ["later"]}


# A coroutine an effect starts, as JavaScript starts an async function it
# calls, and one a click starts, which JavaScript calls: each waits for a
# JavaScript promise.
def Waits():
    loaded, set_loaded = use_state("waiting")
    copied, set_copied = use_state("none")

    def effect():
        async def load():
            set_loaded(await later("loaded"))

        aio.run(load())

    use_effect(effect, [])

    async def copy():
        try:
            set_copied(await later("copied"))
        finally:
            pass

    return t"<button onClick={copy}>{loaded} {copied}</button>"
