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


_MISSING = object()


class _Cells:
    """A component's state: the names a nested function rebinds or changes in
    place, kept from one render to the next. A name written anew renders the
    component again, as a state's setter does; written the value it holds,
    nothing."""

    def __init__(self, wake):
        object.__setattr__(self, "_wake", wake)

    def _has(self, name):
        return name in self.__dict__

    def _first(self, name, value):
        object.__setattr__(self, name, value)

    def __setattr__(self, name, value):
        if self.__dict__.get(name, _MISSING) is not value:
            object.__setattr__(self, name, value)
            self._wake()


class Ref:
    """What `use_ref()` hands back, the same object at every render: `current`
    is what it holds, the element of the page once `ref={...}` names it."""

    __slots__ = ("current",)

    def __init__(self, current=None):
        self.current = current

    def __repr__(self):
        return f"Ref({self.current!r})"
