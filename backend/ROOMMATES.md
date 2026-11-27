# Chạy tính năng ở ghép

Các biến Firebase nằm chung trong `backend/.env`, theo mẫu trong `backend/.env.example`.
Spring Boot tự nạp `backend/.env` khi khởi chạy từ thư mục gốc hoặc từ `backend`.
Project mặc định là `innfinder-70261`. Khi chạy cloud, điền
`INNFINDER_FIRESTORE_CREDENTIALS_FILE` bằng đường dẫn tuyệt đối đến JSON service
account có quyền đọc và ghi Firestore, ví dụ `C:/secrets/innfinder-firebase.json`.
Lưu JSON ngoài repository. Nếu để đường dẫn trống, thư viện dùng Application
Default Credentials của môi trường, gồm biến hệ điều hành `GOOGLE_APPLICATION_CREDENTIALS`
nếu được thiết lập. Đoạn cấu hình Firebase Web không cấp quyền cho Spring Boot.

Tạo cơ sở dữ liệu Firestore mặc định ở chế độ Native cho project. Từ thư mục gốc,
chạy `firebase deploy --only firestore:indexes --project innfinder-70261` để tạo index.
Rules trong repo chặn mọi truy cập trực tiếp từ Firebase client. Spring Boot
truy cập bằng IAM và kiểm soát quyền người dùng qua JWT.

Nếu cơ sở dữ liệu chỉ phục vụ backend InnFinder, chạy
`firebase deploy --only firestore:rules --project innfinder-70261` để áp dụng rules.
Lệnh này thay thế toàn bộ bộ rules đang công bố. Nếu có tính năng khác dùng Firebase
client, giữ quyền cần thiết cho các collection đó và kiểm tra rằng không có rule
`allow` nào khớp với `baiOGhep`, `baiOGhep/{id}/binhLuan` hoặc `baiOGhepDangMo`.

Để chạy local với emulator (Java 21), dùng `firebase emulators:start --only firestore --project demo-innfinder`.
Đặt `INNFINDER_FIRESTORE_PROJECT_ID=demo-innfinder` và `FIRESTORE_EMULATOR_HOST=127.0.0.1:8085`
trong `backend/.env`, hoặc đặt cả hai thành biến hệ điều hành trong phiên
chạy backend để ưu tiên hơn cấu hình trong file. Luồng tạo bài vẫn cần MariaDB với
dữ liệu thuê thành công.

## Kiểm tra với hai tài khoản

1. Mở chi tiết phiếu thuê `HOAN_THANH` bằng tài khoản khách thuê. Bấm **Tìm bạn ở ghép**
   và đăng bài. Tạo đồng thời hai yêu cầu đăng cho cùng một phiếu chỉ được tạo một bài đang mở.
2. Dùng tài khoản thứ hai xem bài từ landing hoặc tab **Ở ghép** và gửi câu hỏi.
   Tài khoản thứ hai không thể đăng bằng phiếu của người khác hay sửa, đóng bài của họ.
3. Trả lời bằng tài khoản chủ bài. Bình luận của chủ bài có nhãn **Chủ bài**.
4. Đóng bài. Danh sách công khai không còn hiển thị bài, đường dẫn cũ giữ phần hỏi đáp
   và yêu cầu ghi bình luận mới nhận HTTP 409.
