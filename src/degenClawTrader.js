const API_BASE = "https://api.agdp.io/degen-acp";
const POSITIONS_API = "https://dgclaw-app-production.up.railway.app/users";

export class DegenClawTrader {
  constructor(agent) {
    this.agent = agent;
    this.apiKey = agent.apiKey;
    this.walletAddress = agent.walletAddress;
  }

  async getAccountBalance() {
    try {
      const response = await fetch(`${POSITIONS_API}/${this.walletAddress}/account`, {
        timeout: 10000
      });
      const data = await response.json();
      
      if (data.data && data.data.hlBalance) {
        return {
          success: true,
          balance: parseFloat(data.data.hlBalance),
          withdrawable: parseFloat(data.data.withdrawableBalance)
        };
      }
      return { success: false, error: "No balance data" };
    } catch (error) {
      console.error(`[${this.agent.label}] Failed to fetch balance:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getPositions() {
    try {
      const response = await fetch(`${POSITIONS_API}/${this.walletAddress}/positions`, {
        timeout: 10000
      });
      const data = await response.json();
      
      if (data.data) {
        return {
          success: true,
          positions: data.data
        };
      }
      return { success: false, error: "No position data" };
    } catch (error) {
      console.error(`[${this.agent.label}] Failed to fetch positions:`, error.message);
      return { success: false, error: error.message };
    }
  }

  calculateTPSL(entryPrice, tpPercent, slPercent, side) {
    if (side === "long") {
      const tp = entryPrice * (1 + tpPercent / 100);
      const sl = entryPrice * (1 - slPercent / 100);
      return {
        takeProfit: tp.toFixed(2),
        stopLoss: sl.toFixed(2)
      };
    } else {
      const tp = entryPrice * (1 - tpPercent / 100);
      const sl = entryPrice * (1 + slPercent / 100);
      return {
        takeProfit: tp.toFixed(2),
        stopLoss: sl.toFixed(2)
      };
    }
  }

  async openPosition({ pair, side, size, leverage = 3, tpPercent, slPercent, currentPrice }) {
    let takeProfit, stopLoss;
    
    if (tpPercent && slPercent && currentPrice) {
      const calc = this.calculateTPSL(currentPrice, tpPercent, slPercent, side);
      takeProfit = calc.takeProfit;
      stopLoss = calc.stopLoss;
    }

    const payload = {
      service: "perp_trade",
      action: "open",
      params: {
        pair,
        side,
        size: size.toString(),
        leverage,
        ...(takeProfit && { takeProfit }),
        ...(stopLoss && { stopLoss })
      }
    };

    console.log(`[${this.agent.label}] Opening ${side.toUpperCase()} ${pair} | $${size} @ ${leverage}x | TP: ${takeProfit} | SL: ${stopLoss}`);

    try {
      const response = await fetch(`${API_BASE}/job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });

      const data = await response.json();
      
      if (data.ok) {
        console.log(`[${this.agent.label}] ✅ Position opened | JobID: ${data.data?.jobId}`);
        return { success: true, data };
      } else {
        console.error(`[${this.agent.label}] ❌ Failed:`, data.error || data);
        return { success: false, error: data.error || "Unknown error" };
      }
    } catch (error) {
      console.error(`[${this.agent.label}] ❌ Exception:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async closePosition(pair, side) {
    const payload = {
      service: "perp_trade",
      action: "close",
      params: { pair, side }
    };

    console.log(`[${this.agent.label}] Closing ${side.toUpperCase()} ${pair}...`);

    try {
      const response = await fetch(`${API_BASE}/job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });

      const data = await response.json();
      
      if (data.ok) {
        console.log(`[${this.agent.label}] ✅ Position closed`);
        return { success: true, data };
      } else {
        console.error(`[${this.agent.label}] ❌ Failed:`, data.error || data);
        return { success: false, error: data.error || "Unknown error" };
      }
    } catch (error) {
      console.error(`[${this.agent.label}] ❌ Exception:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async modifyPosition({ pair, side, leverage, takeProfit, stopLoss }) {
    const payload = {
      service: "perp_modify",
      params: {
        pair,
        side,
        ...(leverage && { leverage }),
        ...(takeProfit && { takeProfit }),
        ...(stopLoss && { stopLoss })
      }
    };

    console.log(`[${this.agent.label}] Modifying ${side.toUpperCase()} ${pair}...`);

    try {
      const response = await fetch(`${API_BASE}/job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });

      const data = await response.json();
      
      if (data.ok) {
        console.log(`[${this.agent.label}] ✅ Position modified`);
        return { success: true, data };
      } else {
        console.error(`[${this.agent.label}] ❌ Failed:`, data.error || data);
        return { success: false, error: data.error || "Unknown error" };
      }
    } catch (error) {
      console.error(`[${this.agent.label}] ❌ Exception:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getPositions() {
    try {
      const response = await fetch(`${POSITIONS_API}/${this.walletAddress}/positions`, {
        timeout: 10000
      });
      const data = await response.json();
      
      if (data.data) {
        return {
          success: true,
          positions: data.data
        };
      }
      return { success: false, error: "No position data" };
    } catch (error) {
      console.error(`[${this.agent.label}] Failed to fetch positions:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async executeWithRetry(tradeFunction, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await tradeFunction();
        
        if (result.success) {
          return result;
        }
        
        if (attempt < maxRetries) {
          const delay = 2000 * attempt;
          console.log(`[${this.agent.label}] Retry ${attempt}/${maxRetries} in ${delay / 1000}s...`);
          await new Promise(r => setTimeout(r, delay));
        }
      } catch (err) {
        console.error(`[${this.agent.label}] Attempt ${attempt} failed:`, err.message);
        
        if (attempt === maxRetries) {
          return { success: false, error: err.message };
        }
      }
    }
    
    return { success: false, error: "Failed after max retries" };
  }
}
