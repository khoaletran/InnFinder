package com.innfinder.backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION("Lỗi hệ thống không xác định", HttpStatus.INTERNAL_SERVER_ERROR),
    USER_EXISTED("Tên đăng nhập đã tồn tại trên hệ thống", HttpStatus.BAD_REQUEST),
    EMAIL_EXISTED("Email này đã được sử dụng", HttpStatus.BAD_REQUEST),
    USER_NOT_FOUND("Không tìm thấy thông tin người dùng", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED("Tên đăng nhập hoặc mật khẩu không chính xác", HttpStatus.UNAUTHORIZED),
    ACCESS_DENIED("Bạn không có quyền thực hiện hành động này", HttpStatus.FORBIDDEN),
    ACCOUNT_LOCKED("Tài khoản của bạn đã bị khóa bởi Quản trị viên", HttpStatus.FORBIDDEN),
    INVALID_KEY("Dữ liệu đầu vào không hợp lệ", HttpStatus.BAD_REQUEST),
    AI_NOT_CONFIGURED("Trợ lý AI chưa được cấu hình. Vui lòng thử tìm phòng bằng bộ lọc trong lúc này.", HttpStatus.SERVICE_UNAVAILABLE),
    AI_UNAVAILABLE("Trợ lý AI đang bận hoặc mất kết nối. Vui lòng thử lại sau ít phút.", HttpStatus.SERVICE_UNAVAILABLE),
    AI_TIMEOUT("AI phản hồi quá thời gian chờ. Bạn có thể rút gọn câu hỏi rồi gửi lại.", HttpStatus.GATEWAY_TIMEOUT),
    AI_CREDENTIALS_INVALID("Google từ chối API key AI. Vui lòng kiểm tra hoặc thay key trong cấu hình backend.", HttpStatus.BAD_GATEWAY),
    AI_ACCESS_DENIED("API key AI chưa có quyền truy cập model hoặc dịch vụ Gemini. Vui lòng kiểm tra quyền của project trên Google.", HttpStatus.BAD_GATEWAY),
    AI_QUOTA_EXCEEDED("Gemini đã hết hạn mức hoặc đang giới hạn số yêu cầu. Vui lòng kiểm tra quota/billing trên Google AI Studio và thử lại sau.", HttpStatus.TOO_MANY_REQUESTS),
    AI_MODEL_UNAVAILABLE("Model AI đang cấu hình không khả dụng. Vui lòng kiểm tra GEMINI_CHAT_MODEL trong backend.", HttpStatus.BAD_GATEWAY),
    AI_REQUEST_REJECTED("Gemini không chấp nhận cấu hình yêu cầu AI. Vui lòng kiểm tra cấu hình backend.", HttpStatus.BAD_GATEWAY),
    AI_INVALID_RESPONSE("AI chưa trả về câu trả lời hoàn chỉnh. Vui lòng rút gọn câu hỏi rồi thử lại.", HttpStatus.BAD_GATEWAY),
    AI_CONNECTION_FAILED("Backend chưa kết nối được Google Gemini. Vui lòng kiểm tra kết nối mạng rồi thử lại.", HttpStatus.SERVICE_UNAVAILABLE),
    AI_BUSY("Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ một chút rồi thử lại.", HttpStatus.TOO_MANY_REQUESTS),

    // --- PHÂN HỆ 2: PHÒNG TRỌ, DANH MỤC, YÊU THÍCH, CLOUDINARY ---
    ROOM_STATUS_NOT_ALLOWED("Chỉ được mở lại phòng đã cho thuê, đánh dấu đã cho thuê hoặc gỡ tin; phòng chờ duyệt/từ chối phải được Admin duyệt", HttpStatus.BAD_REQUEST),
    ROOM_UNAVAILABLE("Phòng không còn sẵn sàng cho thuê. Vui lòng hủy lịch để xử lý cọc theo thực tế", HttpStatus.BAD_REQUEST),
    ROOM_NOT_FOUND("Không tìm thấy phòng trọ yêu cầu", HttpStatus.NOT_FOUND),
    CATEGORY_NOT_FOUND("Không tìm thấy loại phòng trọ", HttpStatus.NOT_FOUND),
    AMENITY_NOT_FOUND("Không tìm thấy tiện ích yêu cầu", HttpStatus.NOT_FOUND),
    LANDLORD_NOT_FOUND("Không tìm thấy thông tin chủ trọ tương ứng", HttpStatus.NOT_FOUND),
    NOT_A_LANDLORD("Tài khoản chưa được kích hoạt quyền chủ trọ", HttpStatus.FORBIDDEN),
    ROOM_NOT_OWNED("Bạn không sở hữu hoặc không có quyền thao tác trên phòng trọ này", HttpStatus.FORBIDDEN),
    ROOM_ALREADY_FAVORITED("Phòng trọ này đã nằm trong danh sách yêu thích", HttpStatus.BAD_REQUEST),
    FAVORITE_NOT_FOUND("Phòng trọ không có trong danh sách yêu thích của bạn", HttpStatus.NOT_FOUND),
    UPLOAD_IMAGE_FAILED("Lỗi tải hình ảnh lên Cloudinary", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_IMAGE_FILE("Định dạng file tải lên không hợp lệ (chỉ hỗ trợ hình ảnh)", HttpStatus.BAD_REQUEST),
    COMPLAINT_NOT_FOUND("Không tìm thấy phiếu khiếu nại", HttpStatus.NOT_FOUND),
    INVALID_RATING("Điểm đánh giá phải từ 1 đến 5 sao", HttpStatus.BAD_REQUEST),
    REVIEW_NOT_ALLOWED("Bạn chỉ có thể đánh giá phòng sau khi đã xem phòng thực tế hoặc hoàn tất thuê", HttpStatus.FORBIDDEN),
    REVIEW_NOT_FOUND("Không tìm thấy đánh giá yêu cầu", HttpStatus.NOT_FOUND),

    APPOINTMENT_NOT_FOUND("Không tìm thấy thông tin phiếu đặt lịch", HttpStatus.NOT_FOUND),
    APPOINTMENT_TIME_INVALID("Thời gian hẹn xem phòng phải sau thời điểm hiện tại", HttpStatus.BAD_REQUEST),
    CANNOT_BOOK_OWN_ROOM("Bạn không thể tự đặt lịch xem phòng trọ của chính mình", HttpStatus.BAD_REQUEST),
    INVALID_APPOINTMENT_STATUS("Trạng thái lịch hẹn không hợp lệ để thực hiện thao tác này", HttpStatus.BAD_REQUEST),
    NOT_APPOINTMENT_OWNER("Bạn không có quyền thao tác trên lịch hẹn này", HttpStatus.FORBIDDEN),
    INSUFFICIENT_BALANCE("Số dư ví không đủ để thực hiện yêu cầu rút tiền", HttpStatus.BAD_REQUEST),
    LANDLORD_REQUEST_NOT_FOUND("Không tìm thấy đơn đăng ký chủ trọ", HttpStatus.NOT_FOUND),
    DEPOSIT_NOT_REFUNDED_YET("Khách hàng cần xác nhận đã nhận lại cọc từ Chủ trọ trước khi đưa ra quyết định thuê", HttpStatus.BAD_REQUEST),
    DEPOSIT_ALREADY_REFUNDED("Khách hàng đã xác nhận nhận lại cọc cho lịch hẹn này rồi", HttpStatus.BAD_REQUEST),
    DEPOSIT_NOT_PAID_YET("Khách hàng chưa nộp tiền cọc giữ chân cho lịch hẹn này", HttpStatus.BAD_REQUEST),

    // --- GIAO DỊCH & KHO TIỀN HỆ THỐNG ---
    TRANSACTION_NOT_FOUND("Không tìm thấy thông tin giao dịch", HttpStatus.NOT_FOUND),
    TRANSACTION_ALREADY_PROCESSED("Giao dịch này đã được xử lý bởi Quản trị viên khác", HttpStatus.BAD_REQUEST),
    INSUFFICIENT_SYSTEM_TREASURY("Kho tiền hệ thống không đủ số dư khả dụng để giải ngân giao dịch này", HttpStatus.BAD_REQUEST),

    // --- BIỂU PHÍ CỌC & HOA HỒNG SÀN ---
    ROOM_TYPE_NOT_FOUND("Không tìm thấy loại phòng trọ", HttpStatus.NOT_FOUND),
    INVALID_DEPOSIT_FEE("Mức phí thu sàn phải nhỏ hơn số tiền cọc", HttpStatus.BAD_REQUEST),

    // --- TÀI KHOẢN CÁ NHÂN, NGÂN HÀNG & HỒ SƠ CHỦ TRỌ ---
    INVALID_CURRENT_PASSWORD("Mật khẩu hiện tại không chính xác", HttpStatus.BAD_REQUEST),
    BANK_ACCOUNT_EXISTED("Số tài khoản ngân hàng này đã được liên kết trong tài khoản của bạn", HttpStatus.BAD_REQUEST),
    BANK_ACCOUNT_NOT_FOUND("Không tìm thấy tài khoản ngân hàng yêu cầu", HttpStatus.NOT_FOUND),
    BANK_ACCOUNT_NOT_OWNED("Bạn không có quyền sử dụng tài khoản ngân hàng này", HttpStatus.FORBIDDEN),
    ALREADY_A_LANDLORD("Tài khoản của bạn đã được kích hoạt quyền Chủ trọ", HttpStatus.BAD_REQUEST),
    LANDLORD_REQUEST_PENDING("Bạn đã có hồ sơ đăng ký Chủ trọ đang chờ Quản trị viên xét duyệt", HttpStatus.BAD_REQUEST),
    INVALID_LANDLORD_REQUEST_STATUS("Đơn đăng ký chủ trọ không ở trạng thái chờ duyệt", HttpStatus.BAD_REQUEST);

    private final String message;
    private final HttpStatus statusCode;

    ErrorCode(String message, HttpStatus statusCode) {
        this.message = message;
        this.statusCode = statusCode;
    }
}
