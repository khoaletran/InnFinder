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
    INVALID_KEY("Dữ liệu đầu vào không hợp lệ", HttpStatus.BAD_REQUEST);

    private final String message;
    private final HttpStatus statusCode;

    ErrorCode(String message, HttpStatus statusCode) {
        this.message = message;
        this.statusCode = statusCode;
    }
}