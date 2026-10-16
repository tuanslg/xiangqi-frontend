# Cờ Tướng

Chơi cờ tướng trên web: đấu với máy (Pikafish), chơi online với người khác, đăng nhập Google (tùy chọn).

## Cấu trúc

```
src/                  Client: React + Vite + Tailwind + Zustand
packages/shared/      Luật cờ, FEN/UCI, giao thức WebSocket (dùng chung client + server)
packages/server/      Fastify: API cờ máy (Pikafish), đăng nhập Google, phòng chơi online (WebSocket), Postgres
deploy/               Caddyfile cho API
scripts/              Sinh file _headers (CSP) cho Cloudflare Pages
Dockerfile, docker-compose.yml, DEPLOY.md
```

Cách hoạt động:

- **Triển khai:** website là file tĩnh (Cloudflare Pages), API chạy trên VPS; `VITE_API_URL` trỏ website tới API. Để trống thì cùng origin (dev dùng proxy của Vite).
- **Chơi với máy:** client gửi FEN + mức độ tới `POST /api/bestmove`; server chạy một pool process Pikafish (UCI). Nếu server không trả lời, client tự dùng minimax cục bộ (`packages/shared/src/ai.ts`).
- **Chơi online:** WebSocket `/ws`. Server là nguồn sự thật: kiểm tra nước đi, đồng hồ, chiếu dai/lặp nước, rớt mạng (90 giây để vào lại). Không cần đăng nhập, khách được nhận diện bằng cookie `gid`.
- **Đăng nhập:** Google Identity Services, server xác thực ID token + nonce, cấp session cookie `httpOnly`. Đăng nhập chỉ để lưu ván; mọi tính năng đều dùng được khi chưa đăng nhập.

## Chạy khi phát triển

Yêu cầu: Node 20+ (khuyên dùng 22), và PostgreSQL nếu muốn thử đăng nhập/lưu ván.

```bash
npm install
npm run engine:fetch        # tải Pikafish (kiểm tra checksum) vào packages/server/engine

npm run dev:server          # API trên :3001
npm run dev                 # client trên :5173, proxy /api và /ws sang :3001
```

Chỉ có server + Pikafish là đủ để chơi với máy và chơi online. Muốn bật đăng nhập và lưu ván, đặt biến môi trường trước khi chạy server:

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/xiangqi \
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com \
ALLOWED_ORIGINS=http://localhost:5173 \
npm run dev:server
```

Các biến môi trường khác nằm trong `packages/server/src/config.ts` (cổng, kích thước pool engine, giới hạn kết nối...).

## Kiểm thử

```bash
npm test          # luật cờ, engine pool, API, online (mô phỏng), store client
npm run typecheck
npm run lint
```

Các test dùng Postgres chạy khi có `TEST_DATABASE_URL` (tên database **phải kết thúc bằng `_test`**, vì test xóa sạch schema):

```bash
TEST_DATABASE_URL=postgres://user@localhost:5432/xiangqi_test npm test
```

Test với Pikafish thật tự bỏ qua nếu chưa chạy `npm run engine:fetch`.

## Triển khai

Xem [DEPLOY.md](DEPLOY.md).

## Giấy phép các thành phần bên thứ ba

- **Pikafish** (GPL-3.0). Server chạy nó như một process riêng.
- **`pikafish.nnue`** (mạng đánh giá): **không được dùng cho mục đích thương mại nếu chưa được phép** (xem `NNUE-License.md` đi kèm). Nếu định kiếm tiền từ game, hãy xin phép tác giả hoặc đổi sang mạng CC0 của Fairy-Stockfish.
