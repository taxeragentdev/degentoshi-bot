# Deployment Guide

## Production Deployment

### Prerequisites

- Node.js v18+ installed
- Stable internet connection
- Server or VPS (for 24/7 operation)

---

## Deployment Options

### Option 1: Local Machine

**Pros**: Easy, no additional costs
**Cons**: Not 24/7 unless computer always on

**Steps**:

1. Install dependencies
```bash
npm install
```

2. Configure `.env`
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Run
```bash
npm start
```

---

### Option 2: Linux VPS (Recommended)

**Services**: DigitalOcean, Linode, Vultr, AWS EC2

#### Setup Steps

1. **Create VPS**
   - OS: Ubuntu 22.04 LTS
   - RAM: 1GB minimum
   - Storage: 10GB minimum

2. **SSH into server**
```bash
ssh root@your-server-ip
```

3. **Install Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
```

4. **Clone/Upload project**
```bash
git clone your-repo-url
# OR
scp -r ./best-signalbot root@your-server:/opt/
```

5. **Install dependencies**
```bash
cd /opt/best-signalbot
npm install
```

6. **Configure environment**
```bash
cp .env.example .env
nano .env  # Edit settings
```

7. **Test run**
```bash
npm start
```

---

### Option 3: PM2 Process Manager (24/7 Operation)

PM2 keeps your bot running continuously with auto-restart.

#### Installation

```bash
npm install -g pm2
```

#### Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'crypto-signal-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

#### Start with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### PM2 Commands

```bash
pm2 status              # Check status
pm2 logs                # View logs
pm2 restart all         # Restart
pm2 stop all            # Stop
pm2 delete all          # Remove from PM2
```

---

### Option 4: Docker Deployment

#### Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

CMD ["node", "src/index.js"]
```

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  signal-bot:
    build: .
    restart: always
    volumes:
      - ./signals:/app/signals
      - ./logs:/app/logs
    env_file:
      - .env
    environment:
      - NODE_ENV=production
```

#### Run

```bash
docker-compose up -d
docker-compose logs -f
```

---

## Environment Configuration

### Production .env

```env
EXCHANGE=binance
SCAN_INTERVAL_MS=60000
MAX_OPEN_TRADES=3
RISK_PER_TRADE=0.01
CAPITAL=10000

# Production coin list (high liquidity only)
COINS=BTC/USDT,ETH/USDT,SOL/USDT,BNB/USDT,XRP/USDT,ADA/USDT,DOGE/USDT,AVAX/USDT,LINK/USDT,MATIC/USDT
```

---

## Monitoring

### Log Management

**View real-time logs**:
```bash
tail -f logs/combined.log
```

**Rotate logs** (add to cron):
```bash
# /etc/cron.daily/rotate-logs
#!/bin/bash
cd /opt/best-signalbot
find ./logs -name "*.log" -mtime +7 -delete
```

### Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- Custom healthcheck endpoint

### Alert System

Add to `scanner.js`:

```javascript
async sendAlert(message) {
  // Telegram
  await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: message
    })
  });
  
  // Or Discord webhook
  await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message })
  });
}
```

---

## Performance Optimization

### Reduce API Calls

```javascript
// config.js
scanInterval: 120000,  // 2 minutes instead of 1
coins: ['BTC/USDT', 'ETH/USDT']  // Monitor fewer coins
```

### Memory Management

```javascript
// Clear old candle data
if (candles.length > 500) {
  candles = candles.slice(-300);
}
```

### Rate Limiting

CCXT handles this automatically, but you can adjust:

```javascript
// dataFetcher.js
this.exchange = new ccxt.binance({
  enableRateLimit: true,
  rateLimit: 100  // ms between requests
});
```

---

## Security Best Practices

### Environment Variables

```bash
# Never commit .env to git
echo ".env" >> .gitignore

# Set proper permissions
chmod 600 .env
```

### API Keys (if needed)

```bash
# Read-only permissions only
# No withdrawal/transfer permissions
# IP whitelist if possible
```

### Updates

```bash
# Regular dependency updates
npm audit
npm update
```

---

## Backup Strategy

### Signals Backup

```bash
# Backup signals daily
#!/bin/bash
tar -czf signals-backup-$(date +%Y%m%d).tar.gz signals/
# Upload to S3/Dropbox/etc
```

### Configuration Backup

```bash
cp .env .env.backup
cp src/config.js config.backup.js
```

---

## Scaling Strategies

### Multiple Exchanges

Run separate instances for each exchange:

```bash
# Terminal 1
EXCHANGE=binance npm start

# Terminal 2
EXCHANGE=bybit npm start

# Terminal 3
EXCHANGE=okx npm start
```

### Distributed Scanning

Split coins across multiple instances:

```bash
# Instance 1: BTC, ETH, SOL
COINS=BTC/USDT,ETH/USDT,SOL/USDT npm start

# Instance 2: BNB, XRP, ADA
COINS=BNB/USDT,XRP/USDT,ADA/USDT npm start
```

---

## Integration with Execution System

### Webhook Integration

```javascript
// scanner.js
async outputSignal(signal) {
  console.log(JSON.stringify(signal, null, 2));
  this.saveSignalToFile(signal);
  
  // Send to Degen Claw
  try {
    const response = await fetch('https://degen-claw-api.com/signals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_TOKEN}`
      },
      body: JSON.stringify(signal)
    });
    
    if (response.ok) {
      console.log('✅ Signal sent to execution system');
    }
  } catch (error) {
    console.error('❌ Failed to send signal:', error);
  }
}
```

### Message Queue (Advanced)

Use Redis pub/sub:

```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async outputSignal(signal) {
  await redis.publish('trading-signals', JSON.stringify(signal));
}
```

---

## Troubleshooting Production Issues

### Bot Stops Unexpectedly

**Check logs**:
```bash
pm2 logs
tail -n 100 logs/err.log
```

**Common causes**:
- Memory leak → Restart: `pm2 restart all`
- Network timeout → Check internet
- Exchange API down → Wait for recovery

### No Signals Generated

**This is normal!** Quality > Quantity.

**If concerned**:
```bash
# Lower confidence threshold temporarily for testing
# config.js
confidence: {
  high: 5,    // Was 6
  medium: 3   // Was 4
}
```

### High Memory Usage

```bash
# Check usage
pm2 monit

# Set memory limit
pm2 start ecosystem.config.js --max-memory-restart 400M
```

### Network Errors

```bash
# Test exchange connectivity
curl https://api.binance.com/api/v3/ping

# DNS issues
echo "nameserver 8.8.8.8" > /etc/resolv.conf
```

---

## Maintenance Schedule

### Daily
- Check signal quality
- Review logs for errors
- Verify bot running

### Weekly
- Analyze signal performance
- Adjust parameters if needed
- Backup signals directory

### Monthly
- Update dependencies: `npm update`
- Review and optimize coin list
- Check server disk space
- Performance analysis

---

## Performance Metrics to Track

### Signal Metrics
- Total signals generated
- HIGH vs MEDIUM confidence ratio
- Signals per coin
- Average time between signals

### System Metrics
- Uptime percentage
- Average scan duration
- Memory usage
- API call success rate

### Create metrics script

```javascript
// scripts/metrics.js
import fs from 'fs';

const signals = fs.readdirSync('./signals')
  .filter(f => f.endsWith('.json'))
  .map(f => JSON.parse(fs.readFileSync(`./signals/${f}`)));

console.log('Total Signals:', signals.length);
console.log('LONG signals:', signals.filter(s => s.action === 'LONG').length);
console.log('SHORT signals:', signals.filter(s => s.action === 'SHORT').length);
console.log('HIGH confidence:', signals.filter(s => s.confidence === 'HIGH').length);
```

---

## Production Checklist

- [ ] Dependencies installed
- [ ] .env configured
- [ ] Tested locally first
- [ ] PM2 or Docker setup
- [ ] Logs directory created
- [ ] Monitoring in place
- [ ] Backup strategy implemented
- [ ] Alert system configured
- [ ] Integration with execution system tested
- [ ] Documentation reviewed

---

## Support and Updates

### Getting Help

1. Check logs first
2. Review documentation
3. Test with fewer coins
4. Verify exchange API status

### Updating the Bot

```bash
git pull origin main
npm install
pm2 restart all
```

---

## Cost Estimation

### VPS Hosting
- Basic VPS: $5-10/month
- Medium VPS: $15-20/month

### Total Monthly Cost
- VPS: $10
- Domain (optional): $1
- Monitoring (optional): $0-5
- **Total**: ~$10-15/month

---

Ready for production! 🚀

```bash
npm install
pm2 start ecosystem.config.js
pm2 save
```
