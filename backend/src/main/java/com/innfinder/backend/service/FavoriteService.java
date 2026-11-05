/*
 * @ (#) FavoriteService.java    1.0     11/5/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.service;


/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/5/2026 10:44 PM
 */
import com.innfinder.backend.dto.room.RoomSummaryResponse;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhongTroRepository;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.ArrayList;
import java.util.List;
@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteService {
    private final NguoiDungRepository nguoiDungRepository;
    private final PhongTroRepository phongTroRepository;
    /**
     * Thêm phòng trọ vào danh sách yêu thích của người dùng hiện tại
     */
    @Transactional
    public void addFavorite(String roomId) {
        NguoiDung currentUser = getAuthenticatedUser();
        // 1. Kiểm tra phòng trọ có tồn tại không
        PhongTro phongTro = phongTroRepository.findByMaPhongTro(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.ROOM_NOT_FOUND));
        if (currentUser.getDsPhongYeuThich() == null) {
            currentUser.setDsPhongYeuThich(new ArrayList<>());
        }
        // 2. Kiểm tra nếu đã thích phòng này rồi thì báo lỗi
        boolean alreadyFavorited = currentUser.getDsPhongYeuThich().stream()
                .anyMatch(room -> room.getMaPhongTro().equals(roomId));
        if (alreadyFavorited) {
            throw new AppException(ErrorCode.ROOM_ALREADY_FAVORITED);
        }
        // 3. Thêm vào danh sách và lưu
        currentUser.getDsPhongYeuThich().add(phongTro);
        nguoiDungRepository.save(currentUser);
        log.info("Người dùng {} đã thêm phòng {} vào danh sách yêu thích", currentUser.getTenDangNhap(), roomId);
    }
    /**
     * Lấy danh sách các phòng trọ yêu thích của tôi
     */
    @Transactional(readOnly = true)
    public List<RoomSummaryResponse> getMyFavorites() {
        NguoiDung currentUser = getAuthenticatedUser();
        if (currentUser.getDsPhongYeuThich() == null || currentUser.getDsPhongYeuThich().isEmpty()) {
            return List.of();
        }
        return currentUser.getDsPhongYeuThich().stream()
                .map(RoomSummaryResponse::fromEntity)
                .toList();
    }
    /**
     * Xóa một phòng trọ khỏi danh sách yêu thích
     */
    @Transactional
    public void removeFavorite(String roomId) {
        NguoiDung currentUser = getAuthenticatedUser();
        if (currentUser.getDsPhongYeuThich() == null || currentUser.getDsPhongYeuThich().isEmpty()) {
            throw new AppException(ErrorCode.FAVORITE_NOT_FOUND);
        }
        // Kiểm tra xem phòng có thực sự nằm trong danh sách yêu thích hay không
        boolean removed = currentUser.getDsPhongYeuThich().removeIf(room -> room.getMaPhongTro().equals(roomId));
        if (!removed) {
            throw new AppException(ErrorCode.FAVORITE_NOT_FOUND);
        }
        nguoiDungRepository.save(currentUser);
        log.info("Người dùng {} đã xóa phòng {} khỏi danh sách yêu thích", currentUser.getTenDangNhap(), roomId);
    }
    /**
     * Hàm helper lấy NguoiDung đang đăng nhập
     */
    private NguoiDung getAuthenticatedUser() {
        String username = SecurityUtils.getCurrentUsername();
        return nguoiDungRepository.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }
}