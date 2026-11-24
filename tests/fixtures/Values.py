def Values(price=3.5, missing=None, flag=False):
    return t"""
        <p class="float">{1.0}</p>
        <p class="spec">{price:.2f}</p>
        <p class="repr">{"a"!r}</p>
        <p class="none">{missing}</p>
        <p class="flag">{flag}</p>
        <p class="list">{[1, 2, 3]}</p>
        <p class="tuple">{(1.5, 2.5)}</p>
        <p class="dict">{ {"a": 1} }</p>
        <p class="big">{2 ** 64}</p>
        <p class="when">{flag and t"<b>on</b>"}</p>
    """
