# Triển khai lên VPS

Hai phần deploy riêng:

- **Website** (file tĩnh) → **Cloudflare Pages**.
- **API** → VPS: **Caddy** (HTTPS tự động) → **api** (Node + Pikafish) → **PostgreSQL**, chạy bằng Docker Compose, chỉ Caddy mở cổng ra ngoài.

## 1. Chuẩn bị

- VPS **x86-64** (bản Pikafish dùng ở đây chỉ có binary Linux x86-64), Ubuntu 22.04+ hoặc Debian 12, **tối thiểu 2 vCPU / 2 GB RAM** (khuyên 4 GB). Mỗi process Pikafish tốn ~100 MB RAM và một lõi CPU khi đang tính.
- Cài Docker + plugin compose. Mở cổng **80, 443 (TCP+UDP)**.
- Chọn VPS gần người chơi (ví dụ Singapore nếu người chơi ở Việt Nam): độ trễ quan trọng với game online.
- Một **tên miền của bạn**, dùng hai host trên cùng domain:
  - `app.example.com` → website (Cloudflare Pages)
  - `api.example.com` → API (VPS), bản ghi **A** trỏ về IP của VPS, tạo trước khi chạy để Caddy xin được chứng chỉ.

> **Vì sao phải cùng domain:** đăng nhập và nhận diện khách dùng cookie do API đặt. Trình duyệt chỉ gửi chúng kèm request khi website và API cùng *registrable domain*. Nếu để website ở `xxx.pages.dev` thì cookie bị coi là cross-site và đăng nhập sẽ hỏng. Vì vậy phải gắn custom domain cho Pages.

## 2. Tạo Google OAuth Client ID (cho nút đăng nhập)

1. [Google Cloud Console](https://console.cloud.google.com/) → chọn/tạo project → **APIs & Services → OAuth consent screen**: loại *External*, điền tên app và email, **Publish app** (nếu để Testing thì chỉ tài khoản test đăng nhập được).
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. **Authorized JavaScript origins**: thêm origin của **website** `https://app.example.com` (không phải của API), và `http://localhost:5173` nếu muốn thử khi dev. **Không cần** Authorized redirect URI vì app dùng luồng popup của Google Identity Services.
4. Copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`) vào `.env`.

Bỏ trống `GOOGLE_CLIENT_ID` thì nút đăng nhập sẽ ẩn; chơi với máy và chơi online vẫn bình thường.

## 3. Triển khai

### 3a. API trên VPS

```bash
git clone <repo> xiangqi && cd xiangqi        # hoặc rsync mã nguồn lên VPS
cp .env.example .env
openssl rand -hex 24                          # dán vào POSTGRES_PASSWORD
nano .env                                     # điền API_DOMAIN, APP_ORIGIN, POSTGRES_PASSWORD, GOOGLE_CLIENT_ID

docker compose up -d --build
docker compose logs -f api                    # đợi "Server listening"
curl https://api.example.com/api/health       # {"status":"ok"}
```

Build trên máy Apple Silicon thì thêm `--platform linux/amd64` (hoặc build thẳng trên VPS). Migration database chạy tự động khi `api` khởi động.

### 3b. Website trên Cloudflare Pages

1. Đẩy repo lên GitHub/GitLab. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**, chọn repo.
2. Cấu hình build:
   - **Build command:** `npm ci && npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** để trống (gốc repo)
3. **Environment variables** (Production và Preview):
   - `VITE_API_URL` = `https://api.example.com`
   - `NODE_VERSION` = `22`
4. Deploy xong, vào **Custom domains** của project, thêm `app.example.com`.

Lệnh build cũng sinh file `dist/_headers` (header bảo mật và CSP, có chứa origin của API từ `VITE_API_URL`). Đổi `VITE_API_URL` thì phải build lại.

Kiểm tra: mở `https://app.example.com`, chơi với máy một ván, thử đăng nhập, rồi tạo phòng online trên hai trình duyệt/tab ẩn danh.

## 4. Vận hành

| Việc | Lệnh |
|---|---|
| Cập nhật API | `git pull && docker compose up -d --build` |
| Cập nhật website | push lên git, Cloudflare Pages tự build lại |
| Xem log | `docker compose logs -f api` |
| Backup | `docker compose exec -T db pg_dump -U xiangqi xiangqi \| gzip > backup-$(date +%F).sql.gz` (đặt vào cron, và chép ra ngoài VPS) |
| Khôi phục | `gunzip -c backup.sql.gz \| docker compose exec -T db psql -U xiangqi xiangqi` |

**Lưu ý khi cập nhật:** các ván đang chơi lưu trong RAM của `api`, nên khởi động lại sẽ làm mất những ván đó (ván đã kết thúc thì đã lưu vào DB). Nên deploy vào giờ ít người chơi. Hiện chỉ chạy **một** instance `api`; muốn chạy nhiều instance phải chuyển trạng thái phòng sang Redis hoặc tương tự.

**Chỉnh tải engine:** `ENGINE_POOL_SIZE × ENGINE_THREADS` nên ≤ số vCPU. Khi quá tải, API trả 503 và client tự chuyển sang minimax cục bộ.

## 5. Bảo mật: việc nên làm sau khi chạy

- Mở site, đăng nhập thử, chơi một ván online với tab ẩn danh, và **xem console trình duyệt**. Header CSP đang ở chế độ `Content-Security-Policy-Report-Only` (sinh từ `scripts/headers.mjs`). Nếu không có cảnh báo vi phạm, đổi tên header thành `Content-Security-Policy` trong file đó rồi deploy lại website.
- Bật tường lửa chỉ cho phép 22, 80, 443. Tắt đăng nhập SSH bằng mật khẩu.
- Giữ `.env` ngoài git (đã nằm trong `.gitignore`).

## 6. Giấy phép

Pikafish là GPL-3.0. File mạng `pikafish.nnue` **cấm dùng thương mại nếu chưa được phép**: nếu dự định kiếm tiền từ dịch vụ (quảng cáo, thu phí), cần xin phép tác giả hoặc đổi sang mạng CC0 của Fairy-Stockfish.
