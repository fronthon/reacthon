VALUES = [
    0, 7, -7, 2**64, -(2**70), 1.0, -0.0, 0.1 + 0.2, 1e16, 1e-7, 123456.789, 2.5, 3.5,
    float("inf"), float("-inf"), float("nan"), 1 + 2j, "é", "abc", "", True, None, (1, "a"),
]

SPECS = [
    ">8", "<8", "^8", "*^9", "08", "+", " ", ",", "_", ".2f", ".0f", ".3e", ".4g", "g", "%",
    ".1%", "x", "X", "#x", "b", "#o", "c", "n", ">10.2f", "+.1f", "_.2f", ",.3f", "e", "E", "=+8",
    ".3", "10", ".0e",
]


def Formats(cases):
    return t'<ul>{[t"<li>{VALUES[at]:{SPECS[spec]}}</li>" for at, spec in cases]}</ul>'


def Converted():
    return t'<ul>{[t"<li>{value!r}|{value!s}|{value!a}</li>" for value in VALUES]}</ul>'


def Plain():
    return t'<ul>{[t"<li>{value}</li>" for value in VALUES if not isinstance(value, tuple)]}</ul>'
