/*
 * @ (#) RoomService.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.service;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:06 PM
 */
import com.innfinder.backend.dto.room.RoomDetailResponse;
import com.innfinder.backend.dto.room.RoomFilterRequest;
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.PhongTroRepository;
import com.innfinder.backend.repository.specification.PhongTroSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Slf4j
@Service
@RequiredArgsConstructor
public class RoomService {
    private final PhongTroRepository phongTroRepository;
    /**
     * Tìm kiếm và lọc danh sách phòng trọ đã duyệt kèm phân trang (Public)
     */
    @Transactional(readOnly = true)
    public Page<RoomSummaryResponse> searchRooms(RoomFilterRequest filter) {
        Sort sort = Sort.by(
                "ASC".equalsIgnoreCase(filter.getSortDirection()) ? Sort.Direction.ASC : Sort.Direction.DESC,
                filter.getSortBy() != null ? filter.getSortBy() : "thoiGianDang"
        );
        Pageable pageable = PageRequest.of(
                Math.max(0, filter.getPage()),
                filter.getSize() > 0 ? filter.getSize() : 10,
                sort
        );
        Specification<PhongTro> spec = PhongTroSpecification.buildFilter(filter);
        Page<PhongTro> roomPage = phongTroRepository.findAll(spec, pageable);
        return roomPage.map(RoomSummaryResponse::fromEntity);
    }
    /**
     * Xem thông tin chi tiết một phòng trọ theo mã (Public)
     */
    @Transactional(readOnly = true)
    public RoomDetailResponse getRoomDetail(String maPhongTro) {
        PhongTro room = phongTroRepository.findByMaPhongTro(maPhongTro)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        return RoomDetailResponse.fromEntity(room);
    }
}