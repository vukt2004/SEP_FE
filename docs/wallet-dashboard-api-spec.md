# Wallet Dashboard API & Filters (Current Implementation)

Tai lieu nay mo ta chinh xac trang wallet hien tai dang goi API nao, filter nhu the nao, va tham so request/response ra sao.

## 1) Files tham chieu

- FE page: `SEP_FE/src/portals/learner/pages/WalletPageClean.tsx`
- FE API client: `SEP_FE/src/services/api/learner/orbitcoin.api.ts`
- Route hien tai: `/app/wallet` (dang tro toi `WalletPageClean`)

---

## 2) API duoc goi tren Wallet page

Wallet page dang goi song song 4 API moi lan thay doi `role`, `page`, `filters`:

1. `GET /api/learner/orbitcoin/balance`
2. `GET /api/learner/orbitcoin/transactions`
3. `GET /api/learner/orbitcoin/dashboard/summary`
4. `GET /api/learner/orbitcoin/dashboard/games`

> Luu y: API `dashboard/trend` da co trong client nhung **chua duoc goi** trong `WalletPageClean.tsx`.

---

## 3) Chi tiet tung API

## 3.1 Balance

- **Method/URL**: `GET /api/learner/orbitcoin/balance`
- **Function**: `orbitCoinApi.getBalance()`
- **Query params**: khong co

### Response shape

```ts
ApiResult<{
  balance: number;
}>
```

---

## 3.2 Transaction history (co filter)

- **Method/URL**: `GET /api/learner/orbitcoin/transactions`
- **Function**: `orbitCoinApi.getTransactionHistory(params)`

### Query params support (day du theo client)

| Param | Type | Mo ta |
|---|---|---|
| `pageNumber` | `number` | Trang hien tai |
| `pageSize` | `number` | So ban ghi/trang |
| `direction` | `"In" \| "Out"` | Loc tien vao/ra |
| `categories` | `number[]` | Loc theo transaction type code |
| `relatedEntityType` | `string` | Loc theo loai entity lien quan |
| `relatedEntityId` | `string` | Loc theo id entity lien quan |
| `from` | `string` | Ngay bat dau (dang truyen dang `YYYY-MM-DD`) |
| `to` | `string` | Ngay ket thuc (dang truyen dang `YYYY-MM-DD`) |
| `minAmount` | `number` | Muc tien toi thieu |
| `maxAmount` | `number` | Muc tien toi da |
| `status` | `string` | Trang thai giao dich/payment |

### Param dang duoc WalletPageClean su dung thuc te

`WalletPageClean` hien dang gui:

- `pageNumber`
- `pageSize` (co dinh `12`)
- `from`
- `to`
- `direction` (neu co chon)
- `categories` (neu co chon)

**Chua gui**: `relatedEntityType`, `relatedEntityId`, `minAmount`, `maxAmount`, `status`.

### Category mapping hien tai trong UI -> `categories[]`

| UI category | Gia tri gui len |
|---|---|
| `Topup` | `[0]` (`CoinTransactionTypeEnum.Credit`) |
| `BuyPackage` | `[3]` |
| `BuyGame` | `[2]` |
| `GameRevenue` | `[1]` |

### Response shape

```ts
ApiResult<{
  items: OrbitCoinTransaction[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}>
```

Trong do `OrbitCoinTransaction` co cac field chinh:

- `id`, `amount`, `transactionType`, `direction`, `category`
- `relatedEntityType`, `relatedEntityId`
- `paymentRecordId`, `gameId`, `packageId`
- `grossAmount`, `netAmount`, `feeAmount`, `status`
- `balanceAfter`, `note`, `createdAt`
- `amountVND` / `amountVnd`

---

## 3.3 Dashboard summary

- **Method/URL**: `GET /api/learner/orbitcoin/dashboard/summary`
- **Function**: `orbitCoinApi.getDashboardSummary(params)`

### Query params

| Param | Type | Mo ta |
|---|---|---|
| `role` | `"Buyer" \| "Creator"` | Kieu dashboard |
| `from` | `string` | Start date |
| `to` | `string` | End date |

### Response shape

```ts
ApiResult<{
  role: "Buyer" | "Creator";
  currentBalance: number;
  totalIn: number;
  totalOut: number;
  netFlow: number;
  grossRevenue: number;
  platformFee: number;
  netRevenue: number;
  uniqueBuyers: number;
  unitsSold: number;
}>
```

---

## 3.4 Dashboard games (creator breakdown)

- **Method/URL**: `GET /api/learner/orbitcoin/dashboard/games`
- **Function**: `orbitCoinApi.getDashboardGames(params)`

### Query params

| Param | Type | Mo ta |
|---|---|---|
| `from` | `string` | Start date |
| `to` | `string` | End date |
| `pageNumber` | `number` | Trang |
| `pageSize` | `number` | So dong/trang |

### Param dang duoc WalletPageClean su dung

- `from`, `to`
- `pageNumber = 1`
- `pageSize = 5`

### Response shape

```ts
ApiResult<{
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  items: Array<{
    gameId: string;
    gameTitle: string;
    buyersCount: number;
    ordersCount: number;
    gross: number;
    fee: number;
    net: number;
  }>;
}>
```

---

## 4) API co san nhung chua duoc dung tren WalletPageClean

## 4.1 Dashboard trend

- **Method/URL**: `GET /api/learner/orbitcoin/dashboard/trend`
- **Function**: `orbitCoinApi.getDashboardTrend(params)`

Params:

- `role: "Buyer" | "Creator"`
- `bucket: "Day" | "Week" | "Month"`
- `from?: string`
- `to?: string`

Response:

- `role`, `bucket`
- `items[]`: `period`, `inflow`, `outflow`, `net`, `grossRevenue`, `platformFee`, `netRevenue`

---

## 4.2 Deposit-related APIs

Co trong client nhung khong duoc goi o `WalletPageClean` hien tai:

- `POST /api/learner/orbitcoin/deposit/confirm` (`confirmDeposit`)
- `GET /api/learner/orbitcoin/deposit/order` (`getDepositOrder`)

---

## 5) Filter behavior hien tai tren UI wallet

## 5.1 Default filter state

- `from = now - 30 days`
- `to = now`
- `direction = ""` (tat ca)
- `category = ""` (tat ca)
- `page = 1`

## 5.2 Khi user doi filter

- Rebuild query object
- Goi lai 4 API song song (balance, transactions, summary, games)
- Cap nhat UI:
  - metrics strip (balance/in/out/net)
  - transactions list + pagination
  - creator games panel (neu tab Creator)

---

## 6) Ghi chu ky thuat

- Date dang truyen len API o dang chuoi tu input date (`YYYY-MM-DD`).
- `CoinTransactionTypeEnum` trong client hien khai bao:
  - `Credit = 0`
  - `Debit = 1`
- Nhung category khac (`2,3,4,...`) dang duoc gui truc tiep theo mapping local.

