/**
 * Perp sembol normalizasyonu — ACP ve doğrudan Hyperliquid ile uyumlu.
 * HIP-3: `xyz:TSLA` biçimi korunur (sadece baz coin değil).
 */

export function pairForAcp(pairOrCoin) {
  const raw = String(pairOrCoin).trim();
  if (/^xyz:/i.test(raw)) {
    const asset = raw.slice(4).split('/')[0].split(':')[0].toUpperCase();
    return `xyz:${asset}`;
  }

  let p = raw.toUpperCase();
  if (p.includes('/') || p.includes(':')) {
    p = p.split('/')[0].split(':')[0];
  }

  const hi = p.indexOf('-');
  if (hi > 0) {
    const suf = p.slice(hi + 1);
    if (suf === 'USDC' || suf === 'USD' || suf === 'PERP' || suf === 'USDT') {
      p = p.slice(0, hi);
    }
  }

  if (p.endsWith('USDC') && p.length > 4 && !p.includes('/')) {
    p = p.slice(0, -4);
  }

  return p.split('/')[0].split(':')[0];
}

export function baseCoinFromPair(pair) {
  if (!pair) return '';
  const s = String(pair).toUpperCase();
  if (s.startsWith('XYZ:')) return s;
  return s.split('/')[0].split(':')[0];
}
