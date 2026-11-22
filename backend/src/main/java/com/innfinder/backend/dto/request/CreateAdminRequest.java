package com.innfinder.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateAdminRequest {

    @NotBlank(message = "Tên đăng nhập không được để trống")
    @Size(min = 3, max = 50, message = "Tên đăng nhập phải từ 3 đến 50 ký tự")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Tên đăng nhập chỉ chứa chữ cái, chữ số và dấu gạch dưới")
    private String tenDangNhap;

    @NotBlank(message = "Họ và tên không được để trống")
    @Size(min = 2, max = 100, message = "Họ và tên phải từ 2 đến 100 ký tự")
    private String hoVaTen;

    @NotBlank(message = "Email không được để trống")
    @Pattern(
            regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
            message = "Email không đúng định dạng"
    )
    private String email;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(
            regexp = "^(?:(?:03|05|07|08|09)\\d{8}|\\+84\\d{9})$",
            message = "Số điện thoại Việt Nam không hợp lệ"
    )
    private String sdt;

    @NotBlank(message = "Mật khẩu mới không được để trống")
    @Size(min = 8, max = 100, message = "Mật khẩu phải có tối thiểu 8 ký tự")
    private String matKhau;

    @NotBlank(message = "Vui lòng nhập mật khẩu Quản trị viên hiện tại để xác thực")
    private String matKhauAdminHienTai;
}
