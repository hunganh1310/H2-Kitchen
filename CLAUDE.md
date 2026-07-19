# CLAUDE.md — Band Room F&B + Rental Ordering System

## 1. Tổng quan dự án

Hệ thống đặt đồ ăn nhanh, thức uống & **thuê thiết bị** nội bộ cho phòng tập nhạc. Khách (thành viên band, người thuê phòng) đặt món / thuê đồ qua web, admin (nhân viên quầy/quản lý) xử lý đơn và bật/tắt trạng thái bếp.

Sản phẩm chia làm 2 nhánh dùng chung luồng giỏ hàng/đơn/thanh toán:
- **F&B** (`kind=fnb`): **đồ chế biến** (`prepared` — mì, trà chanh, trà đào…) và **đồ đóng chai** (`bottled` — nước ngọt, trà đóng chai…). Đóng bếp chỉ chặn đồ chế biến.
- **Thuê đồ** (`kind=rental`): đàn guitar, bass, IEM… trên trang riêng `/renting`, admin tự phân nhóm (`category` chuỗi tự do). Không chịu ảnh hưởng đóng bếp, không áp mã giảm giá.

Quy mô: mỗi **ca tập** có tối đa ~10 người truy cập hệ thống để đặt đồ — đây là số lượng khách đồng thời, **không phải tài khoản cố định**. Khách hàng thay đổi liên tục theo từng ca tập/từng ngày, nên **không cần đăng ký/đăng nhập và không lưu thông tin cá nhân khách hàng lâu dài**. Chỉ **admin** (nhân viên trực) cần tài khoản — số lượng linh hoạt (vài đến ~10 người), tuỳ số người trực. Admin tự **đổi mật khẩu** được trong panel. Đây là hệ thống nội bộ nhỏ, không cần tối ưu cho traffic lớn — ưu tiên **đơn giản, chắc chắn, dễ bảo trì** hơn là scale.

## 2. Tech Stack

| Layer | Công nghệ |
|---|---|
| Frontend | React (Vite) + TypeScript + Tailwind CSS v4 |
| Landing 3D | React Three Fiber (@react-three/fiber + drei) + Framer Motion |
| Fonts | Be Vietnam Pro (body) + Dela Gothic One (brand/tiêu đề) — self-hosted qua @fontsource |
| Backend | FastAPI (Python) + Motor (async MongoDB) |
| Database | MongoDB Atlas (M0 free tier) |
| Auth | JWT — **chỉ áp dụng cho admin** (username/password). Khách không cần tài khoản, không login |
| Hosting Frontend | Vercel |
| Hosting Backend | Render |
| Lưu ảnh sản phẩm | Cloudinary (free tier) — Render không giữ file lâu dài giữa các lần deploy |
| Thanh toán | VietQR (sinh QR chuyển khoản) + **auto-confirm qua webhook SePay** |
| Thông báo admin | Discord Webhook |

> Chỉ dùng **React**, cả trang khách và trang admin build trên cùng 1 React app.

## 3. Kiến trúc hệ thống

```
[React SPA] --REST/JSON--> [FastAPI backend] --> [MongoDB Atlas]
                                  |
                                  +--> Discord Webhook (thông báo đơn mới)
                                  +--> VietQR img API (sinh QR thanh toán)
                                  +--> Cloudinary (lưu ảnh sản phẩm)
                                  +<-- SePay Webhook (báo tiền vào -> tự xác nhận đơn)
```

- Frontend: 1 React app. Route `/` = **landing page** (hero 3D + CTA), `/order` = trang khách đặt món F&B (**không cần login**), `/renting` = trang thuê đồ (độc lập, **giỏ hàng riêng** qua `CartProvider storageKey="h2_rental_cart"`, không link từ landing), `/admin/*` = quản lý (cần login admin).
- Backend: FastAPI expose REST API. JWT chỉ bắt buộc cho route `/admin/*`; các route khách (`/menu`, `/cart/checkout`, `/orders/*`, `/discount/validate`) mở công khai. Webhook `/webhooks/sepay` bảo vệ bằng API key.
- Không cần WebSocket ở bản đầu — admin xem đơn mới bằng **polling** (~12s); khách xem trạng thái đơn bằng polling (~10s). Có thể nâng cấp sau.

## 4. Chức năng

### 4.1 Khách hàng (không cần tài khoản)
- **Không đăng nhập, không đăng ký.** Landing `/` → bấm CTA vào `/order` xem menu, không rào cản.
- Xem menu chia 2 nhóm **Đồ chế biến** / **Đồ đóng chai**, xem trạng thái bếp (mở/đóng).
- **Thuê đồ** ở trang riêng `/renting` (link phát riêng cho khách thuê) — nhóm theo phân loại admin đặt; giỏ hàng thuê **tách biệt** với giỏ F&B.
- Chọn món, tuỳ chỉnh topping (với mì trộn Indomie), ghi chú riêng từng món.
- Thêm giỏ, sửa/xoá số lượng, xem giỏ, đặt đơn.
- **Mã giảm giá khách quen** (F&B): nhập mã ở giỏ → xem trước mức giảm (20% đồ chế biến, 10% đồ đóng chai) trước khi đặt. Không áp cho đồ thuê.
- **Checkout nhập:** Tên (bắt buộc), Số phòng (bắt buộc — chọn từ danh sách phòng), SĐT (tuỳ chọn).
- Sau khi đặt: hiện **QR VietQR** (số tiền + nội dung = mã đơn, điền sẵn) + **mã đơn hàng** để tra cứu.
- **Theo dõi đơn không cần đăng nhập:** mã đơn lưu ở `localStorage`, khách quay lại thấy trạng thái (chờ/đang làm/hoàn thành/huỷ). Đổi thiết bị thì tra thủ công bằng mã đơn.
- **Huỷ đơn**: khách tự huỷ khi đơn còn `pending` (hoàn lại tồn kho). Khi đã `preparing`, ẩn nút huỷ — liên hệ admin.
- **Đặt lại nhanh (reorder)**: đổ lại giỏ từ đơn cũ (lấy items từ backend theo mã đơn).

### 4.2 Admin (role: admin, cần đăng nhập)
- Đăng nhập admin. **Tự đổi mật khẩu** trong panel (không cần nhập mật khẩu cũ).
- **Đóng/mở bếp**: khi đóng, khách **chỉ không đặt được đồ chế biến** (`prepared`); **đồ đóng chai (`bottled`) và đồ thuê vẫn đặt được bình thường**. Web hiện thông báo tương ứng.
- Xem danh sách đơn (mới nhất trước), lọc theo trạng thái, tự refresh.
- Cập nhật trạng thái đơn (chờ → đang làm → hoàn thành / huỷ). Huỷ thay khách (hoàn tồn kho).
- Đánh dấu **đã thu tiền** thủ công (fallback nếu SePay chưa auto-confirm).
- **Quản lý sản phẩm F&B** (`/admin/menu`): thêm/sửa/xoá; danh mục **đồ đóng chai / đồ chế biến**; giá; mô tả; **ảnh (Cloudinary)**; **topping riêng từng món**; **tồn kho** (tự trừ mỗi đơn, admin cộng lại khi nhập hàng). Khi `quantity = 0` → hiện "hết hàng", không cho thêm giỏ.
- **Quản lý đồ thuê** (`/admin/rental`): CRUD sản phẩm `kind=rental`, tự đặt **nhóm phân loại** (chuỗi tự do, có gợi ý), giá thuê, tồn kho, ảnh.
- **Mã giảm giá khách quen**: xem mã hiện tại + đếm ngược trên Dashboard (nút copy để gửi khách quen). Mã tự sinh mới mỗi 4 giờ, không cần bấm tạo.
- Nhận **thông báo đơn mới qua Discord**.
- **Thống kê cơ bản** (doanh thu, món bán chạy, số đơn theo trạng thái) — *chưa build*.

### 4.3 Chức năng bổ sung (đã làm / đề xuất)
- ✅ **Auto-confirm thanh toán** qua webhook SePay (xem §6).
- ✅ **Đóng bếp chỉ chặn đồ chế biến** (`prepared`), đồ đóng chai + đồ thuê vẫn bán.
- ✅ **Đổi mật khẩu admin**.
- ✅ **Thuê thiết bị** (`/renting`) — giỏ riêng, tái dùng luồng đơn/thanh toán.
- ✅ **Mã giảm giá khách quen** — tự sinh mỗi 4h (xem §6.1).
- (đề xuất) Giờ hoạt động tự động; cảnh báo tồn kho thấp; đánh dấu "đã thu tiền mặt" (đã có nút thu tiền tay).

## 5. Sản phẩm & Menu (dữ liệu khởi tạo)

**Sản phẩm chiến lược:** Mì trộn Indomie — hệ thống topping (trứng ốp la, xúc xích, chả cá, phô mai, rau cải…).
**Đồ chế biến (`prepared`):** Mì trộn Indomie, trà chanh, trà đào… (bị chặn khi đóng bếp).
**Đồ đóng chai (`bottled`):** Coca-Cola, Pepsi, Sprite, Sting, Red Bull, trà Cozy, trà TEA+, nước suối.
**Đồ thuê (`rental`):** đàn guitar, đàn bass, tai nghe IEM… (nhóm do admin đặt).
→ Menu quản lý động qua admin panel; danh sách trên là seed data (`app/seed.py`). Doc `menu_items` cũ (`category: food|drink`) được **migrate tự động** lúc startup (`food→prepared`, `drink→bottled`, gắn `kind=fnb`) — idempotent, không đụng dữ liệu đã đúng.

## 6. Thanh toán — VietQR + auto-confirm (SePay)

- Không tích hợp cổng thanh toán. Khi khách đặt đơn (payment_method `vietqr`), backend sinh URL ảnh QR VietQR (`img.vietqr.io`) với: STK + ngân hàng nhận (`BANK_ACCOUNT_INFO`), **số tiền = tổng đơn** (đúng tổng, không cộng đồng lẻ), **nội dung = mã đơn** (QR điền sẵn nên khách không phải gõ).
- **Auto-confirm**: dịch vụ **SePay** giám sát tài khoản ngân hàng, khi có tiền vào gọi webhook `POST /webhooks/sepay`. Backend đọc mã đơn trong nội dung + đối chiếu số tiền → **tự đánh dấu `paid`**, admin không cần bấm. Nút "đã thu tiền" của admin vẫn là phương án dự phòng.
- Webhook bảo vệ bằng `SEPAY_WEBHOOK_API_KEY` (header `Authorization: Apikey <key>`).
- Hỗ trợ cả `payment_method: cash` (trả tiền mặt tại quầy, không sinh QR).
- Nếu có **mã giảm giá** hợp lệ, `transfer_amount = total` (đã trừ giảm) — QR sinh theo số tiền đã giảm.

## 6.1 Mã giảm giá khách quen (`app/services/discount.py`)

- **Tự sinh mỗi 4 giờ, không lưu DB**: mã được suy ra deterministic từ secret + "bucket thời gian" (`floor(epoch / 4h)`) — mọi tiến trình tính ra cùng mã, không cần scheduler. Secret = `DISCOUNT_SECRET` (nếu trống → dùng `JWT_SECRET`, zero-config).
- **Ân hạn**: chấp nhận cả mã của bucket hiện tại **và** bucket trước (không rớt ngay khi qua mốc 4h).
- **Mức giảm** (chỉ F&B): `prepared` −20%, `bottled` −10%, rental/khác 0%. Tính theo từng dòng đơn (làm tròn VND).
- Checkout nhận `discount_code` tuỳ chọn → validate; sai/hết hạn trả **400**. Đơn lưu `subtotal` (trước giảm), `discount_code`, `discount_amount`, `total` (sau giảm).
- Admin xem mã hiện tại tại `GET /admin/discount-code`; khách xem trước mức giảm tại `GET /discount/validate`.

## 7. Thông báo đơn hàng — Discord Webhook

- Khi có đơn mới, backend `POST` embed tới `DISCORD_WEBHOOK_URL`: mã đơn, tên khách, phòng, SĐT, tổng tiền, giờ đặt, danh sách món + topping + ghi chú.
- Gửi **fire-and-forget** (BackgroundTasks) — lỗi webhook không làm hỏng việc đặt đơn.
- Module tách riêng `app/services/notifications.py` để dễ đổi provider (Messenger/Zalo sau).
- 3+ admin cài app Discord trên điện thoại, join server → nhận **push notification thật**.

## 8. Data Model (MongoDB)

```
admins       { _id, username, password_hash, name, role: "admin" }   // CHỈ admin
menu_items   { _id, name, kind: "fnb"|"rental",
               category,          // fnb: "bottled"|"prepared" ; rental: nhóm tự do (vd "Guitar")
               price, description, image_url,
               quantity: int, is_available: bool, toppings: [{name, price}] }
orders       { _id, order_code, kind: "fnb"|"rental", customer_name, room_number, phone?,
               items: [{menu_item_id, name, kind, category?, qty,
                        toppings:[{name,price,qty}], unit_price, price, note?}],
               subtotal, discount_code?, discount_amount,
               total, transfer_amount, status: "pending"|"preparing"|"done"|"cancelled",
               payment_status: "unpaid"|"paid", payment_method: "vietqr"|"cash",
               payment_meta?, cancelled_by?: "customer"|"admin", created_at }
kitchen_status { _id: "kitchen", is_open: bool, updated_at, updated_by }
```

> `subtotal` = tổng dòng trước giảm; `total` = sau giảm (= `subtotal - discount_amount`). Đơn cũ thiếu các field mới → mặc định an toàn (`kind=fnb`, `subtotal=total`, `discount_amount=0`).

> `orders` không có `user_id` — định danh qua `order_code` (khách lưu ở `localStorage`).

## 9. API Endpoints

```
# Auth (admin)
POST   /auth/login                     -> đăng nhập admin, trả JWT
GET    /auth/me                        -> thông tin admin hiện tại
PATCH  /admin/me/password              -> tự đổi mật khẩu (không cần mật khẩu cũ)

# Menu (kind: fnb=F&B mặc định, rental=đồ thuê)
GET    /menu                           -> công khai (?kind=fnb|rental, mặc định fnb; ?category=…)
GET    /admin/menu-items               -> tất cả (kể cả ẩn) (?kind=…, ?category=…)
POST   /admin/menu-items               -> thêm sản phẩm (fnb hoặc rental)
PATCH  /admin/menu-items/{id}          -> sửa (gồm quantity, toppings, is_available, category)
DELETE /admin/menu-items/{id}
POST   /admin/menu-items/{id}/image    -> upload ảnh lên Cloudinary

# Orders
POST   /cart/checkout                  -> công khai, tạo đơn (+ order_code + QR). Nhận discount_code tuỳ chọn. Đóng bếp chỉ chặn nếu có đồ chế biến
GET    /orders/{order_code}            -> công khai, tra cứu trạng thái
PATCH  /orders/{order_code}/cancel     -> khách tự huỷ (chỉ khi pending)
GET    /admin/orders                   -> tất cả đơn (?status=…)
PATCH  /admin/orders/{id}              -> cập nhật status / payment_status

# Kitchen
GET    /kitchen-status                 -> công khai
GET    /admin/kitchen-status
PATCH  /admin/kitchen-status           -> đóng/mở bếp (đóng = chặn đồ chế biến)

# Discount (mã giảm giá khách quen)
GET    /discount/validate              -> công khai (?code=…), xem trước mã hợp lệ + % giảm
GET    /admin/discount-code            -> mã hiện tại + hạn đổi (để gửi khách quen)

# Payment webhook
POST   /webhooks/sepay                 -> SePay báo tiền vào (API key), tự xác nhận đơn
```

## 10. Giao diện & Design

- **Theme: indigo mono** — nền neutral tối + accent indigo (tham khảo `frontend/src/ref.css`).
- **Fonts**: Be Vietnam Pro cho toàn bộ body; Dela Gothic One cho logo/tiêu đề "H2 Kitchen".
- **Landing `/`**: hero tối giản, sáng tạo — tiêu đề lớn Dela Gothic layer với **model 3D bát mì** (GLB nén ~5MB, load lazy qua R3F), animation Framer Motion, CTA "Bắt đầu chọn món" → `/order`. Responsive + tối ưu mobile (giảm dpr/poly, error-boundary fallback poster).
- Trang khách: nhanh, gọn, mobile-first (chọn món → giỏ → thanh toán).
- Trang admin: rõ ràng, dạng bảng/thẻ, ưu tiên tốc độ thao tác.

## 11. Deployment

- **Frontend → Vercel**: `npm run build` (output `dist`), `vercel.json` rewrite mọi route về `index.html` (SPA). Env `VITE_API_URL` = URL backend Render.
- **Backend → Render** (Web Service): build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Cấu hình Python 3.11. Env: `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `USE_MOCK_DB=false`, `SEED_ON_STARTUP`, `CORS_ORIGINS` (thêm domain Vercel), `BANK_ACCOUNT_INFO`, `SEPAY_WEBHOOK_API_KEY`, `DISCORD_WEBHOOK_URL`, `CLOUDINARY_URL`, `DISCOUNT_SECRET` (tuỳ chọn — trống thì dùng `JWT_SECRET`).
- **MongoDB Atlas** (M0): Network Access cho `0.0.0.0/0` (Render free không có IP tĩnh).
- Sau deploy: cập nhật webhook SePay/Discord trỏ về domain Render; đổi mật khẩu admin mặc định.

## 12. Roadmap build

1. ✅ Setup skeleton (FastAPI + React, MongoDB, JWT auth)
2. ✅ Menu CRUD (admin) + hiển thị menu (khách)
3. ✅ Giỏ hàng + đặt đơn (khách)
4. ✅ Quản lý đơn hàng (admin) + đóng/mở bếp
5. ✅ VietQR + auto-confirm SePay
6. ✅ Discord Webhook thông báo đơn mới
7. ✅ Landing 3D + theme indigo mono + fonts + đổi mật khẩu admin
8. ✅ Phân loại lại F&B (đóng chai/chế biến) + thuê thiết bị (`/renting`) + mã giảm giá khách quen
9. ⏳ Deploy Render + Vercel

---
*File này là nguồn tham chiếu xuyên suốt dự án — cập nhật khi có thay đổi về scope, tech stack, hoặc quyết định kiến trúc.*
