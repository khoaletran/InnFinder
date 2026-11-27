package com.innfinder.backend.exception;

import com.innfinder.backend.dto.response.ApiResponse;
import java.io.IOException;
import lombok.extern.slf4j.Slf4j;
import org.apache.catalina.connector.ClientAbortException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

@Slf4j
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

    // Bỏ qua lỗi ghi response khi client chủ động đóng kết nối giữa chừng
    @ExceptionHandler({AsyncRequestNotUsableException.class, ClientAbortException.class})
    public void handleClientAbort(Exception exception) {
        log.debug("Client đã ngắt kết nối trước khi nhận xong phản hồi: {}", exception.getMessage());
    }

    @ExceptionHandler(HttpMessageNotWritableException.class)
    public ResponseEntity<ApiResponse<Void>> handleHttpMessageNotWritable(HttpMessageNotWritableException exception) {
        if (isClientAbortException(exception)) {
            log.debug("Client đã ngắt kết nối khi đang ghi JSON: {}", exception.getMessage());
            return null;
        }
        log.error("Lỗi serialize JSON phản hồi: {}", exception.getMessage(), exception);
        return ResponseEntity
                .status(ErrorCode.UNCATEGORIZED_EXCEPTION.getStatusCode())
                .body(ApiResponse.error(ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage()));
    }

    private boolean isClientAbortException(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof AsyncRequestNotUsableException
                    || current instanceof ClientAbortException
                    || (current instanceof IOException && current.getMessage() != null
                    && (current.getMessage().contains("connection was aborted")
                    || current.getMessage().contains("Broken pipe")
                    || current.getMessage().contains("Connection reset")))) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    // Bắt mọi lỗi hệ thống còn lại (NullPointer, SQL...) - Không lộ thông báo lỗi nội bộ ra Client
    @ExceptionHandler(value = Exception.class)
    public ResponseEntity<ApiResponse<Void>> handlingException(Exception exception) {
        log.error("Lỗi hệ thống chưa phân loại: {}", exception.getMessage(), exception);
        return ResponseEntity
                .status(ErrorCode.UNCATEGORIZED_EXCEPTION.getStatusCode())
                .body(ApiResponse.error(ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage()));
    }
}