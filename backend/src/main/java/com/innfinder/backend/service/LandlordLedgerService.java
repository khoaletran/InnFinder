package com.innfinder.backend.service;

import com.innfinder.backend.dto.appointment.TransactionResponse;
import com.innfinder.backend.entity.GiaoDich;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.exception.*;
import com.innfinder.backend.repository.*;
import com.innfinder.backend.security.SecurityUtils;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class LandlordLedgerService {
    private final ChuTroRepository landlords;
    private final GiaoDichRepository transactions;
    public record LedgerPage(List<TransactionResponse> content, long totalElements, int totalPages, int number) {}
    private String ownerId() {
        return landlords.findByNguoiDung_TenDangNhap(SecurityUtils.getCurrentUsername())
                .orElseThrow(() -> new AppException(ErrorCode.NOT_A_LANDLORD)).getMaChuTro();
    }
    @Transactional(readOnly = true)
    public TransactionResponse receipt(String id) {
        String owner = ownerId();
        GiaoDich tx = transactions.findById(id)
                .filter(t -> t.getNguoiDung().getMaNguoiDung().equals(owner))
                .orElseThrow(() -> new AppException(ErrorCode.TRANSACTION_NOT_FOUND));
        return TransactionResponse.fromEntity(tx);
    }
    @Transactional(readOnly = true)
    public LedgerPage search(String search, String type, TrangThaiGD status, LocalDate from, LocalDate to, int page, int size) {
        String owner = ownerId();
        if (from != null && to != null && from.isAfter(to)) throw new AppException(ErrorCode.INVALID_KEY);
        Specification<GiaoDich> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("nguoiDung").get("maNguoiDung"), owner));
            if (status != null) predicates.add(cb.equal(root.get("trangThai"), status));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.get("ngayGiaoDich"), from.atStartOfDay()));
            if (to != null) predicates.add(cb.lessThan(root.get("ngayGiaoDich"), to.plusDays(1).atStartOfDay()));
            if (type != null && !type.isBlank()) {
                predicates.add(switch (type) {
                    case "COC" -> root.get("loaiGiaoDich").in("COC_XEM_PHONG", "CONG_TIEN_COC");
                    case "FEE" -> cb.or(cb.equal(root.get("loaiGiaoDich"), "THU_HOA_HONG"), cb.greaterThan(root.get("phiHoaHong"), 0L));
                    case "WITHDRAW" -> root.get("loaiGiaoDich").in("RUT_TIEN", "YEU_CAU_RUT_TIEN");
                    case "REFUND" -> cb.or(root.get("loaiGiaoDich").in("HOAN_COC", "HOAN_TIEN_RUT"), cb.equal(root.get("trangThai"), TrangThaiGD.HOAN_TIEN));
                    default -> throw new AppException(ErrorCode.INVALID_KEY);
                });
            }
            if (search != null && !search.isBlank()) {
                String keyword = "%" + search.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
                var appointment = root.join("phieuDatLich", jakarta.persistence.criteria.JoinType.LEFT);
                var room = appointment.join("phongTro", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("maGiaoDich")), keyword, '\\'),
                    cb.like(cb.lower(root.get("noiDung")), keyword, '\\'),
                    cb.like(cb.lower(root.get("maThamChieuNganHang")), keyword, '\\'),
                    cb.like(cb.lower(appointment.get("maDatLich")), keyword, '\\'),
                    cb.like(cb.lower(room.get("maPhongTro")), keyword, '\\')));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<GiaoDich> result = transactions.findAll(spec, PageRequest.of(Math.max(0, page), Math.min(50, Math.max(1, size)),
                Sort.by(Sort.Order.desc("ngayGiaoDich"), Sort.Order.desc("maGiaoDich"))));
        if (result.getTotalPages() > 0 && page >= result.getTotalPages()) {
            result = transactions.findAll(spec, PageRequest.of(result.getTotalPages() - 1, Math.min(50, Math.max(1, size)),
                    Sort.by(Sort.Order.desc("ngayGiaoDich"), Sort.Order.desc("maGiaoDich"))));
        }
        return new LedgerPage(result.stream().map(TransactionResponse::fromEntity).toList(), result.getTotalElements(), result.getTotalPages(), result.getNumber());
    }
}
