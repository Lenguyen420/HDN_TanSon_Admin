# Quản trị Hội Doanh nghiệp Phường Tân Sơn

Frontend Next.js 16 chạy tại http://localhost:3003, kết nối backend Express + MongoDB ở cổng 4000.

## Dữ liệu và chức năng

- Đăng nhập, refresh, đăng xuất, quản lý hội viên, Ban chấp hành và hồ sơ đăng ký dùng backend Express hiện tại.
- Duyệt hồ sơ tạo hội viên bằng transaction MongoDB; lưu lịch sử quyết định, hỗ trợ từ chối kèm lý do.
- Tin tức, sự kiện, thăm hội viên, thông báo và banner dùng API Express và lưu MongoDB. Thông tin Hội dùng API cấu hình chung trên MongoDB. Hội phí, tài trợ và lịch sử tham gia còn lưu trong trình duyệt. Các danh sách khởi tạo trống.
- Không nạp dữ liệu mẫu hoặc tự chuyển dữ liệu cũ lên backend. Dữ liệu đã có trên MongoDB được giữ nguyên.
- Dữ liệu cục bộ dùng khóa localStorage `tanson-association-admin-v1`. Lần đọc đầu sau cập nhật sẽ loại các bản ghi minh họa cũ chưa chỉnh sửa và xóa các thông tin liên hệ mặc định giả lập. Bản ghi tự nhập và các bản ghi đã chỉnh sửa được giữ lại. Dữ liệu lỗi được báo để xử lý, không tự ghi đè.
- Tên Hội, khẩu hiệu, logo và ảnh nhận diện giao diện vẫn được giữ.

## Kết nối backend

File `.env.local` của frontend:

~~~env
ASSOCIATION_API_URL=http://127.0.0.1:4000/api/v1
~~~

Nhóm nội dung dùng các route cùng tiền tố /api/association: news, events, member-visits, notifications, banners; mỗi nhóm hỗ trợ GET danh sách/chi tiết, POST, PUT và DELETE. Service nằm trong api/contentApi.ts. Bộ lọc hỗ trợ page/limit/search/status, thêm topic cho bài viết hoặc category cho thông báo. Ảnh dùng URL hoặc ảnh JPG/PNG/WebP base64 đã thu nhỏ. Dữ liệu nội dung cũ trong localStorage không tự chuyển lên máy chủ; giao diện lấy nội dung từ MongoDB và báo lỗi nếu API không kết nối được.

Frontend gọi các route cùng origin `/api/auth/*`, `/api/association/members/*` và `/api/association/registrations/*`. Next.js đọc token từ cookie HttpOnly và chuyển tiếp tới Express; JavaScript trình duyệt không đọc token. Các biến backend Kidoedu/ngrok và admin key cũ đã được loại bỏ.

Backend nằm tại `D:\HDN_TanSon_Backend\hdn_tanson_be`. Chạy `npm run start:dev` ở thư mục backend sau khi điền MongoDB Atlas URI trong .env của backend. Chỉ chạy một tiến trình cho mỗi cổng. Đăng nhập bằng ADMIN_USERNAME/ADMIN_PASSWORD của backend; thay mật khẩu trong env không đặt lại tài khoản đã có.

## Cấu trúc mã nguồn

- `app/`: định tuyến và API chuyển tiếp Next.js.
- `components/<tên-trang>/`: nội dung riêng từng trang.
- `components/shared/association/`: bảng, hộp thoại, chọn ảnh, hook dữ liệu và cấu hình trường/menu.
- `components/shared/notifications/`: toast dùng chung.
- `components/layout/`: khung giao diện; `components/auth/`: quản lý phiên.
- `api/axiosConfig.ts`: Axios dùng chung, timeout, xử lý lỗi và tự làm mới phiên khi gặp 401.
- `api/authApi.ts`, `api/memberApi.ts`, `api/registrationApi.ts`: service theo từng nhóm API; `api/index.ts` gom export.
- `api/authSession.ts`: lưu thông tin quản trị viên và thời điểm hết hạn; token nằm trong cookie HttpOnly.
- `services/association-api.ts`: nối API với hook dữ liệu, kiểm tra liên kết dữ liệu và phát sự kiện cập nhật giao diện.
- `services/association-store.ts`: dữ liệu cục bộ trống ban đầu và thao tác nội dung chưa có API.
- `services/legacy-sample-cleanup.ts`: dấu vân tay dùng dọn dữ liệu minh họa cũ một lần; không chứa nội dung mẫu để hiển thị.
- `lib/backend.ts`: kết nối Express, chỉ chạy trên server.

## Gọi API từ giao diện

Cấu trúc service theo mẫu `FE_Admin_CTS/src/api`, dùng TypeScript phù hợp dự án hiện tại:

```ts
import { authApi, memberApi, registrationApi } from "@/api";

await authApi.login({ username, password });
const { data: members, pagination } = await memberApi.getAll({ page: 1, limit: 100 });
await memberApi.update(memberId, { name, company });
await registrationApi.approve(registrationId);
await registrationApi.reject(registrationId, reason);
```

Các nhóm dữ liệu hỗ trợ `getAll`, `getById`, `create`, `update`, `delete`. `getAll` trả `{ data, pagination }`; các thao tác lấy/tạo/sửa trả nội dung `response.data.data`. `approve` trả `{ registration, memberId }`. Luồng gọi: component/hook → service trong `api/` → Axios (`/api`) → API chuyển tiếp Next.js → Express (`ASSOCIATION_API_URL`). Đăng nhập, đăng xuất và lịch tự refresh cũng dùng cùng lớp Axios.

Khi nhiều yêu cầu cùng gặp 401, Axios dùng chung một lần refresh rồi thử lại mỗi yêu cầu tối đa một lần. Lỗi trả về `ApiError` với `statusCode`, `message`, `retryAfter` để giao diện hiển thị toast hoặc đếm thời gian chờ. Không tự xóa chuỗi rỗng trong payload vì biểu mẫu cần gửi chuỗi rỗng để xóa giá trị cũ; mật khẩu được gửi nguyên trạng. Những phần chưa có API tiếp tục lưu cục bộ như mô tả trên.

## Chạy để phát triển

```bash
npm ci
npm run dev
```

Chế độ dev giữ bộ biên dịch, cache và hot reload trong RAM. RAM có thể tăng khi mở thêm các trang quản trị. Chỉ chạy một dev server cho dự án.

Cấu hình hiện tại đặt mục tiêu bộ nhớ cache Turbopack ở 1 GiB, giới hạn phạm vi theo dõi file trong thư mục dự án và dùng 2 worker khi tạo trang tĩnh. Mục tiêu cache không phải giới hạn tổng RAM: Node, mã ứng dụng và các tiến trình con vẫn cần thêm bộ nhớ. Khi cache bị thu hồi, việc quay lại một trang có thể cần biên dịch lại.

Nếu Turbopack vẫn gây vấn đề trên máy, dừng server rồi thử bộ biên dịch Webpack:

```bash
npm run dev:webpack
```

## Chạy để sử dụng hoặc kiểm thử bản production

```bash
npm run build
npm start
```

Dừng dev server trước khi chạy các lệnh trên để giảm RAM và tránh trùng cổng. Bản production không giữ bộ biên dịch dev/hot reload. Server chỉ nạp module của từng trang khi có yêu cầu; sau khi truy cập nhiều trang, RAM vẫn có thể tăng.

Menu quản trị không tải trước toàn bộ trang liên kết. Các trang nội dung không polling API và không mở WebSocket hàng chờ.

## Thông báo toast

Frontend dùng Sonner với `ToastProvider` tại `components/shared/notifications/ToastProvider.tsx`, được gắn một lần ở root layout. Gọi `notify.success(message)`, `notify.error(message)` hoặc `notify.info(message)` từ `lib/notify.ts`. Toast nằm góc trên bên phải, tự ẩn sau 4 giây (lỗi: 7 giây), có nút đóng và hỗ trợ màn hình nhỏ. Portal tự đi vào dialog đang mở để thông báo vẫn hiển thị và thao tác được phía trên modal native.

Đăng nhập/đăng xuất dùng `flashSuccess(message)` trước khi chuyển trang để trang đích hiển thị thông báo một lần. Chỉ lưu nội dung thông báo trong sessionStorage. Lỗi biểu mẫu vẫn có nội dung tại form để người dùng sửa sau khi toast đã tắt.

## Kiểm tra

```bash
npm run type-check
npm run lint
npm test
```

Trên Windows PowerShell chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm`.

## Kiểm tra RAM trên Windows

```powershell
Get-Process node | Sort-Object WorkingSet64 -Descending | Select-Object Id, @{Name='RAM_MiB';Expression={[math]::Round($_.WorkingSet64 / 1MB)}}
```

Các công cụ IDE cũng dùng Node. Đối chiếu PID và lệnh khởi chạy trong Task Manager trước khi kết luận toàn bộ RAM Node là của dashboard. Khi so sánh trước/sau, dùng cùng các trang và cùng khoảng thời gian; số đo ngay sau khi khởi động lại chưa thể chứng minh đã khắc phục rò rỉ bộ nhớ.

## Ảnh tải lên

Ảnh chọn từ máy được thu nhỏ và gửi cùng yêu cầu lưu nội dung. Backend ghi file vào uploads/news, uploads/events, uploads/member-visits hoặc uploads/banners; trường image trên MongoDB chỉ lưu đường dẫn dạng uploads/news/<uuid>.webp. Frontend chuyển đường dẫn này thành /uploads/... để hiển thị thông qua route cùng origin, không cần công khai địa chỉ backend trên trình duyệt. URL ảnh cũ và ảnh tĩnh tiếp tục hiển thị. File đã lưu không bị xóa khi hủy chỉnh sửa hoặc xóa mềm nội dung; backend dọn file mới nếu yêu cầu lưu database thất bại.

## API Thông tin Hội

Phần Cấu hình → Thông tin Hội dùng GET và PUT /api/association/settings, chuyển tiếp tới /api/v1/admin/settings bằng cookie HttpOnly. Service nằm ở api/settingsApi.ts; hook dữ liệu lấy settings từ backend, gồm thông tin giới thiệu, liên hệ và trợ lý sự kiện. Bản sao JSON cũng lấy cấu hình đang tải từ API.

Backend lưu duy nhất một bản cấu hình có id association trong collection association_settings. Tên Hội và khẩu hiệu bắt buộc; các trường tùy chọn bỏ qua hoặc gửi chuỗi rỗng khi PUT sẽ được xóa về rỗng. Form gửi đầy đủ các trường, khóa thao tác trong lúc lưu, hiển thị lỗi API và cập nhật dữ liệu khi thành công. Email, số điện thoại, URL HTTPS và câu hỏi dạng câu hỏi | câu trả lời được kiểm tra trên backend. Logo nhận diện vẫn dùng ảnh cố định hiện tại.

GET /api/v1/public/settings dành cho Mini App, không yêu cầu token và không trả thông tin người sửa. Cấu hình localStorage cũ không tự đưa lên MongoDB hoặc dùng thay thế khi backend lỗi. Mặc định giữ tên Hội và khẩu hiệu hiện có, các thông tin liên hệ/trợ lý để trống tới khi lưu lần đầu. Mini App chưa được sửa trong công việc này.
