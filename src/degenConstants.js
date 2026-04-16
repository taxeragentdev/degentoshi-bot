/**
 * Degen Claw / Virtuals ACP — sağlayıcı cüzdan (join / eski perp job yolu).
 * v2: gerçek emirler dgclaw-skill gibi doğrudan Hyperliquid API cüzdanıyla da yapılabilir
 * (agent başına HL_{ALIAS}_API_WALLET_KEY + HL_{ALIAS}_MASTER_ADDRESS). Ayrıntı: docs/DEGEN_CLAW_V2.md
 * @see https://degen.virtuals.io/
 */

/** Degen Claw sağlayıcı cüzdanı (job gövdesinde zorunlu) */
export const DEGEN_CLAW_PROVIDER = '0xd478a8B40372db16cA8045F28C6FE07228F3781A';

/**
 * Güncel ACP tabanı (eski api.agdp.io/degen-acp yerine).
 * Override: DEGEN_ACP_API_URL veya ACP_API_URL
 */
export const DEFAULT_ACP_BASE_URL = 'https://claw-api.virtuals.io';
