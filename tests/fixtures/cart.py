TAX = 0.2


def total(prices):
    return round(sum(prices) * (1 + TAX), 2)
