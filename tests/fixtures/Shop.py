from reacthon import use_state
from cart import total

__js__ = {"./Badge.js": ["Badge"]}


def Shop(prices=(10, 20)):
    picked, set_picked = use_state(None)

    def pick(label):
        set_picked(label.upper())

    return t"""
        <div>
            <{Badge} label="items" count={len(prices)} items={list(prices)} onPick={pick} />
            <p class="total">{total(prices)}</p>
            <p class="picked">{picked}</p>
        </div>
    """
