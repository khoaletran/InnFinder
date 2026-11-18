# BẢNG KẾT QUẢ KIỂM TOÁN & ĐỒNG BỘ TOÀN DIỆN DỰ ÁN INNFINDER
**Nhánh tích hợp:** `develop` | **Tài liệu chuẩn gốc:** `AGENTS.md`  
**Trạng thái kiểm thử tự động:**
- `npm --prefix web run lint`: **PASS** (`0` lỗi, `0` cảnh báo)
- `npm --prefix web run build` (`tsc -b && vite build`): **PASS** (`0` lỗi TypeScript, bundle thành công 100%)
- `mvnw test-compile` (Spring Boot 4.1.2 / Java 21): **BUILD SUCCESS**

---

## 1. BẢNG TỔNG HỢP KẾT QUẢ ĐỒNG BỘ THEO HẠNG MỤC HỆ THỐNG

| STT | Phân hệ / Hạng mục | Vấn đề phát hiện trước khi đồng bộ | Nội dung đã chuẩn hóa & sửa chữa | File / Thư mục tác động chính |
|:---:|:---|:---|:---|:---|
| 1 | **Tài liệu quy chuẩn (`AGENTS.md`)** | Lệch phiên bản thực tế (`Spring Boot 3.4` vs `4.1.2`, `Vite 6` vs `8.3.5`, `Expo 52` vs `58`); ghi `15 Class` / `6 Enum` trong khi thực tế có `16 Class` & `7 Enum`; thừa thuộc tính ma `dsViPham`, `maVi/matKhauVi`; thiếu ghi chú `@ManyToMany` cho `TienIchPhong`/`PhongYeuThich`; cây thư mục Mục 6.1 chưa khớp chi tiết file của 4 thành viên. | Cập nhật khớp 100% công nghệ, 8 Use Cases (UC 2.1 `YeuCauChuTro`, UC 2.3 Swimlane cọc & hoa hồng, UC 2.6 `CHO_THANH_TOAN`), 16 Class thực thể, 7 Enum hệ thống, cấu trúc `web/src/` Mục 6.1, ma trận 4 thành viên Mục 6.2 và nhánh tích hợp `develop` Mục 6.5. | `AGENTS.md` |
| 2 | **Thư mục gốc & Cấu hình môi trường** | `.idea/*` và `.vscode/mcp.json` bị track nhầm lên Git; tồn tại `package.json` rỗng `{}` ở gốc và script nháp `backend/generate_eer.py` chứa đường dẫn cá nhân; tài liệu rời nằm ngoài `docs/`; `web/.env.example` chứa biến tạm `VITE_DEV_*`. | Gỡ `.idea/`, `.vscode/` khỏi Git index; xóa `package.json`/`package-lock.json` rỗng ở gốc, xóa `backend/generate_eer.py`, xóa `web/src/api/devAuth.ts` và `es-toolkit`; chuyển sơ đồ EER & file phân công vào `docs/`; đồng bộ `.env.example`. | `.env.example`, `web/.env.example`, `docs/*`, `web/package.json` |
| 3 | **Hạ tầng Web, Alias `@/*` & Công nghệ bắt buộc** | Chưa cấu hình alias `@/*` trong Vite/TS; `@heroui/react` v3 và `@tanstack/react-query` v5 đã cài trong `package.json` nhưng có `0` lượt sử dụng thực tế; còn dùng `alert()` trình duyệt. | Cấu hình `@/*` ➔ `./src/*` tại `vite.config.ts` & `tsconfig.app.json`; tích hợp HeroUI v3 Compound Components (`Card`, `Chip`, `Spinner`, `Button` — tuyệt đối không bọc `<HeroUIProvider>`) trên 36 file và `@tanstack/react-query` (`useQuery`, `useMutation`) trên 30 file; thay toàn bộ `alert()` bằng `sonner` toast & Modal chuẩn. | `web/vite.config.ts`, `web/tsconfig.app.json`, `web/src/constants/{roles,navigation,banks}.ts`, `web/src/utils/{formatters,validators}.ts` |
| 4 | **Xác thực JWT & Axios Interceptor** | `axiosClient` chỉ đọc `localStorage` cũ và không gọi `logout()` của Zustand khi `401`; `LoginPage` gọi `getMyProfile()` trước khi lưu `token` gây lỗi `401` ngay lần đăng nhập đầu; thương hiệu trên Navbar ghi `"TrọTốt"` thay vì `"InnFinder"`. | Đồng bộ `axiosClient` đọc token trực tiếp từ `useAuthStore.getState().token` và tự động `logout()` khi gặp `401`; sửa thứ tự lưu token trong `LoginPage` & `RegisterPage`; đồng nhất thương hiệu **InnFinder** trên `Header` & `Footer`. | `web/src/api/axiosClient.ts`, `web/src/store/useAuthStore.ts`, `web/src/components/common/{Header,Footer}.tsx` |
| 5 | **Backend Spring Boot (Tuân thủ Mục 5 `AGENTS.md`)** | Có 8 lệnh `throw new RuntimeException(...)` tiếng Anh/thô (vi phạm Mục 5.2); 3 Request DTO nhận `maNguoiGui`, `nguoiDuyet`, `maNguoiDung` từ body gây rủi ro IDOR (vi phạm Mục 5.3); đảo ngược kinh độ/vĩ độ mặc định tại `RoomService`; thiếu kiểm tra `user.isChuTro()` tại `/api/landlord/reviews`. | Thay toàn bộ bằng `throw new AppException(ErrorCode.*)` với mã lỗi tiếng Việt chuẩn; xóa trường định danh người gửi/duyệt khỏi Request DTO và lấy hoàn toàn từ JWT qua `SecurityUtils`; sửa `kinhDo = "106.6297"`, `viDo = "10.8231"`; siết quyền `isChuTro()` và CORS `SecurityConfig`. | `ErrorCode.java`, `GlobalExceptionHandler.java`, `SecurityUtils.java`, `AdminService.java`, `UserService.java`, `ComplaintService.java`, `ReviewService.java`, `RoomService.java`, `SecurityConfig.java` |

---

## 2. BẢNG CHI TIẾT THAY ĐỔI THEO PHÂN CÔNG 4 THÀNH VIÊN (ĐỂ CÁC THÀNH VIÊN NẮM RÕ KHI PULL)

> **LƯU Ý QUAN TRỌNG CHO CẢ 4 THÀNH VIÊN KHI PULL NHÁNH `develop`:**
> Toàn bộ đường dẫn file và route đã được đưa về đúng chuẩn **Mục 6.1 & Mục 6.2 của `AGENTS.md`** để triệt tiêu xung đột Git về sau. Vui lòng làm việc đúng trong phạm vi thư mục/file sở hữu bên dưới.

### 2.1. Thành viên 1 — Hạ tầng, Auth, Hồ sơ cá nhân & Admin Console
| Nhóm chức năng | Thay đổi về File / Cấu trúc | Thay đổi về Nghiệp vụ & API | Routes chuẩn hiện hành |
|:---|:---|:---|:---|
| **Hạ tầng chung & Shared Components** | - Bổ sung `constants/roles.ts`, `constants/navigation.ts`, hợp nhất `VIETNAM_BANKS`/`BANKS` trong `constants/banks.ts`.<br>- Bổ sung `components/common/{Header,Footer,LoadingSpinner,EmptyState,Modal}.tsx`, `components/map/{RoomMap,MapPicker}.tsx`, `components/charts/PlatformRevenueChart.tsx`.<br>- Xóa `components/layout/*` (chứa link chết và sai tên thương hiệu). | Mở rộng `utils/validators.ts` khớp 100% Regex Mục 3 (`sdt`, `cccd`, `soTaiKhoan`, `maLpt`, `maTienIch`, `withdrawSchema`, `scheduleBookingSchema`). | Dùng chung toàn hệ thống |
| **Auth, Hồ sơ, Ngân hàng & Khiếu nại** | Giữ chuẩn tại:<br>- `pages/auth/{LoginPage,RegisterPage,ForgotPasswordPage}.tsx`<br>- `pages/customer/{ProfilePage,NotificationsPage,ComplaintsPage}.tsx` | - Sửa lỗi `401` khi đăng nhập lần đầu.<br>- Xóa `maNguoiGui` khỏi body gửi khiếu nại (chống IDOR Mục 5.3).<br>- Hỗ trợ mở nhanh modal nâng cấp Chủ trọ qua `/profile?tab=upgrade` và chuyển đổi mượt sang `/landlord/dashboard`. | `/login`, `/register`, `/forgot-password`, `/profile`, `/notifications`, `/complaints` |
| **9 Phân hệ Admin Console** | Giữ chuẩn tại `pages/admin/*` (`DashboardPage`, `UsersPage`, `PostsPage`, `ViewingsPage`, `TransactionsPage`, `ReviewsPage`, `ComplaintsAdminPage`, `CategoriesPage`, `StatisticsPage`). | - **Doanh thu Sàn** trên `DashboardPage` & `StatisticsPage` tính chuẩn 100% từ tổng `phiThu` của `PhieuDatLich` có `trangThai = 'HOAN_THANH'` (không tính từ `GiaoDich`).<br>- Đồng bộ chuẩn 7 Enum (xóa `TU_CHOI` ở phòng trọ, xóa `DANG_XU_LY` ở giao dịch, sửa nhãn `HOAN_TIEN` = `"Hoàn tiền"`). | `/admin/dashboard`, `/admin/users`, `/admin/posts`, `/admin/viewings`, `/admin/transactions`, `/admin/reviews`, `/admin/complaints`, `/admin/categories`, `/admin/statistics` |

---

### 2.2. Thành viên 2 — Khám phá, Tìm kiếm, Bản đồ & Chi tiết Phòng trọ
| File cũ (Đã xóa / Di chuyển) | File chuẩn mới (Theo `AGENTS.md §6.1 & §6.2`) | Nội dung đã sửa & nâng cấp | Routes chuẩn hiện hành |
|:---|:---|:---|:---|
| `pages/HomePage.tsx`<br>`pages/SearchMapPage.tsx`<br>`pages/RoomDetailPage.tsx`<br>`pages/FavoritesPage.tsx` | `pages/customer/HomePage.tsx`<br>`pages/customer/SearchPage.tsx`<br>`pages/customer/RoomDetailPage.tsx`<br>`pages/customer/FavoritesPage.tsx` | - Chuyển toàn bộ 4 trang về `pages/customer/` đúng quy hoạch.<br>- `FavoritesPage` chạy trực tiếp trong `CustomerLayout` đồng nhất.<br>- `RoomDetailPage` hiển thị đầy đủ tiền cọc hợp đồng (`cocPhong`), mức cọc giữ chân lịch xem (`soTienCoc`), điểm uy tín chủ trọ (`diemUyTin`), bản đồ Leaflet `RoomMap`, và nút **"Đặt lịch xem phòng"** điều hướng thật sang `/appointments/schedule/:roomId`. | `/`<br>`/search`<br>`/room/:id`<br>`/favorites` |
| `components/search/MapView.tsx`<br>`components/search/FilterModal.tsx` | `components/map/RoomMap.tsx`<br>`components/room/FilterModal.tsx` | - Sửa `FilterModal` lọc theo mã `amenity.maTienIch` (`TI0001`...) thay vì tên tiếng Việt.<br>- Tích hợp tìm kiếm ngữ nghĩa AI (`POST /api/rooms/ai-search`) ngay trên thanh tìm kiếm `SearchPage`. | — |
| `store/useFilterStore.ts`<br>*(Hàm favorite gộp trong `room.service.ts`)* | `store/useRoomFilterStore.ts`<br>`services/favorite.service.ts`<br>`services/room.service.ts` | - Đổi tên store chuẩn `useRoomFilterStore.ts`, tách riêng `favorite.service.ts`.<br>- Sửa URL danh mục sai `/api/room-types` & `/api/amenities` ➔ `/api/categories/room-types` & `/api/categories/amenities`. | — |

---

### 2.3. Thành viên 3 — Đặt lịch xem phòng, Cọc giữ chân, Quyết định thuê, Ví & Đánh giá
| File cũ (Đã xóa / Di chuyển) | File chuẩn mới (Theo `AGENTS.md §6.1 & §6.2`) | Nội dung đã sửa & nâng cấp | Routes chuẩn hiện hành |
|:---|:---|:---|:---|
| `pages/booking/SchedulePage.tsx`<br>`pages/booking/DepositPaymentPage.tsx`<br>`pages/booking/AppointmentsPage.tsx`<br>`pages/booking/RentalDetailPage.tsx`<br>`pages/booking/RentalRequestsPage.tsx`<br>`pages/booking/TransactionsPage.tsx`<br>`pages/booking/TransactionDetailPage.tsx`<br>`pages/booking/ReviewPage.tsx`<br>`pages/booking/BookingLayout.tsx` *(Xóa)*<br>`routes/bookingRoutes.tsx` *(Xóa)* | `pages/customer/SchedulePage.tsx`<br>`pages/customer/DepositPaymentPage.tsx`<br>`pages/customer/AppointmentsPage.tsx`<br>`pages/customer/AppointmentDetailPage.tsx`<br>`pages/customer/RentalsPage.tsx`<br>`pages/customer/WalletPage.tsx` **(Mới)**<br>`pages/customer/TransactionsPage.tsx`<br>`pages/customer/TransactionDetailPage.tsx`<br>`pages/customer/ReviewPage.tsx` | - Hợp nhất toàn bộ giao diện đặt lịch vào `CustomerLayout` chuẩn (vẫn giữ `<Navigate>` tương thích ngược cho các link cũ `/booking/*`).<br>- Bổ sung `WalletPage.tsx` quản lý ví, ngân hàng liên kết & yêu cầu rút tiền tại `/wallet`.<br>- Sửa `SchedulePage` nhận cả `:roomId` lẫn `?roomId=` và tự điền SĐT người dùng.<br>- Xóa lỗi hoàn cọc 2 lần (200%), xóa nút `"+500k Test Ví"` giả lập và xóa chữ `"/tháng"` sai bản chất ở `phiThu` trên `AppointmentDetailPage`.<br>- Bổ sung đính kèm ảnh thực tế tối đa 10MB/ảnh ở `ReviewPage` (UC 2.5). | `/appointments`<br>`/appointments/schedule/:roomId`<br>`/appointments/deposit/:appointmentId`<br>`/appointments/:id`<br>`/rentals`<br>`/wallet`<br>`/transactions`<br>`/transactions/:transactionId`<br>`/reviews/create/:roomId` |
| `services/booking.service.ts` *(Xóa)*<br>`store/useTransactionStore.ts` *(Xóa)*<br>`utils/formatVND.ts` *(Xóa)*<br>`utils/transactionUtils.ts` *(Xóa)* | `services/appointment.service.ts`<br>`services/transaction.service.ts`<br>`services/review.service.ts`<br>`types/transaction.types.ts`<br>`types/review.types.ts` | - Tách `booking.service.ts` thành 3 service độc lập đúng kiến trúc.<br>- Xóa dữ liệu giả `REAL_ROOMS_DB` trong `transactionUtils.ts`, hợp nhất hàm format tiền tệ & trạng thái giao dịch vào `utils/formatters.ts`. | — |

---

### 2.4. Thành viên 4 — Cổng Quản lý Chủ trọ (Landlord Portal)
| File cũ (Đã xóa / Di chuyển) | File chuẩn mới (Theo `AGENTS.md §6.1 & §6.2`) | Nội dung đã sửa & nâng cấp | Routes chuẩn hiện hành |
|:---|:---|:---|:---|
| `components/common/Sidebar.tsx` *(Xóa)*<br>`components/landlord/MapPicker.tsx` *(Chuyển sang `components/map/`)* | `components/landlord/LandlordHeader.tsx`<br>`components/landlord/LandlordSidebar.tsx`<br>`layouts/LandlordLayout.tsx` | - Tách Header/Sidebar Chủ trọ vào `components/landlord/`, hiển thị tên thật từ `useAuthStore` và số dư ví `soDu` / `diemUyTin` động thay vì hardcode `"Trần Văn Khải"` / `"3.860.000 đ"`.<br>- Thêm nút chuyển nhanh về **Cổng Khách thuê (`/`)**. | `/landlord/dashboard`<br>`/landlord/rooms`<br>`/landlord/rooms/create`<br>`/landlord/rooms/edit/:id`<br>`/landlord/appointments`<br>`/landlord/wallet`<br>`/landlord/reviews` |
| `services/landlord.service.ts` | `services/landlord.service.ts` | - **Sửa lỗi nghiêm trọng `if (res.data?.data)`** (do `axiosClient` đã unwrap sẵn `data`, khiến code cũ luôn rơi vào mock và bỏ qua dữ liệu thật từ Backend).<br>- Đồng bộ đúng HTTP Verb & Endpoint với Backend: `PATCH /confirm`, `PATCH /reject` & `/cancel` (`{ liDoHuy }`), `PATCH /decision` (`{ dongY, liDoTuChoi }`), `PATCH /rooms/:id/status`, `GET /api/categories/room-types` & `/amenities`. | — |
| `pages/landlord/CreateRoomPage.tsx`<br>`pages/landlord/AppointmentsPage.tsx` | `pages/landlord/CreateRoomPage.tsx`<br>`pages/landlord/AppointmentsPage.tsx` | - Nâng cấp `CreateRoomPage` thành **Wizard 5 bước** chuẩn Mục 6.2 (1. Thông tin cơ bản ➔ 2. Vị trí & Bản đồ `MapPicker` ➔ 3. Tiện ích `TIxxxx` ➔ 4. Hình ảnh ➔ 5. Giá thuê & Tiền cọc hợp đồng), gửi đúng payload `RoomCreateRequest`.<br>- Chuẩn hóa `AppointmentsPage` đúng Swimlane 2.3: chỉ mở nút quyết định `[Đồng ý cho thuê]` / `[Từ chối]` sau khi khách đã xác nhận `daNhanLaiCoc = true`, đối soát chính xác `(coc - phiThu)` khi cả 2 bên cùng đồng ý. | — |

---

## 3. HƯỚNG DẪN DÀNH CHO CÁC THÀNH VIÊN SAU KHI ĐỌC BẢNG NÀY

1. **Cập nhật code mới nhất từ nhánh `develop`:**
   ```bash
   git checkout develop
   git pull origin develop
   cd web && npm install
   ```
2. **Kiểm tra trước khi commit & push trên nhánh cá nhân:**
   - Luôn chạy `npm --prefix web run lint` và `npm --prefix web run build` đảm bảo `0` lỗi trước khi tạo Pull Request / merge vào `develop`.
   - Tuân thủ tuyệt đối `import type` (`verbatimModuleSyntax: true`), sử dụng alias `@/*`, không dùng `<HeroUIProvider>`, không dùng `alert()`, và chỉ chỉnh sửa trong phạm vi file thuộc sở hữu tại **Mục 6.2 của `AGENTS.md`**.
