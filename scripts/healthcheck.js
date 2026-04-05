import { DataFetcher } from '../src/dataFetcher.js';

console.log('🏥 System Health Check\n');
console.log('═'.repeat(60));

const checks = {
  nodeVersion: false,
  dependencies: false,
  exchangeConnection: false,
  dataFetch: false
};

console.log('1️⃣  Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
checks.nodeVersion = majorVersion >= 18;
console.log(`   Node.js ${nodeVersion} ${checks.nodeVersion ? '✅' : '❌ (need v18+)'}`);

console.log('\n2️⃣  Checking dependencies...');
try {
  await import('ccxt');
  await import('dotenv');
  checks.dependencies = true;
  console.log('   Dependencies installed ✅');
} catch (error) {
  console.log('   Dependencies missing ❌');
  console.log('   Run: npm install');
}

console.log('\n3️⃣  Testing exchange connection...');
try {
  const fetcher = new DataFetcher();
  await fetcher.exchange.loadMarkets();
  checks.exchangeConnection = true;
  console.log('   Exchange connection ✅');
} catch (error) {
  console.log('   Exchange connection ❌');
  console.log(`   Error: ${error.message}`);
}

console.log('\n4️⃣  Testing data fetch...');
try {
  const fetcher = new DataFetcher();
  const data = await fetcher.fetchOHLCV('BTC/USDT', '1h', 10);
  checks.dataFetch = data && data.length > 0;
  console.log(`   Data fetch ${checks.dataFetch ? '✅' : '❌'}`);
  if (checks.dataFetch) {
    console.log(`   Latest BTC price: $${data[data.length - 1].close.toFixed(2)}`);
  }
} catch (error) {
  console.log('   Data fetch ❌');
  console.log(`   Error: ${error.message}`);
}

console.log('\n' + '═'.repeat(60));
console.log('📊 Health Check Summary\n');

const allPassed = Object.values(checks).every(v => v);

if (allPassed) {
  console.log('✅ All checks passed! System is ready.\n');
  console.log('Start the bot with: npm start\n');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please fix the issues above.\n');
  
  if (!checks.nodeVersion) {
    console.log('→ Upgrade Node.js to v18 or higher');
  }
  if (!checks.dependencies) {
    console.log('→ Run: npm install');
  }
  if (!checks.exchangeConnection) {
    console.log('→ Check internet connection');
    console.log('→ Verify exchange API is accessible');
  }
  if (!checks.dataFetch) {
    console.log('→ Verify exchange API is working');
  }
  
  console.log();
  process.exit(1);
}
