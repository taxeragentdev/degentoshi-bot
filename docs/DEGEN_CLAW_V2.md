# Degen Claw v2 — Kurulum ve bu botun uyumu

Resmî akış [Virtual-Protocol/dgclaw-skill](https://github.com/Virtual-Protocol/dgclaw-skill) ve [SKILL.md](https://github.com/Virtual-Protocol/dgclaw-skill/blob/main/SKILL.md) ile aynıdır. Özet: **leaderboard / forum** için ACP; **gerçek işlemler** artık **Hyperliquid API cüzdanı** ile doğrudan gider (ara Degen Claw “işlem aç” job’u yok).

## Bu repoda ne değişti?

- **ACP yolu (varsayılan):** `HL_*` tanımlı değilse eskisi gibi `POST …/acp/jobs` ile `perp_trade` / `perp_modify` kullanılır (`x-api-key` = `degenClawAgents.js` içindeki anahtar).
- **v2 doğrudan HL yolu:** Agent alias’ına göre ortam değişkenleri doluysa, [dgclaw `scripts/trade.ts`](https://github.com/Virtual-Protocol/dgclaw-skill/blob/main/scripts/trade.ts) ile aynı mantık (`@nktkas/hyperliquid` + `viem`) devreye girer: market / limit açılış, TP/SL tetik emirleri, kapatma, modify (kaldıraç + TP/SL yenileme).

## Adım adım (Virtuals “Setup Deep Dive” ile hizalı)

1. **Agent oluştur** — [app.virtuals.io/acp/new](https://app.virtuals.io/acp/new). Cüzdan Base üzerinde; gerekirse `acp token launch` (leaderboard için token şartı SKILL’de anlatılıyor).

2. **ACP CLI** — [acp-cli](https://github.com/Virtual-Protocol/acp-cli): `git clone` → `npm install` → `acp configure` → `acp agent create` veya `acp agent use <id>` → `acp agent add-signer`.

3. **dgclaw-skill** — repoyu klonla, `npm install`, `./dgclaw.sh join` (veya `dgclaw.sh --env ./agent.env join`). Bu adım `DGCLAW_API_KEY` üretir (forum / leaderboard HTTP için).

4. **Unified account** — `npx tsx scripts/activate-unified.ts` (veya `./dgclaw.sh activate-unified-account` eski isim). Spot + perp birleşik marjin.

5. **API wallet** — `npx tsx scripts/add-api-wallet.ts`. Çıktıdaki **API private key** ve **master (agent) cüzdan adresi** bu sinyal botunda kullanılır.

6. **USDC** — Base’e gönder → SKILL’deki `perp_deposit` ACP job + `fund` ile Hyperliquid’e geçiş → `trade.ts balance` ile kontrol.

7. **Trade CLI (referans)** — Örnekler SKILL ile aynı:
   - `npx tsx scripts/trade.ts open --pair ETH --side long --size 500 --leverage 5 --tp 3800 --sl 3150`
   - `npx tsx scripts/trade.ts open --pair BTC --side short --size 1000 --leverage 3 --type limit --limit-price 105000`
   - `npx tsx scripts/trade.ts close --pair ETH`
   - `npx tsx scripts/trade.ts modify --pair ETH --leverage 10 --sl 3200 --tp 4000`

## Bu bot için ortam değişkenleri (çoklu agent)

Alias **büyük harf + alt çizgi** ile env adı üretilir (`redkid` → `REDKID`):

| Değişken | Açıklama |
|----------|-----------|
| `HL_<ALIAS>_API_WALLET_KEY` | `add-api-wallet` sonrası private key (`0x…` veya `…`) |
| `HL_<ALIAS>_MASTER_ADDRESS` | ACP agent ana cüzdanı (`acp agent whoami` / `HL_MASTER_ADDRESS` skill’deki gibi) |

İkisi de tanımlıysa **o agent** için otomatik `/open`, scanner auto-trade, bakiye ve pozisyonlar **doğrudan Hyperliquid** üzerinden çalışır. Tanımlı değilse eski **ACP** yolu kullanılır.

Örnek:

```env
HL_RAICHU_API_WALLET_KEY=0x...
HL_RAICHU_MASTER_ADDRESS=0x...
HL_VENOM_API_WALLET_KEY=0x...
HL_VENOM_MASTER_ADDRESS=0x...
```

`HYPERLIQUID_API_URL` zaten market verisi için kullanılıyor; HL emirleri de aynı host’a gider (mainnet önerilir).

## Güvenlik

- `HL_*_API_WALLET_KEY` asla repoya commit etmeyin; sadece Railway / sunucu env veya yerel `.env`.
- API cüzdanı çekim yapamaz; yine de anahtarı koruyun.

## HIP-3 sembolleri

`xyz:TSLA` gibi çiftler `pairForAcp` / pozisyon eşlemesinde bozulmadan korunur.
