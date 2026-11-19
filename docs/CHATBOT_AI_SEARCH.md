# Trợ lý InnFinder — chatbot và tìm kiếm ngôn ngữ tự nhiên

## Phạm vi giao diện

Chatbot chỉ xuất hiện ở `/`, `/search`, `/room/:id`, `/favorites`, được gắn một lần trong `web/src/layouts/CustomerLayout.tsx`.

- Desktop: nút nổi góc phải dưới; cửa sổ chat gọn, có thể thu nhỏ hoặc bấm Escape.
- Mobile: nút nằm trên bottom tab bar, lệch phải để tránh nút Danh sách/Bản đồ ở giữa.
- Trò chuyện được giữ trong bộ nhớ khi chuyển giữa các trang; tải lại trang sẽ xóa. Đổi tài khoản/đăng xuất cũng xóa, kể cả khi đang ở trang không hiện chatbot.
- Tại trang chi tiết, trợ lý nhận mã phòng đang xem. Nút “Hỏi phòng này” trên thẻ kết quả chỉ rõ phòng cần hỏi.
- Nút Đặt lịch hoặc yêu cầu đặt lịch rõ ràng chuyển đến `/appointments/schedule/:roomId`. Nếu chưa đăng nhập, chuyển đến login và giữ đường dẫn trở lại.
- Chatbot không tạo phiếu hẹn, nộp cọc hoặc xác nhận lịch. Khách tiếp tục chọn ngày/giờ và xác nhận ở màn hình đặt lịch hiện có.

## Bật Gemini

Điền các giá trị sau trong `backend/.env` rồi khởi động lại backend:

```dotenv
GEMINI_API_KEY=<key của bạn>
GEMINI_CHAT_MODEL=gemini-3.5-flash-lite
GEMINI_INDEX_DELAY_MS=60000
GEMINI_REQUEST_TIMEOUT_SECONDS=40
GEMINI_EMBEDDING_TIMEOUT_SECONDS=8
```

Không đặt key trong biến `VITE_*` hay mã frontend. Backend hiện có `BackendApplication.loadDotenv()` để nạp `.env`; biến môi trường hệ điều hành và system properties có ưu tiên cao hơn. Chạy backend từ thư mục `backend/` để đọc đúng `.env`.

Model hội thoại có thể thay qua `GEMINI_CHAT_MODEL`, cần hỗ trợ `generateContent` và structured output. Model embedding vẫn là `gemini-embedding-001`, 768 chiều theo AGENTS.md. Timeout được giới hạn tối đa 40 giây cho hội thoại và 8 giây cho embedding; frontend chờ 60 giây để có thời gian nhận lỗi backend.

Không có key hoặc provider lỗi: hiển thị lỗi tiếng Việt và giữ tin nhắn trong ô nhập. Tìm kiếm thường vẫn hoạt động. Không dùng câu trả lời giả để giả lập Gemini.

## Các file chính

| Khu vực | File | Trách nhiệm |
| --- | --- | --- |
| Chat UI | `web/src/components/chat/RoomChatbot.tsx` | Nút nổi, hội thoại, gợi ý, trạng thái chờ/lỗi, điều hướng |
| Thẻ phòng | `web/src/components/chat/ChatRoomCard.tsx` | Ảnh và thông tin thật, hỏi thêm, đặt lịch |
| Client state | `web/src/store/useChatStore.ts` | Hội thoại và tiêu chí đang hiệu lực, phòng đang chọn |
| API web | `web/src/services/chat.service.ts`, `web/src/types/chat.types.ts` | DTO và gọi API qua axiosClient |
| API backend | `ChatController.java`, `dto/chat/*` | Nhận request đã validate, trả ApiResponse |
| Điều phối | `ChatService.java` | Hiểu ý định bằng JSON có schema; gọi tìm kiếm/đọc phòng; trả lời dựa trên facts |
| Gemini | `GeminiClient.java` | Key phía server, timeout, giới hạn số cuộc gọi đồng thời, lỗi chuẩn |
| Tìm kiếm | `AiSearchService.java`, `AiEmbeddingService.java` | Lọc rồi xếp hạng, không trộn vector khác nguồn |
| Dữ liệu công khai | `RoomDiscoveryService.java` | Chỉ materialize phòng DA_DUYET trong transaction ngắn |
| Index | `AiSchedulingConfig.java` | Bật lịch cập nhật embedding |
| Giới hạn request | `AiRequestLimitFilter.java` | Tối đa 20 request AI/phút/IP trên một backend instance |

## Luồng API

`POST /api/chat` là API công khai cho người tìm phòng. Body:

```json
{
  "message": "Tìm phòng ở Gò Vấp dưới 3 triệu cho 2 người",
  "history": [],
  "roomIds": [],
  "currentRoomId": null,
  "selectedRoomId": null,
  "criteria": null
}
```

Response `data` có `message`, `rooms`, `criteria`, `suggestions`, `searchMode` và `action` (null hoặc `{ "type": "OPEN_BOOKING", "roomId": "PT..." }`). Đường dẫn điều hướng do frontend xây từ roomId đã kiểm tra, không thực thi URL do model sinh.

Model chỉ phân tích ý định và tiêu chí. Backend đối chiếu mã tiện ích/loại phòng với danh mục thật, lọc DB, đọc lại phòng công khai và cung cấp facts cho câu trả lời. Không cung cấp tài khoản, CCCD, ví hay hồ sơ riêng cho model.

### Tối ưu phản hồi và phân loại lỗi

- Một lượt hội thoại phức tạp chỉ dùng một `generateContent`: JSON gồm ý định, tiêu chí và câu trả lời DETAIL/QUESTION dựa trên contextRooms. Không còn cuộc gọi sinh văn bản thứ hai sau khi tìm phòng.
- Với SEARCH, backend giới thiệu các thẻ kết quả dựa trên dữ liệu đã kiểm tra; không bịa nhận xét về chất lượng phòng.
- Câu chào, câu hỏi chính sách cọc phổ biến, yêu cầu giá/cọc/tiện ích đơn giản của phòng đã xác định và mở đặt lịch phòng đang xem được trả trực tiếp, không gọi model. Đây là các phản hồi từ dữ liệu/quy tắc xác định, không phải cache dữ liệu AI cũ.
- “Trọ rẻ” ở đầu hội thoại được hiểu là sắp xếp giá tăng dần, không tự áp một ngân sách giả định.
- Prompt/catalog/facts đã rút gọn; model mặc định dùng MINIMAL thinking và tối đa 1200 output tokens cho JSON.
- Không gọi query embedding nếu chỉ mục ứng viên chưa đầy đủ hoặc khách yêu cầu sắp xếp giá. Chế độ FILTERED vẫn được công bố rõ ở UI.
- Web dùng chung timeout trong `web/src/constants/ai.ts`, báo chờ lâu sau 12 giây và cho dừng chờ để sửa câu hỏi sau 5 giây. Dừng chờ hủy nhận phản hồi ở client; không bảo đảm Google hủy tác vụ đã nhận.
- Phân biệt `AI_TIMEOUT`, `AI_CREDENTIALS_INVALID`, `AI_ACCESS_DENIED`, `AI_QUOTA_EXCEEDED`, `AI_MODEL_UNAVAILABLE`, `AI_REQUEST_REJECTED`, `AI_INVALID_RESPONSE`, `AI_CONNECTION_FAILED`. Lỗi key của provider dùng 502 để không làm logout phiên người dùng của InnFinder.
- Log chỉ có mã lỗi/status/thời gian; không ghi key, URL, nội dung hội thoại hoặc body lỗi từ provider.
- Tham chiếu phòng trong chat đọc được mã seed cũ PT + 10 chữ số và mã hiện hành PT + 12 chữ số. Quy tắc tạo mã phòng mới và schema DB không thay đổi.

Các câu hỏi tiếp nối gửi tối đa 8 lượt lịch sử cùng tiêu chí trước. Thẻ kết quả đánh số để khách có thể nói “phòng thứ hai”. Khi có nhiều phòng mà chưa chọn rõ, bot hỏi lại trước khi mở đặt lịch. Các câu “đặt lịch thế nào?”, “không muốn đặt lịch” không được điều hướng.

`GET /api/rooms/ai-search` giữ dạng danh sách cũ và nhận thêm bộ lọc, limit 1–30. `GET /api/rooms/ai-search/details` trả cả rooms/criteria/searchMode cho SearchPage. Nhánh AI áp dụng các bộ lọc được chọn trên UI; không tự giới hạn vào GPS khi khách chưa chọn bán kính cụ thể.

## Embedding và đồng bộ

- Dùng RETRIEVAL_DOCUMENT cho phòng, RETRIEVAL_QUERY cho truy vấn.
- Không còn vector n-gram thay thế khi Gemini lỗi. Không so sánh vector khác không gian.
- Hash chứa phiên bản model/số chiều/task và nội dung thực tế. Vector phiên bản cũ hoặc không khớp nội dung hiện tại bị bỏ qua.
- Sau khởi động 10 giây, lịch đồng bộ chạy theo `GEMINI_INDEX_DELAY_MS`; mỗi lượt tối đa 20 phòng mới/thay đổi. Không giữ transaction DB trong lúc gọi Gemini.
- Phòng mới vẫn có thể được tìm qua bộ lọc khi chưa có embedding. Nếu tập ứng viên chưa có đầy đủ vector hợp lệ hoặc embedding API lỗi, dùng xếp hạng từ khóa cho toàn bộ tập và trả `searchMode=FILTERED`; UI giải thích rõ.
- Không thêm/sửa schema DB hay migration cũ; dùng tiếp `phong_tro_vector`.
- Bộ lọc nhiều tiện ích yêu cầu đủ tất cả tiện ích đã chọn.

Đây là cách triển khai phù hợp dữ liệu đồ án nhỏ. Hiện vẫn đọc tập ứng viên và tính cosine trong Java; chưa có chỉ mục ANN hay bộ dữ liệu đo chất lượng retrieval. Nhu cầu “gần trường” chưa có dữ liệu POI/khoảng cách được xác minh sẽ chỉ được dùng làm mô tả tìm kiếm, không cam kết khoảng cách.

## Kiểm tra

```powershell
npm --prefix web run build
cd backend
.\mvnw.cmd '-Dtest=ChatServiceTest,AiEmbeddingServiceTest,AiSearchServiceTest,GeminiClientTest' test
```

Các bài test dùng Gemini/repository mock, không gọi provider thật và không sửa dữ liệu DB. Kiểm tra điều hướng đúng phòng, câu hỏi hướng dẫn/negation, ID bịa/phòng không công khai, giữ và áp dụng tiêu chí, ưu tiên bộ lọc web, từ chối tiện ích không tồn tại, không so vector legacy, task type và lỗi thiếu key.

Kiểm thử live chỉ chạy khi chủ động bật (có thể dùng quota/tính phí Google):

```powershell
.\mvnw.cmd '-Dtest=GeminiLiveChatTest' '-Dinnfinder.live-ai=true' test
```

Bài live gửi prompt/schema thực tế và thông tin phòng minh họa tới Google bằng key backend/.env, không dùng dữ liệu DB. Lần đo ngày 19/11/2026: tìm kiếm 12,3 giây, câu hỏi chi tiết tổng hợp 10,1 giây; điều hướng đặt lịch ở service dưới 1 ms. Đây là một lần đo, không phải cam kết độ trễ của Google.

Kiểm thử HTTP trên backend đang chạy cùng ngày: chào hỏi 0,15 giây; “Trọ rẻ” 1,47 giây; hỏi giá phòng seed 0,41 giây; trả hướng điều hướng đặt lịch 0,31 giây; tìm ngôn ngữ tự nhiên “dưới 4 triệu cho 2 người” 11,94 giây, trả 4 phòng ở chế độ SEMANTIC và tất cả thỏa điều kiện giá/sức chứa. Các phép thử chỉ đọc dữ liệu, không tạo lịch hay giao dịch. Có một lần provider trả lỗi tạm thời trước lượt thử thành công; thời gian thực tế vẫn phụ thuộc Google, mạng và DB.

Kiểm tra thủ công sau khi có key: tìm “Gò Vấp dưới 3 triệu cho 2 người”; hỏi tiếp “có máy lạnh”; chọn một thẻ để hỏi giá/cọc; yêu cầu đặt lịch; thử chưa đăng nhập; kiểm tra nút chat chỉ có trên bốn trang; kiểm tra màn hình 390px và desktop.

Tài liệu tham khảo: [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output), [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings).
