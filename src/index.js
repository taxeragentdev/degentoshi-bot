import dotenv from 'dotenv';
import { Scanner } from './scanner.js';

dotenv.config();

async function main() {
  console.clear();
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    CRYPTO TRADING SIGNAL BOT                                  ║');
  console.log('║                    Perpetual Futures Edition                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log();
  
  const scanner = new Scanner();
  
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Shutting down gracefully...');
    scanner.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Shutting down gracefully...');
    scanner.stop();
    process.exit(0);
  });
  
  process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
  });
  
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    scanner.stop();
    process.exit(1);
  });
  
  try {
    await scanner.start();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
