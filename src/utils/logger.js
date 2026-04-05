export class Logger {
  static log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = this.getPrefix(type);
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }
  
  static info(message) {
    this.log(message, 'info');
  }
  
  static success(message) {
    this.log(message, 'success');
  }
  
  static warning(message) {
    this.log(message, 'warning');
  }
  
  static error(message) {
    this.log(message, 'error');
  }
  
  static signal(signal) {
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 NEW SIGNAL');
    console.log('═'.repeat(80));
    console.log(JSON.stringify(signal, null, 2));
    console.log('═'.repeat(80) + '\n');
  }
  
  static getPrefix(type) {
    const prefixes = {
      info: 'ℹ️ ',
      success: '✅',
      warning: '⚠️ ',
      error: '❌'
    };
    return prefixes[type] || '';
  }
}
