# SEP_FE — React + TypeScript + Vite (Real-time với SignalR)

## Mục lục
- [1) Tổng quan](#1-tổng-quan)
- [2) Cấu trúc thư mục](#2-cấu-trúc-thư-mục-đúng-theo-repo)
- [3) Giải thích chức năng, mục đích, cách triển khai từng mục](#3-giải-thích-chức-năng-mục-đích-cách-triển-khai-từng-mục)
  - [3.1 `.husky/`](#31-husky)
  - [3.2 `src/`](#32-src)
    - [a) `src/app/`](#a-srcapp)
    - [b) `src/components/`](#b-srccomponents)
    - [c) `src/lib/`](#c-srclib)
    - [d) `src/pages/`](#d-srcpages)
      - [`src/pages/Home/index.tsx`](#srcpageshomeindextsx)
    - [e) `src/styles/global.css`](#e-srcstylesglobalcss)
    - [f) `src/main.tsx`](#f-srcmaintsx)
  - [3.3 `.env`](#33-env)
  - [3.4 ESLint / Prettier configs](#34-eslint--prettier-configs)
  - [3.5 `index.html`](#35-indexhtml)
  - [3.6 `package.json` / `package-lock.json`](#36-packagejson--package-lockjson)
  - [3.7 `tsconfig*.json`](#37-tsconfigjson-tsconfigappjson-tsconfignodejson)
  - [3.8 `vite.config.ts`](#38-viteconfigts)
- [4) Real-time với SignalR — cách dùng trong dự án](#4-real-time-với-signalr--cách-dùng-trong-dự-án-khuyến-nghị)
- [5) Chạy dự án khi clone từ GitHub](#5-chạy-dự-án-khi-clone-từ-github)
  - [5.1 Yêu cầu](#51-yêu-cầu)
  - [5.2 Cài đặt & chạy local](#52-cài-đặt--chạy-local)
- [6) Quy ước code](#6-quy-ước-code-khuyến-nghị)

---

## 1. Tổng quan
**SEP_FE** là frontend được dựng bằng **React + TypeScript + Vite**, tối ưu cho bài toán **Real-time event** qua **SignalR**.

### Mục tiêu
- **Nhanh**: Vite dev server, build tối ưu.
- **Dễ mở rộng**: cấu trúc thư mục rõ ràng, tách lớp UI / pages / tiện ích.
- **Ổn định cho real-time**: hướng tiếp cận theo kiểu “client realtime + batching + store” (SignalR).

---

## 2. Cấu trúc thư mục (đúng theo repo)
```text
SEP_FE
├─ .husky/
├─ node_modules/
├─ src/
│ ├─ app/
│ ├─ components/
│ ├─ lib/
│ ├─ pages/
│ │ └─ Home/
│ │ └─ index.tsx
│ ├─ styles/
│ │ └─ global.css
│ └─ main.tsx
├─ .env
├─ .eslintrc.cjs
├─ .gitignore
├─ .prettierignore
├─ .prettierrc
├─ eslint.config.js
├─ index.html
├─ package-lock.json
├─ package.json
├─ README.md
├─ tsconfig.app.json
├─ tsconfig.json
├─ tsconfig.node.json
└─ vite.config.ts
```

---

## 3. Giải thích chức năng, mục đích, cách triển khai từng mục

### 3.1 `.husky/`
**Mục đích**
- Tự động chạy kiểm tra chất lượng code trước khi commit/push.

**Chức năng**
- Chứa các git hooks (thường gặp: `pre-commit`, `commit-msg`).

**Triển khai**
- Hook `pre-commit` thường chạy `lint`/`format` hoặc `lint-staged` để đảm bảo code sạch trước khi lên repo.

---

### 3.2 `src/`
Thư mục chứa toàn bộ mã nguồn ứng dụng.

#### a. `src/app/`
**Mục đích**
- Chứa “khung ứng dụng”: router, layout, cấu hình cấp app.

**Chức năng**
- Điểm tập trung cho các thứ mang tính “app-level” như:
  - Router (React Router)
  - Layout chính
  - Providers (State, Query, Theme, i18n…) nếu có

**Triển khai**
- Tách phần “điều hướng + khung app” ra khỏi `pages/` để dễ scale khi nhiều route.

---

#### b. `src/components/`
**Mục đích**
- Nơi đặt các **component tái sử dụng** (button, modal, table, form control…).

**Chức năng**
- Tối ưu reuse, giảm lặp code UI.

**Triển khai**
- Chỉ chứa component có thể dùng lại ở nhiều pages/features.
- Mỗi component nên có thư mục riêng nếu phức tạp:
  - `components/Button/`
  - `components/Modal/`
  - …

---

#### c. `src/lib/`
**Mục đích**
- Chứa **hạ tầng dùng chung** và logic “không gắn chặt UI”.

**Chức năng (khuyến nghị cho dự án real-time SignalR)**
- `lib/realtime/`: SignalR client, reconnect policy, event binding, batching.
- `lib/http/`: axios/fetch wrapper (nếu có).
- `lib/utils/`: helpers (format date, debounce, v.v.).
- `lib/types/`: type chung, schema validation (zod) nếu dùng.

**Triển khai**
- Với real-time: ưu tiên xây `SignalRClient` + cơ chế:
  - `connect/start/stop`
  - `subscribe/unsubscribe`
  - `batch events` (requestAnimationFrame hoặc time-window)
  - `dedupe/order` theo `seq/id` (nếu backend có)

---

#### d. `src/pages/`
**Mục đích**
- Các trang (route-level). Mỗi folder là một page.

**Triển khai hiện có**
- `pages/Home/index.tsx` là trang Home.

##### `src/pages/Home/index.tsx`
**Mục đích**
- Trang khởi điểm/điểm test ban đầu.

**Chức năng**
- Render UI của trang Home.
- Nơi bạn có thể gắn luồng real-time để verify event hiển thị.

**Triển khai**
- Nhận data qua hooks/store/services.
- Không đặt logic “hạ tầng” (SignalR connect) trực tiếp ở đây nếu dự án sẽ lớn; nên để ở `lib/` + app-level binding.

---

#### e. `src/styles/global.css`
**Mục đích**
- CSS global cho toàn app.

**Chức năng**
- Reset/normalize, font, theme variables, base styles.

**Triển khai**
- Import 1 lần tại `main.tsx` để áp dụng toàn cục.

---

#### f. `src/main.tsx`
**Mục đích**
- Entry point của React app.

**Chức năng**
- Tạo React root và render App/Router.
- Import global styles.
- (Khuyến nghị) Gắn realtime binding ở cấp app (nếu kiến trúc yêu cầu).

**Triển khai**
- Nơi khởi tạo router/provider.
- Nếu cần chạy SignalR khi app start: đặt trong App-level effect (tránh start khi module import).

---

### 3.3 `.env`
**Mục đích**
- Cấu hình theo môi trường chạy (dev/staging/prod).

**Chức năng**
- Lưu endpoint như SignalR Hub URL, API base…

**Triển khai (Vite)**
- Biến môi trường dùng prefix `VITE_`, ví dụ:
  - `VITE_SIGNALR_URL=/hubs/events`
  - `VITE_API_BASE_URL=http://localhost:5000`

> Lưu ý: `.env` thường không commit nếu chứa secret. Nếu cần mẫu, tạo `.env.example`.

---

### 3.4 ESLint / Prettier configs
#### a. `.eslintrc.cjs` và/hoặc `eslint.config.js`
**Mục đích**
- Chuẩn hoá chất lượng code, bắt lỗi sớm.

**Chức năng**
- Rule cho TypeScript/React hooks, import order…

**Triển khai**
- Chạy qua script `npm run lint`.

#### b. `.prettierrc`, `.prettierignore`
**Mục đích**
- Format code đồng nhất toàn team.

**Triển khai**
- Chạy qua script `npm run format` (nếu có) hoặc tích hợp trong husky.

---

### 3.5 `index.html`
**Mục đích**
- HTML shell của Vite app.

**Chức năng**
- Chứa `<div id="root"></div>` để React mount.

---

### 3.6 `package.json` / `package-lock.json`
**Mục đích**
- Quản lý dependencies và scripts.

**Chức năng**
- Scripts tiêu chuẩn:
  - `dev`: chạy local
  - `build`: build production
  - `preview`: xem build
  - `lint`: kiểm tra lint

---

### 3.7 `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
**Mục đích**
- Cấu hình TypeScript.

**Chức năng**
- Tách cấu hình cho app runtime và tooling (Vite/Node config).

**Triển khai**
- `tsconfig.app.json`: dành cho source React.
- `tsconfig.node.json`: dành cho file config chạy trên Node (vite config).

---

### 3.8 `vite.config.ts`
**Mục đích**
- Cấu hình build/dev server của Vite.

**Chức năng (đặc biệt cho SignalR)**
- Proxy API/hub trong dev để tránh CORS và hỗ trợ WebSocket.

**Triển khai**
- Nên bật proxy cho hub SignalR (ví dụ `/hubs`), và `ws: true`.

---

## 4. Real-time với SignalR — cách dùng trong dự án (khuyến nghị)
Dự án nên triển khai theo 3 lớp:

1) **Transport (SignalR connection)**  
- Khởi tạo `HubConnection`, auto reconnect, keep-alive.

2) **Event routing + batching**  
- Nhận event liên tục -> batch theo frame/time-window -> đẩy vào store.

3) **UI subscribe theo slice**  
- UI chỉ đọc phần state cần thiết để giảm re-render.

> Nếu bạn muốn, mình có thể tạo sẵn module trong `src/lib/` đúng với cấu trúc hiện tại (SignalR client + batcher + store) để bạn chỉ việc gọi.

---

## 5. Chạy dự án khi clone từ GitHub

### 5.1 Yêu cầu
- Node.js (khuyến nghị LTS)
- npm (đi kèm Node)

### 5.2 Cài đặt & chạy local
```bash
git clone <YOUR_REPO_URL>
cd SEP_FE
npm install
```

## 6. Quy ước code
- Component tái sử dụng: src/components/
- Hạ tầng / logic dùng chung: src/lib/
- Page theo route: src/pages/<PageName>/index.tsx
- CSS global: src/styles/global.css