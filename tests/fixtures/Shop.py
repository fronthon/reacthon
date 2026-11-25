from reacthon import use_state
from cart import total

__js__ = {"./Badge.js": ["Badge"], "./Frame.js": ["Frame", "rendered"]}

ROWS = [{"x": 1}, {"x": 2}]


def Shop(prices=(10, 20)):
    picked, set_picked = use_state(None)

    def pick(label):
        set_picked(label.upper())

    def Label(text=None, className=None):
        return t"<em class={className}>{text}</em>"

    return t"""
        <div>
            <{Badge} class="wide" style={ {"color": "red"} } label="items" count={len(prices)} items={list(prices)} onPick={pick} />
            <p class="total">{total(prices)}</p>
            <p class="picked">{picked}</p>
            <{Frame}
                render={t"<b>!</b>"}
                icons={ {"ok": t"<i>ok</i>"} }
                components={ {
                    "Label": Label,
                } }
                rows={ROWS}
            />
            <p class="called">{rendered(lambda props: t"<s>{props.n}</s>")}</p>
        </div>
    """
