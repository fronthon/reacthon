"""What CPython writes of the values of Formats.py: the format specifications it
accepts for each value and their text, each conversion, and a field written
alone, which Reacthon shows as an f-string does, None and the booleans apart."""
import json
import sys

sys.path.insert(0, sys.argv[1])

from Formats import SPECS, VALUES  # noqa: E402

cases = []
formatted = []

for at, value in enumerate(VALUES):
    for spec, written in enumerate(SPECS):
        try:
            text = format(value, written)
        except (ValueError, TypeError, OverflowError):
            continue
        cases.append([at, spec])
        formatted.append(text)

converted = [f"{value!r}|{value!s}|{value!a}" for value in VALUES]
plain = ["" if value is None or isinstance(value, bool) else str(value) for value in VALUES if not isinstance(value, tuple)]

named = [repr(value) for value in VALUES]

print(json.dumps({
    "cases": cases, "formatted": formatted, "converted": converted, "plain": plain,
    "named": named, "specs": SPECS,
}))
