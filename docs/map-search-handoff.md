# Bàn giao tìm kiếm và bản đồ

Chỉ làm việc trên nhánh `map`. Kết quả phòng đến từ trang dữ liệu do API trả về. Danh sách và marker cùng dùng trang đó. Tổng số phòng và tổng số trang được tính sau khi áp dụng bộ lọc.

- `GET /api/rooms` nhận thêm `south`, `west`, `north`, `east` cho BBox, hoặc `centerLat`, `centerLng`, `radiusKm` cho bán kính. `sortBy=distance` dùng tâm tìm kiếm và vẫn giữ bộ lọc địa điểm.
- `GET /api/rooms/ai-search/details?prompt=...` nhận cùng bộ lọc, trả `results`, `criteria`, `inferred` và `fallback`. Vùng chủ động ghi đè địa danh cũ. Web lưu tiêu chí đã nhận diện theo đúng câu tìm kiếm trong bộ nhớ phiên và dùng lại khi API AI lỗi. API AI danh sách cũ vẫn dùng được.
- `GET /api/locations/suggestions?query=...` lấy địa danh và bounds từ các phòng đã duyệt có tọa độ. Bounds là vùng bao các vị trí phòng trong DB, không phải ranh giới hành chính.
- URL giữ camera, tâm, bán kính, BBox, bộ lọc, thứ tự và trang. Bấm GPS tạo yêu cầu định vị chủ động và căn camera vừa vòng tìm kiếm.

## Chạy và kiểm tra

1. Tại thư mục gốc, chạy `docker compose up -d mariadb`. Đợi `docker exec innfinder-mariadb healthcheck.sh --connect --innodb_initialized` thành công. Dùng MariaDB cục bộ có seed Flyway cho các kiểm thử này.
2. Tại `backend`, dùng JDK 21 chạy `INNFINDER_DB_MODE=LOCAL SERVER_PORT=8082 bash mvnw spring-boot:run`. Chạy `INNFINDER_DB_MODE=LOCAL bash mvnw test` để kiểm tra khởi động và tìm kiếm với DB. Các test cập nhật trạng thái phòng seed trong giao dịch có rollback.
3. Tại `web`, chạy `npm ci` rồi `VITE_API_URL=http://localhost:8082 npm run dev -- --port 5174`. Chạy `npm run build` và `npm run lint`. Checkout gốc có ba lỗi lint trong `AuthMapPortal.tsx` và `Header.tsx`.
4. Để chạy kiểm thử Chromium, cài `playwright-core` trong thư mục tạm, đặt `NODE_PATH` tới `node_modules` của thư mục đó rồi chạy `node web/scripts/check-map-search.cjs` từ gốc repo. Có thể cấu hình `CHROMIUM_PATH` và `MAP_TEST_URL`. Bài kiểm thử dùng tọa độ do trình duyệt cung cấp, quyền định vị của Chromium và mô phỏng timeout. Bài kiểm thử kiểm tra cả luồng lưu phòng yêu thích của khách. QA cần xác nhận thêm GPS phần cứng và đồng bộ yêu thích với tài khoản đăng nhập.

Rollback bằng `git revert <mã-commit-map>` khi đang trên nhánh `map`, rồi push commit revert lên `map`. Thay đổi này không thêm migration hay sửa schema.

## Backlog P2

- Đo trên 1.000 và 10.000 phòng. Chuyển lọc thô không gian xuống DB, giữ bước chuẩn hóa tọa độ và phép lọc chính xác. Xem xét cache gợi ý có cơ chế làm mới.
- Đánh giá nhà cung cấp tra cứu địa danh ngoài DB và gom cụm marker khi lượng dữ liệu tăng.
