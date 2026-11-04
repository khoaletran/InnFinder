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

    // --- PHÂN HỆ 2: PHÒNG TRỌ, DANH MỤC, YÊU THÍCH, CLOUDINARY ---
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

    APPOINTMENT_NOT_FOUND("Không tìm thấy thông tin phiếu đặt lịch", HttpStatus.NOT_FOUND),
    APPOINTMENT_TIME_INVALID("Thời gian hẹn xem phòng phải sau thời điểm hiện tại", HttpStatus.BAD_REQUEST),
    CANNOT_BOOK_OWN_ROOM("Bạn không thể tự đặt lịch xem phòng trọ của chính mình", HttpStatus.BAD_REQUEST),
    INVALID_APPOINTMENT_STATUS("Trạng thái lịch hẹn không hợp lệ để thực hiện thao tác này", HttpStatus.BAD_REQUEST),
    NOT_APPOINTMENT_OWNER("Bạn không có quyền thao tác trên lịch hẹn này", HttpStatus.FORBIDDEN);
    private final String message;
    private final HttpStatus statusCode;

    ErrorCode(String message, HttpStatus statusCode) {
        this.message = message;
        this.statusCode = statusCode;
    }
}