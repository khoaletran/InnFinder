package com.innfinder.backend.dto.request;

import com.innfinder.backend.entity.enums.MucDoViPham;
import com.innfinder.backend.entity.enums.TrangThaiKhieuNai;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintResolveDTO {

    private String nguoiDuyet;

    @NotNull(message = "Trạng thái khiếu nại không được để trống")
    private TrangThaiKhieuNai trangThai;

    @NotNull(message = "Mức độ vi phạm không được để trống")
    private MucDoViPham mucDoViPham;
}
