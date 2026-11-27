package com.innfinder.backend.realtime;

import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhieuKhieuNai;
import com.innfinder.backend.entity.PhongTro;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Helper tập trung để phát sự kiện SSE qua ApplicationEventPublisher.
 */
@Component
@RequiredArgsConstructor
public class RealtimePublisher {

    private final ApplicationEventPublisher eventPublisher;

    public void appointmentUpdated(PhieuDatLich phieu) {
        if (phieu == null) return;
        Set<String> targets = new HashSet<>();
        if (phieu.getKhachHang() != null) {
            targets.add(phieu.getKhachHang().getMaNguoiDung());
        }
        if (phieu.getPhongTro() != null && phieu.getPhongTro().getChuPhongTro() != null) {
            targets.add(phieu.getPhongTro().getChuPhongTro().getMaChuTro());
        }
        eventPublisher.publishEvent(new RealtimeNotificationEvent(
                targets,
                false,
                RealtimeNotificationEvent.APPOINTMENT_UPDATED,
                Map.of(
                        "maDatLich", phieu.getMaDatLich(),
                        "trangThai", phieu.getTrangThai() != null ? phieu.getTrangThai().name() : ""
                )
        ));
    }

    public void walletUpdated(String userId, boolean notifyAdmins) {
        Set<String> targets = userId != null ? Set.of(userId) : Set.of();
        eventPublisher.publishEvent(new RealtimeNotificationEvent(
                targets,
                notifyAdmins,
                RealtimeNotificationEvent.WALLET_UPDATED,
                Map.of("userId", userId != null ? userId : "")
        ));
    }

    public void roomUpdated(PhongTro room, boolean notifyAdmins) {
        if (room == null) return;
        Set<String> targets = new HashSet<>();
        if (room.getChuPhongTro() != null) {
            targets.add(room.getChuPhongTro().getMaChuTro());
        }
        eventPublisher.publishEvent(new RealtimeNotificationEvent(
                targets,
                notifyAdmins,
                RealtimeNotificationEvent.ROOM_UPDATED,
                Map.of(
                        "maPhongTro", room.getMaPhongTro(),
                        "trangThai", room.getTrangThai() != null ? room.getTrangThai().name() : ""
                )
        ));
    }

    public void complaintUpdated(PhieuKhieuNai kn) {
        if (kn == null) return;
        Set<String> targets = new HashSet<>();
        if (kn.getNguoiGui() != null) {
            targets.add(kn.getNguoiGui().getMaNguoiDung());
        }
        if (kn.getDoiTuongKhieuNai() != null) {
            targets.add(kn.getDoiTuongKhieuNai().getMaNguoiDung());
        }
        eventPublisher.publishEvent(new RealtimeNotificationEvent(
                targets,
                true,
                RealtimeNotificationEvent.COMPLAINT_UPDATED,
                Map.of(
                        "maKhieuNai", kn.getMaKhieuNai(),
                        "trangThai", kn.getTrangThai() != null ? kn.getTrangThai().name() : ""
                )
        ));
    }

    public void adminQueueUpdated(String userId, String kind) {
        Set<String> targets = userId != null ? Set.of(userId) : Set.of();
        eventPublisher.publishEvent(new RealtimeNotificationEvent(
                targets,
                true,
                RealtimeNotificationEvent.ADMIN_QUEUE_UPDATED,
                Map.of("kind", kind != null ? kind : "")
        ));
    }
}
