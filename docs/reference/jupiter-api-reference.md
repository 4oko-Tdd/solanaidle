# Jupiter API Reference — Solana Idle Integration

> Saved for hackathon reference. Source: https://dev.jup.ag/api-reference

## Base URL
```
https://api.jup.ag
```

Free tier (no key): `https://lite-api.jup.ag` (~60 req/min)
Pro/Ultra: get key at `portal.jup.ag`

---

## 1. Ultra Swap API (Primary — no RPC needed)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /ultra/v1/order` | GET | Get unsigned swap tx. Params: `inputMint`, `outputMint`, `amount`, `taker` |
| `POST /ultra/v1/execute` | POST | Submit signed tx. Returns result + `requestId` |
| `GET /ultra/v1/search` | GET | Token lookup by symbol/name/mint |
| `GET /ultra/v1/holdings/{address}` | GET | Wallet holdings, frozen status, SOL balance |
| `GET /ultra/v1/shield` | GET | Security warnings (freeze/mint authority, low organic) |

- Gasless for trades >~$10 when user has <0.01 SOL
- Fee: 5–10 bps per swap
- MEV-protected
- Sub-second landing

## 2. Metis Swap API (Advanced — needs RPC)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /swap/v1/quote` | GET | Route + price quotes |
| `POST /swap/v1/swap` | POST | Build swap tx from quote |
| `GET /swap/v1/swap-instructions` | GET | Raw instructions for custom tx composition |
| `GET /swap/v1/program-id-to-label` | GET | Map program IDs to DEX names |

- Supports CPI (compose swaps in larger tx)
- ExactOut mode for fixed-price payments
- `platformFeeBps` for integrator revenue

## 3. Token API V2

```
GET /tokens/v2/search?query={symbol|mint|name}
```

Returns: name, symbol, icon, decimals, organic score, holder count, tags (Verified, LST, etc.)

## 4. Price API V3

```
GET /price/v3?ids={comma-separated-mints}
```

- Up to 50 mints per request
- USD prices calibrated against SOL/USDC via Pyth oracles
- Returns `null` for suspicious/illiquid tokens

## 5. Trigger API (Limit Orders)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /trigger/v1/createOrder` | POST | Build limit order tx |
| `POST /trigger/v1/execute` | POST | Execute filled order |
| `POST /trigger/v1/cancelOrder` | POST | Cancel + return tokens |
| `GET /trigger/v1/getTriggerOrders` | GET | Query orders by wallet/status |

## 6. Recurring API (DCA)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /recurring/v1/createOrder` | POST | Set up DCA schedule |
| `POST /recurring/v1/execute` | POST | Trigger next cycle |
| `POST /recurring/v1/cancelOrder` | POST | Cancel + return remaining |
| `GET /recurring/v1/getRecurringOrders` | GET | Active/historical orders |

## 7. Send API (Mobile-first)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /send/v1/craft-send` | POST | Build Send tx with invite code |
| `POST /send/v1/craft-clawback` | POST | Reclaim unclaimed tokens |
| `GET /send/v1/pending-invites` | GET | List pending invites |
| `GET /send/v1/invite-history` | GET | Send history |

Uses 12-char base58 invite code. Recipient claims via Jupiter Mobile.

## 8. Prediction Market API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /events` | GET | List events |
| `GET /markets/{marketId}` | GET | Market detail |
| `GET /orderbook/{marketId}` | GET | Bid/ask depth |
| `POST /orders` | POST | Buy YES/NO contracts |
| `GET /positions` | GET | User holdings + P&L |
| `POST /positions/{id}/claim` | POST | Claim winnings |
| `GET /leaderboards` | GET | Rankings by PnL/volume |

## 9. Portfolio API (Beta)

```
GET /portfolio/v1/positions?wallet={address}
```

Returns all DeFi positions: balances, staked JUP, limit orders, DCA orders, LP positions.

## 10. Lend API (Beta)

```
POST /lend/v1/earn/deposit
```

Deposit/earn yield. Up to 95% LTV for borrowing.

## 11. Studio API (Beta)

Token creation with bonding curves, LP fee management, vesting.
