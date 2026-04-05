# Trading Strategy Documentation

## Overview

This document details the complete trading strategy implemented in the signal bot.

## Core Philosophy

**Quality over Quantity**: Only generate A+ setups with high probability of success.

**Multi-Timeframe Confluence**: All three timeframes must align for a valid signal.

**Risk-First Approach**: Stop loss calculated before entry, minimum 1:2 R/R enforced.

---

## Timeframe Hierarchy

### 1H Timeframe - Trend Direction
**Purpose**: Determine the primary market direction

**Indicator**: EMA(200)

**Rules**:
- Price > EMA(200) → Bullish trend → Look for longs only
- Price < EMA(200) → Bearish trend → Look for shorts only

**Why**: Trading with the trend increases win rate significantly. The 1H timeframe filters out noise while capturing meaningful directional bias.

### 15M Timeframe - Setup Detection
**Purpose**: Identify pullback/retracement setups within the trend

**Indicators**: 
- EMA(50)
- RSI(14)
- Volume

**Long Setup Rules**:
- Price pulls back toward EMA(50) (within 2%)
- RSI between 40-55 (not oversold, but showing weakness)
- Volume contraction during pullback, then expansion

**Short Setup Rules**:
- Price rallies toward EMA(50) (within 2%)
- RSI between 55-70 (not overbought, but showing strength)
- Volume contraction during rally, then expansion

**Why**: We don't chase momentum. We wait for price to pull back to value (EMA50) in a trending market. RSI confirms the pullback isn't too deep or too shallow.

### 5M Timeframe - Entry Trigger
**Purpose**: Precise entry timing

**Indicators**:
- MACD (12, 26, 9)
- Candlestick patterns

**Long Triggers**:
- MACD bullish crossover (histogram crosses above zero) OR
- Bullish engulfing candlestick pattern OR
- Higher low formation (confirming reversal)

**Short Triggers**:
- MACD bearish crossover (histogram crosses below zero) OR
- Bearish engulfing candlestick pattern OR
- Lower high formation (confirming reversal)

**Why**: MACD crossovers signal momentum shift. Engulfing patterns show strong buying/selling pressure. Structure (higher lows/lower highs) confirms trend continuation.

---

## Perpetual Futures Edge

### Funding Rate Analysis

**What it is**: Periodic payment between longs and shorts based on position imbalance.

**Trading Logic**:

**For LONGS**:
- Preferred: Funding rate <= 0.01% (neutral to negative)
- Avoid: Funding rate > 0.01% (everyone is long, contrarian signal)
- Extra edge: Funding rate < -0.01% (shorts trapped, squeeze potential)

**For SHORTS**:
- Preferred: Funding rate >= 0.02% (very positive)
- Target: Overly bullish positions that need to correct
- Extra edge: Extreme funding (>0.05%) signals euphoria

**Why**: When funding is extremely positive, longs are overcrowded and vulnerable. When negative, shorts are trapped. We fade the extremes.

### Open Interest (OI) Analysis

**What it is**: Total value of outstanding contracts.

**Trading Logic**:
- OI increasing + price rising → Bullish (new longs entering)
- OI increasing + price falling → Bearish (new shorts entering)
- OI decreasing → Positions closing, momentum fading

**Rules**:
- OI must be increasing (>5% change) to validate signal
- OI + Volume spike = strong confirmation

**Why**: OI shows new money entering. Rising OI with rising price = sustainable move. Rising OI with falling price = sustainable decline.

---

## Entry Conditions Deep Dive

### LONG Entry Checklist

| Condition | Weight | Description |
|-----------|--------|-------------|
| 1H Price > EMA200 | +2 | Uptrend confirmed |
| 15M Near EMA50 + Valid RSI | +1 | Pullback to value |
| Valid RSI (40-55) | +1 | Not oversold |
| MACD Crossover/Engulfing | +1 | Entry trigger |
| Volume Spike (>1.5x) | +1 | Confirmation |
| OI Increasing | +1 | New positions |
| Funding <= 0.01 | +1 | Not overcrowded |
| **Total** | **8** | **Max possible** |

**Minimum Score**:
- HIGH confidence: 6-7 points
- MEDIUM confidence: 4-5 points
- NO TRADE: <4 points

### SHORT Entry Checklist

| Condition | Weight | Description |
|-----------|--------|-------------|
| 1H Price < EMA200 | +2 | Downtrend confirmed |
| 15M Near EMA50 + Valid RSI | +1 | Rally to resistance |
| Valid RSI (55-70) | +1 | Not overbought |
| MACD Crossover/Engulfing | +1 | Entry trigger |
| Volume Spike (>1.5x) | +1 | Confirmation |
| OI Increasing | +1 | New positions |
| Funding >= 0.02 | +1 | Overcrowded longs |
| **Total** | **8** | **Max possible** |

---

## Stop Loss Strategy

### Dual Method Approach

**Method 1: ATR-Based**
```
Stop Loss = Entry ± (ATR(14) × 1.5)
```
- Adapts to volatility
- Wider stops in volatile markets
- Tighter stops in calm markets

**Method 2: Structure-Based**
```
Long: Stop below recent swing low (last 10 candles)
Short: Stop above recent swing high (last 10 candles)
```
- Respects market structure
- Invalidation point clear

**Final Stop Loss**: Use the MORE CONSERVATIVE of the two
- For longs: Higher of ATR/Structure stop
- For shorts: Lower of ATR/Structure stop

**Why**: Prevents getting stopped out by normal volatility while respecting technical invalidation levels.

---

## Take Profit Strategy

### R-Multiple System

```
Risk (R) = |Entry - Stop Loss|
```

**Three Targets**:
- **TP1 (1R)**: First profit, reduce risk
- **TP2 (2R)**: Main target, core profit
- **TP3 (3R)**: Extension, let winners run

**Execution Plan** (for external system):
1. Enter full position at entry price
2. Take 30% profit at TP1
3. Take 50% profit at TP2
4. Take 20% profit at TP3 or trail stop

**Why**: Systematic profit taking ensures we lock gains while leaving room for big winners. Minimum 1:2 R/R enforced before signal generated.

---

## Leverage Rules

### Dynamic Leverage Based on Confidence

**HIGH Confidence (6-7 points)**:
- Leverage: 5x
- Rationale: All stars aligned, maximize reward
- Effective risk: 1% × 5 = 5% portfolio impact

**MEDIUM Confidence (4-5 points)**:
- Leverage: 3x
- Rationale: Good setup, but not perfect
- Effective risk: 1% × 3 = 3% portfolio impact

**LOW Confidence (<4 points)**:
- Leverage: 0 (NO TRADE)
- Rationale: Insufficient edge, preserve capital

**Why**: Higher leverage for higher probability setups maximizes edge while controlling total risk exposure.

---

## Risk Management Rules

### Position Level
- Risk per trade: 1% of capital
- Maximum open trades: 3 concurrent positions
- Maximum portfolio risk: 3% (if all 3 hit stops)

### Portfolio Level
- If 2 consecutive losses: Review strategy
- If 3 consecutive losses: Reduce position size by 50%
- Never risk more than 1% per trade, regardless of confidence

### Trade Rejection Criteria
- R/R ratio < 1:2 → REJECT
- Stop loss = Entry (zero room) → REJECT
- Conflicting timeframes → REJECT
- Sideways market (price near EMAs) → REJECT
- Extremely low volume → REJECT

---

## Advanced Edge: Trap Detection

### Funding Rate Traps

**Long Trap (Fade shorts)**:
```
When funding < -0.01%:
→ Shorts overcrowded
→ Potential short squeeze
→ +1 confidence for LONG signals
```

**Short Trap (Fade longs)**:
```
When funding > 0.02%:
→ Longs overcrowded
→ Potential long liquidation
→ +1 confidence for SHORT signals
```

**Extreme Scenarios**:
- Funding > 0.05%: Euphoria, major correction likely
- Funding < -0.05%: Despair, major bounce likely

---

## What This Strategy Avoids

### No Trade Zones

1. **Choppy Markets**:
   - Price oscillating around EMAs
   - No clear trend on 1H
   - RSI around 50 (neutral)

2. **Low Volume**:
   - Volume below 20-period average
   - Thin order books
   - No conviction

3. **Extreme RSI**:
   - RSI > 70 for longs (overbought)
   - RSI < 30 for shorts (oversold)
   - Likely reversal zone

4. **Funding Anomalies**:
   - Funding rate suddenly changes without price action
   - Data errors or manipulation suspected

5. **Weekend/Low Liquidity**:
   - (Can be implemented via time filter)
   - Wider spreads, higher slippage risk

---

## Example Scenarios

### Perfect LONG Setup (Score: 7)

```
BTC/USDT

1H: $65,000, EMA200 at $60,000 ✅ (+2)
15M: Pulled back to $64,000, EMA50 at $64,200, RSI at 45 ✅ (+2)
5M: MACD bullish crossover ✅ (+1)
Volume: 2.1x average ✅ (+1)
Funding: 0.005% ✅ (+1)
OI: +8% increase ✅ (included in volume scoring)

Score: 7 → HIGH Confidence
Entry: $65,000
Stop: $64,000 (ATR-based)
TP1: $66,000 (1R)
TP2: $67,000 (2R)
TP3: $68,000 (3R)
Leverage: 5x
```

### Rejected Setup (Score: 3)

```
ETH/USDT

1H: $3,500, EMA200 at $3,200 ✅ (+2)
15M: RSI at 65 (too high) ❌
5M: No clear trigger ❌
Volume: 0.9x average ❌
Funding: 0.015% (slightly high) ❌ (0 points)
OI: -2% decrease ❌

Score: 2 → NO TRADE
Reason: Insufficient confluence, high RSI, no volume
```

---

## Strategy Performance Expectations

**Win Rate Target**: 50-60%

**Average R:R**: 1:2.5

**Expected Value**: Positive (wins offset losses)

**Max Drawdown**: <15% (with proper position sizing)

**Signals Per Day**: 0-5 (quality over quantity)

---

## Continuous Improvement

### What to Track
- Win/loss ratio per coin
- Best performing timeframes
- Confidence score vs actual performance
- Funding rate effectiveness
- Pattern recognition accuracy

### Adaptation
- Adjust confidence thresholds based on results
- Add/remove coins based on performance
- Refine indicator periods
- Optimize leverage allocation

---

## Final Notes

This strategy is designed for:
- ✅ Trending markets (up or down)
- ✅ Medium to high volatility
- ✅ Liquid perpetual futures markets
- ✅ Systematic, emotion-free execution

This strategy struggles in:
- ❌ Sideways, range-bound markets
- ❌ Extremely low volatility periods
- ❌ Major news events (outside technical analysis)
- ❌ Illiquid altcoins

**Remember**: The bot generates signals. External execution system (Degen Claw) handles the actual trading. This separation allows for risk management and manual override if needed.
