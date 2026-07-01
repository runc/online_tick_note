"""单元测试：多标的组合回测引擎."""

from __future__ import annotations

import numpy as np
import pandas as pd

from easy_tdx.backtest.portfolio_engine import (
    PortfolioBacktestEngine,
    StockData,
)
from easy_tdx.backtest.strategy import Strategy


class SimpleBuyStrategy(Strategy):
    """简单策略：bar 5 买入，bar 30 卖出."""

    def init(self) -> None:
        pass

    def next(self) -> None:
        if self._bar_index == 5 and self.position["size"] == 0:
            self.buy(size=0)
        elif self._bar_index == 30 and self.position["size"] > 0:
            self.sell(size=0)


def _make_df(n: int = 100, seed: int = 42) -> pd.DataFrame:
    """生成随机 OHLCV DataFrame."""
    rng = np.random.default_rng(seed)
    close = 100.0 + np.cumsum(rng.normal(0, 1, n))
    high = close + rng.uniform(0, 1, n)
    low = close - rng.uniform(0, 1, n)
    open_ = low + rng.uniform(0, high - low, n)
    vol = rng.integers(1000000, 10000000, n).astype(float)

    return pd.DataFrame(
        {
            "datetime": pd.date_range("2024-01-01", periods=n, freq="D"),
            "open": open_,
            "high": high,
            "low": low,
            "close": close,
            "vol": vol,
            "amount": vol * close,
        }
    )


class TestPortfolioBacktest:
    """测试组合回测引擎."""

    def test_basic_portfolio_run(self) -> None:
        """基本组合回测应正常完成."""
        stocks = [
            StockData("000001", "SZ", _make_df(100, seed=42)),
            StockData("600000", "SH", _make_df(100, seed=99)),
        ]

        engine = PortfolioBacktestEngine(
            strategy_cls=SimpleBuyStrategy,
            stocks=stocks,
            total_cash=200000,
        )
        result = engine.run()

        assert result.total_performance is not None
        assert "total_return" in result.total_performance
        assert len(result.individual_results) == 2
        assert result.total_performance["total_stocks"] == 2

    def test_equal_allocation(self) -> None:
        """均等分配：每只标的资金应为总资金/标的数."""
        stocks = [
            StockData("000001", "SZ", _make_df(100, seed=42)),
            StockData("000002", "SZ", _make_df(100, seed=99)),
        ]

        engine = PortfolioBacktestEngine(
            strategy_cls=SimpleBuyStrategy,
            stocks=stocks,
            total_cash=100000,
            allocation="equal",
        )
        result = engine.run()

        # 每只标的分配 50000
        assert result.equity_allocation["SZ000001"] == 0.5
        assert result.equity_allocation["SZ000002"] == 0.5

    def test_empty_stocks(self) -> None:
        """空标的列表应返回零绩效."""
        engine = PortfolioBacktestEngine(
            strategy_cls=SimpleBuyStrategy,
            stocks=[],
            total_cash=100000,
        )
        result = engine.run()

        assert result.total_performance["total_return"] == 0.0
        assert len(result.individual_results) == 0

    def test_to_dict_serializable(self) -> None:
        """结果应可序列化为字典."""
        stocks = [StockData("000001", "SZ", _make_df(100))]
        engine = PortfolioBacktestEngine(
            strategy_cls=SimpleBuyStrategy,
            stocks=stocks,
            total_cash=100000,
        )
        result = engine.run()
        d = result.to_dict()

        assert "total_performance" in d
        assert "individual_results" in d
        assert "equity_allocation" in d
