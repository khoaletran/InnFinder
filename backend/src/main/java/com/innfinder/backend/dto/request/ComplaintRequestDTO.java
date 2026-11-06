package com.innfinder.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintRequestDTO {

    @NotBlank(message = "Mã người gửi không được để trống")
    private String maNguoiGui;

    @NotBlank(message = "Đối tượng bị khiếu nại không được để trống")
    private String doiTuongKhieuNai;

    @NotBlank(message = "Nội dung vấn đề khiếu nại không được để trống")
    private String vanDe;

    private String hinhAnh;

    @Builder.Default
    private Integer mucDoUuTien = 1;
}
