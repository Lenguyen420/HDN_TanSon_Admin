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

Tối ưu tải dữ liệu: mỗi trang Admin chỉ yêu cầu collection đang sử dụng và các danh sách liên kết cần cho biểu mẫu. Cache trong bộ nhớ 30 giây dùng chung khi chuyển trang, gộp request trùng; khi quay lại cửa sổ sẽ kiểm tra dữ liệu hết hạn. Sau thêm/sửa/xóa, danh sách cập nhật từ kết quả backend, không tải lại toàn bộ dữ liệu. Duyệt hồ sơ cập nhật hồ sơ và làm mất hiệu lực cache hội viên. Dữ liệu này không được ghi vào localStorage; cache HTTP/API quản trị vẫn là `no-store`.

`vercel.json` đặt Functions ở Singapore (`sin1`) cùng khu vực MongoDB Atlas hiện tại; cần redeploy Admin và backend để áp dụng. Kiểm tra lại region nếu sau này đổi cluster Atlas.

Các API dữ liệu dùng chung route `app/api/association/[...path]/route.ts`, giới hạn theo danh sách chức năng và phương thức hợp lệ. URL hiện có không đổi. Tổng số route động giảm từ 13 xuống 6: bốn route xác thực, một route dữ liệu, một route ảnh. Các trang quản trị tiếp tục được build tĩnh. Service Axios đặt tại `services/api/`, tách khỏi thư mục API server. Đã bỏ các route chuyển tiếp riêng bị lặp và script PM2 của dự án cũ.

File `.env.local` của frontend:

~~~env
ASSOCIATION_API_URL=https://behdntanson.vercel.app/api/v1
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
- `services/api/axiosConfig.ts`: Axios dùng chung, timeout, xử lý lỗi và tự làm mới phiên khi gặp 401.
- `services/api/authApi.ts`, `services/api/memberApi.ts`, `services/api/registrationApi.ts`: service theo từng nhóm API; `services/api/index.ts` gom export.
- `services/api/authSession.ts`: lưu thông tin quản trị viên và thời điểm hết hạn; token nằm trong cookie HttpOnly.
- `services/association-api.ts`: nối API với hook dữ liệu, kiểm tra liên kết dữ liệu và phát sự kiện cập nhật giao diện.
- `services/association-store.ts`: dữ liệu cục bộ trống ban đầu và thao tác nội dung chưa có API.
- `services/legacy-sample-cleanup.ts`: dấu vân tay dùng dọn dữ liệu minh họa cũ một lần; không chứa nội dung mẫu để hiển thị.
- `lib/backend.ts`: kết nối Express, chỉ chạy trên server.

## Gọi API từ giao diện

Biểu mẫu Sự kiện đồng bộ với Mini App: ngày tổ chức, giờ bắt đầu/kết thúc, địa điểm, địa chỉ, đơn vị tổ chức, lịch trình theo từng mục, bật/tắt điểm danh, tài liệu và biên bản. Khung giờ vẫn gửi dưới dạng `HH:mm - HH:mm` trong `event.time`; lịch trình lưu mảng `{ time, title }`. Tài liệu/biên bản không bắt buộc: lưu sự kiện trước và sửa bổ sung sau, các dòng chưa nhập gì sẽ được bỏ qua. Chọn PDF, Word, Excel, PowerPoint hoặc ảnh từ máy, tối đa 4 MB/file; file được tải khi lưu, cất trong MongoDB GridFS. Mỗi mục lưu `{ id, title, url, publishedAt? }`; liên kết HTTPS cũ được giữ nguyên khi sửa. Chức năng điểm danh trên Mini App chỉ mở khi sự kiện đã công bố, trong ngày diễn ra sự kiện và quản trị viên bật tiếp nhận; người dùng phải gửi xác nhận để được ghi nhận tham dự.

API tải file `POST /api/association/event-files` dùng chung route proxy hiện có, chuyển tiếp bytes gốc tới `POST /api/v1/admin/event-files`. Admin mở file qua `/uploads/event-files/:id`; Mini App mở qua `/api/v1/public/event-files/:id` trên backend. Không tăng số route động. Triển khai backend trước, sau đó Admin và Mini App để có API và hỗ trợ đường dẫn file mới.

Cấu trúc service theo mẫu `FE_Admin_CTS/src/api`, dùng TypeScript phù hợp dự án hiện tại:

```ts
import { authApi, memberApi, registrationApi } from "@/services/api";

await authApi.login({ username, password });
const { data: members, pagination } = await memberApi.getAll({ page: 1, limit: 100 });
await memberApi.update(memberId, { name, company });
await registrationApi.approve(registrationId);
await registrationApi.reject(registrationId, reason);
```

Các nhóm dữ liệu hỗ trợ `getAll`, `create`, `update`, `delete`. `getAll` trả `{ data, pagination }`; thao tác tạo/sửa trả nội dung `response.data.data`. Chi tiết dùng bản ghi đã tải trong danh sách; các hàm `getById` chưa sử dụng đã được bỏ. `approve` trả `{ registration, memberId }`. Luồng gọi: component/hook → service trong `services/api/` → Axios (`/api`) → API chuyển tiếp Next.js → Express (`ASSOCIATION_API_URL`). Đăng nhập, đăng xuất và lịch tự refresh cũng dùng cùng lớp Axios.

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
npm run test:proxy
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

## Backend Vercel

Admin dùng https://behdntanson.vercel.app/api/v1. File .env.local dùng trên máy; .env.production chỉ chứa URL công khai và được lưu cùng source. Nếu hosting đã có biến ASSOCIATION_API_URL, đặt lại đúng URL này vì biến trên hosting được ưu tiên. Khởi động lại dev server hoặc redeploy sau khi thay đổi cấu hình. Không đặt MongoDB URI hoặc JWT secret vào frontend.


## Thông báo đăng ký hội viên

Chuông trên header mở bảng thông báo xổ xuống với badge chưa đọc và 100 hồ sơ đăng ký gần nhất từ backend. Menu Thông báo đã được bỏ khỏi sidebar; thao tác xem hồ sơ và đánh dấu đọc nằm ngay tại chuông. Bấm thông báo để lọc đúng hồ sơ tại mục Đăng ký và thực hiện duyệt/từ chối; có nút Xem toàn bộ hồ sơ để bỏ lọc. Số hồ sơ chờ duyệt tính trên toàn bộ database. Inbox dùng proxy đăng nhập HttpOnly và tự cập nhật mỗi 5 giây khi trang hiển thị; tải lại ngay khi quay lại tab. Trạng thái đã đọc lưu theo tài khoản trên trình duyệt hiện tại. Danh sách thông báo nội dung của Hội vẫn giữ nguyên bên dưới.

Deploy backend trước rồi redeploy admin. Đây là thông báo trong ứng dụng, không gửi email hoặc tin nhắn ngoài ứng dụng.


Ảnh hội viên: trường URL ảnh đại diện trong form Hội viên/Ban chấp hành được gửi về backend bằng avatar. Dùng URL HTTP(S) của ảnh hoặc đường dẫn uploads/... hợp lệ; không nhập base64 vào trường URL. Ảnh được hiển thị trên Mini App khi backend và Mini App đã deploy bản hỗ trợ avatar.

## Thông báo vắng mặt sự kiện

Chuông thông báo và trang Thông báo tải thêm `/association/event-inbox`. Người đã đăng ký trên Mini App nhưng chưa điểm danh sau giờ kết thúc xuất hiện tại đây. Chi tiết sự kiện có bảng đăng ký/điểm danh phân trang, tự cập nhật trạng thái. Mốc thời gian và trạng thái do backend tính, không dựa vào đồng hồ trình duyệt admin. Cần deploy backend mới trước dashboard.

## Video giới thiệu Hội

Vào Thông tin Hội → Giới thiệu Hội → Video giới thiệu để dán URL YouTube hoặc video MP4/WebM HTTPS. Rời ô nhập để xem trước, bấm Lưu thay đổi để lưu vào MongoDB qua backend. Xóa URL và lưu để ẩn video trên Mini App. Cần deploy backend có introductionVideoUrl trước dashboard và Mini App.

Video giới thiệu hỗ trợ hai lựa chọn ở Thông tin Hội: chọn file MP4/WebM từ máy tính (tối đa 100 MB) hoặc link YouTube. Bấm Lưu thông tin Hội để tải file và lưu cấu hình vào DB; có xem trước, tiến độ tải và nút Xóa video. Upload một file multipart qua API `/api/association/introduction-videos/upload`, được proxy dạng stream tới backend và lưu vào `uploads/introduction-videos/`; proxy phát video giữ HTTP Range. Backend cần ổ đĩa bền vững, không chạy lưu file trên Vercel. Cần deploy backend mới trước dashboard và Mini App.

## Giảm tải khi lưu Thông tin Hội

Các tác vụ nền (chuông thông báo, danh sách thông báo, điểm danh) cập nhật tối đa mỗi 60 giây sau khi yêu cầu trước hoàn tất; không gọi chồng do focus và không bắt đầu lượt mới trong lúc lưu Thông tin Hội. Form Thông tin Hội không tải lại khi focus, và chặn bấm lưu trùng. Video tải tuần tự từng phần 2 MB, hiển thị đúng bước đang xử lý. Nếu timeout/mạng lỗi, giữ nguyên file trên cùng trang và bấm Lưu để tiếp tục phần chưa được xác nhận; refresh trang hoặc chọn file mới sẽ tạo phiên mới. Dọn phiên lỗi không giữ nút Lưu chờ thêm. Đây là thay đổi dashboard, cần deploy lại dashboard để áp dụng cho URL Vercel; chạy local thì tải lại trang local.

## Tốc độ tải ảnh và video

Video mới từ máy tính yêu cầu backend chia phần 256 KiB, tải tối đa 3 phần đồng thời (tổng dữ liệu đang gửi tối đa 768 KiB thay vì 6 MiB). Backend vẫn hỗ trợ phiên cũ 2 MiB. Deploy backend có hỗ trợ chunkSize trước rồi deploy admin. Chờ mọi request đang chạy kết thúc trước khi báo lỗi hoặc hoàn tất; phần đã được backend xác nhận được giữ để lần Lưu tiếp theo chỉ gửi phần còn thiếu. Không đưa access token ra trình duyệt; upload tiếp tục qua proxy dùng cookie HttpOnly.

Proxy /uploads cache ảnh UUID ở Next.js Data Cache trong 24 giờ, dùng lại cho các lần truy cập sau. Video Range và tài liệu vẫn stream với no-store ở upstream, không trộn cache giữa các khoảng byte. Thay ảnh tạo URL UUID mới nên không cần xóa cache ảnh cũ.

vercel.json đặt Functions tại sin1 để cùng vùng backend hiện tại. Cần redeploy cả admin và backend để áp dụng các tối ưu. Cache không loại bỏ độ trễ lần tải đầu; tốc độ thực tế còn phụ thuộc mạng và MongoDB.


## Giao thương doanh nghiệp

Mở /admin/trade hoặc Giao thương trong điều hướng. Các tab quản lý tin, danh mục, đánh giá, hội thoại, thống kê, tài khoản và thông báo dùng API backend qua proxy /api/trade/admin; giữ cookie HttpOnly. SUPER_ADMIN quản lý danh mục/tài khoản, STAFF kiểm duyệt nội dung. Danh mục dùng version để phát hiện sửa đồng thời. Chưa có dữ liệu mẫu; tạo danh mục đầu tiên sau khi deploy BE rồi mới deploy admin/Mini App. Xem docs/trade-module.md trong repo backend để biết hợp đồng API và các quy tắc.

## Giấy phép kinh doanh đính kèm đăng ký

Chi tiết hồ sơ đăng ký hiển thị ảnh giấy phép kinh doanh và liên kết mở ảnh gốc qua proxy có cookie đăng nhập. Backend lưu file riêng trong MongoDB, không đưa giấy phép vào uploads công khai. Hồ sơ cũ chưa đính kèm ảnh vẫn xem/sửa/duyệt được. Backend cần có GET `/api/v1/admin/registrations/:id/business-license` và cờ `hasBusinessLicense` trong hồ sơ.
