package com.innfinder.backend.service;

import com.innfinder.backend.dto.room.RoomDetailResponse;
import com.innfinder.backend.dto.room.RoomFilterRequest;
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiPhongTro;
import com.innfinder.backend.repository.PhongTroRepository;
import com.innfinder.backend.repository.specification.PhongTroSpecification;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Materialize public data inside a short transaction before calling an external AI API. */
@Service
@RequiredArgsConstructor
public class RoomDiscoveryService {
    private final PhongTroRepository repository;
    public record Document(RoomSummaryResponse summary, RoomDetailResponse detail, String text) {}

    @Transactional(readOnly = true)
    public List<Document> find(RoomFilterRequest filter) {
        return repository.findAll(PhongTroSpecification.buildFilter(filter)).stream().map(this::document).toList();
    }

    @Transactional(readOnly = true)
    public List<Document> findByIds(List<String> ids) {
        if (ids.isEmpty()) return List.of();
        return repository.findByMaPhongTroIn(ids).stream()
                .filter(r -> r.getTrangThai() == TrangThaiPhongTro.DA_DUYET).map(this::document).toList();
    }

    private Document document(PhongTro room) {
        RoomDetailResponse detail = RoomDetailResponse.fromEntity(room);
        String amenities = detail.getDsTienIch().stream().map(a -> a.getTenTienIch()).sorted()
                .collect(java.util.stream.Collectors.joining(", "));
        String text = "Loại phòng: " + detail.getLoaiPhong().getTenLoaiPhongTro()
                + ". Địa chỉ: " + room.getDiaChi() + ". Giá thuê: " + room.getGiaThue()
                + " VNĐ/tháng. Diện tích: " + room.getDienTich() + " m². Sức chứa: " + room.getSoNguoi()
                + " người. Tiện ích: " + amenities + ". Mô tả: " + (room.getMoTa() == null ? "" : room.getMoTa());
        return new Document(RoomSummaryResponse.fromEntity(room), detail, text);
    }
}
