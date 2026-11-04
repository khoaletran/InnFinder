package com.innfinder.backend.exception;

import com.innfinder.backend.dto.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // Bắt lỗi nghiệp vụ do ta tự ném (AppException)
    @ExceptionHandler(value = AppException.class)
    public ResponseEntity<ApiResponse<Void>> handlingAppException(AppException exception) {
        ErrorCode errorCode = exception.getErrorCode();
        return ResponseEntity
                .status(errorCode.getStatusCode())
                .body(ApiResponse.error(errorCode.getMessage()));
    }

    // Bắt lỗi kiểm tra hợp lệ dữ liệu (@Valid ở DTO)
    @ExceptionHandler(value = MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handlingValidation(MethodArgumentNotValidException exception) {
        String defaultMessage = exception.getBindingResult().getFieldError() != null
                ? exception.getBindingResult().getFieldError().getDefaultMessage()
                : ErrorCode.INVALID_KEY.getMessage();

        return ResponseEntity
                .status(ErrorCode.INVALID_KEY.getStatusCode())
                .body(ApiResponse.error(defaultMessage));
    }

    // Bắt mọi lỗi hệ thống còn lại (NullPointer, SQL...)
    @ExceptionHandler(value = Exception.class)
    public ResponseEntity<ApiResponse<Void>> handlingException(Exception exception) {
        return ResponseEntity
                .status(ErrorCode.UNCATEGORIZED_EXCEPTION.getStatusCode())
                .body(ApiResponse.error(exception.getMessage()));
    }
}