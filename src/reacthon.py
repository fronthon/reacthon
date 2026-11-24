"""React's hooks under their Python names, and what they hand back."""

from _reacthon import (
    use_state,
    use_reducer,
    use_effect,
    use_layout_effect,
    use_memo,
    use_callback,
    use_ref,
    use_context,
    use_id,
    create_context,
)

__all__ = [
    "use_state",
    "use_reducer",
    "use_effect",
    "use_layout_effect",
    "use_memo",
    "use_callback",
    "use_ref",
    "use_context",
    "use_id",
    "create_context",
    "Ref",
]


class Ref:
    """What `use_ref()` hands back, the same object at every render: `current`
    is what it holds, the element of the page once `ref={...}` names it."""

    __slots__ = ("current",)

    def __init__(self, current=None):
        self.current = current

    def __repr__(self):
        return f"Ref({self.current!r})"
