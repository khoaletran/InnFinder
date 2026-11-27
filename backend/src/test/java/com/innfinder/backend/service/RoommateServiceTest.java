package com.innfinder.backend.service;

import com.innfinder.backend.config.RoommateRealtimeDbClient;
import com.innfinder.backend.dto.roommate.RoommateDtos.*;
import com.innfinder.backend.entity.NguoiDung;
import com.innfinder.backend.entity.PhieuDatLich;
import com.innfinder.backend.entity.PhongTro;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RoommateServiceTest {
    private final PhieuDatLichRepository bookings = mock(PhieuDatLichRepository.class);
    private final NguoiDungRepository users = mock(NguoiDungRepository.class);
    private final RoommateRealtimeDbClient rtdb = mock(RoommateRealtimeDbClient.class);
    private final RoommateService service = new RoommateService(rtdb, bookings, users);
    private final Input input = new Input(
            "Gò Vấp", 1, 1500000L, LocalDate.of(2027, 1, 1),
            "Cần thêm một người", "NAM", List.of("Không hút thuốc", "Sinh viên")
    );

    private final Map<String, Map<String, Object>> store = new ConcurrentHashMap<>();
    private final AtomicInteger seq = new AtomicInteger(1);

    @BeforeEach
    void setUpInMemoryRtdb() {
        store.clear();
        when(rtdb.get(anyString(), any())).thenAnswer(inv -> {
            String path = inv.getArgument(0);
            if ("baiOGhep".equals(path)) {
                return extractPrefix("baiOGhep/");
            }
            if (path.startsWith("binhLuanOGhep/") && path.indexOf('/', "binhLuanOGhep/".length()) < 0) {
                return extractPrefix(path + "/");
            }
            if (path.startsWith("dangKyOGhep/") && path.indexOf('/', "dangKyOGhep/".length()) < 0) {
                return extractPrefix(path + "/");
            }
            if (path.startsWith("dangKyCuaToi/") && path.indexOf('/', "dangKyCuaToi/".length()) < 0) {
                return extractPrefix(path + "/");
            }
            return store.get(path);
        });
        when(rtdb.post(anyString(), any())).thenAnswer(inv -> {
            String path = inv.getArgument(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = new HashMap<>((Map<String, Object>) inv.getArgument(1));
            String id = "-O_KEY_" + String.format("%04d", seq.getAndIncrement());
            store.put(path + "/" + id, payload);
            return id;
        });
        doAnswer(inv -> {
            String path = inv.getArgument(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = new HashMap<>((Map<String, Object>) inv.getArgument(1));
            store.put(path, payload);
            return null;
        }).when(rtdb).put(anyString(), any());
        doAnswer(inv -> {
            String path = inv.getArgument(0);
            @SuppressWarnings("unchecked")
            Map<String, Object> patch = (Map<String, Object>) inv.getArgument(1);
            store.computeIfPresent(path, (k, existing) -> {
                existing.putAll(patch);
                return existing;
            });
            return null;
        }).when(rtdb).patch(anyString(), any());
        doAnswer(inv -> {
            String path = inv.getArgument(0);
            store.remove(path);
            return null;
        }).when(rtdb).delete(anyString());
    }

    private Map<String, Map<String, Object>> extractPrefix(String prefix) {
        Map<String, Map<String, Object>> out = new LinkedHashMap<>();
        store.forEach((k, v) -> {
            if (k.startsWith(prefix)) {
                String id = k.substring(prefix.length());
                if (!id.contains("/")) {
                    out.put(id, v);
                }
            }
        });
        return out.isEmpty() ? null : out;
    }

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void onlyTenantWithCompletedBookingCanCreate() {
        var owner = user("owner", "ND010120260001");
        user("visitor", "ND010120260002");
        var booking = booking("DL123", owner, TrangThaiDatLich.XAC_NHAN);

        login("visitor");
        assertError(ErrorCode.APPOINTMENT_NOT_FOUND, () -> service.create(booking.getMaDatLich(), input));

        login("owner");
        assertError(ErrorCode.INVALID_APPOINTMENT_STATUS, () -> service.create(booking.getMaDatLich(), input));
    }

    @Test
    void rtdbSupportsApplyApproveAutoCloseAndReplies() {
        var owner = user("owner", "ND010120260001");
        user("visitor1", "ND010120260002");
        user("visitor2", "ND010120260003");
        var booking = booking("DL123", owner, TrangThaiDatLich.HOAN_THANH);

        login("owner");
        String postId = service.create(booking.getMaDatLich(), input);
        assertEquals(postId, service.booking(booking.getMaDatLich()).baiDangId());
        assertEquals("NAM", service.detail(postId).gioiTinhUuTien());
        assertEquals(2, service.detail(postId).tieuChi().size());

        // Chặn chủ bài tự đăng ký
        assertError(ErrorCode.INVALID_KEY, () -> service.apply(
                postId, new ApplyInput("0901234567", "NAM", "Sinh viên", "Test")));

        // Visitor 1 gửi đơn + bình luận
        login("visitor1");
        var app1 = service.apply(postId, new ApplyInput("0901112223", "NAM", "Sinh viên ĐH CN", "Mình gọn gàng"));
        assertEquals("CHO_DUYET", app1.trangThai());
        assertEquals(1, service.myApplications().size());
        assertError(ErrorCode.ROOMMATE_EXISTS, () -> service.apply(
                postId, new ApplyInput("0901112223", "NAM", "Sinh viên", "Gửi lại")));

        service.comment(postId, new CommentInput("Có thể vào ở sớm không?", null));
        String askId = service.comments(postId, 20, null).items().getFirst().id();

        // Visitor 2 gửi đơn rồi tự hủy
        login("visitor2");
        var app2 = service.apply(postId, new ApplyInput("0909888777", "NAM", "Nhân viên IT", "Ở lâu dài"));
        service.cancelApplication(postId, app2.id());
        assertEquals("DA_HUY", service.myApplicationForPost(postId).trangThai());

        // Chủ bài trả lời bình luận và duyệt Visitor 1 -> đủ 1/1 slot -> tự động đóng bài
        login("owner");
        service.comment(postId, new CommentInput("Có nhé.", askId));
        var threaded = service.comments(postId, 20, null);
        assertEquals(1, threaded.items().getFirst().replies().size());

        assertEquals(2, service.applications(postId).size());
        var approved = service.approveApplication(postId, app1.id());
        assertEquals("DA_DUYET", approved.trangThai());

        var closedPost = service.detail(postId);
        assertEquals("DA_DU_NGUOI", closedPost.trangThai());
        assertEquals(1, closedPost.soSlotDaDuyet());
        assertNull(service.booking(booking.getMaDatLich()).baiDangId());
        assertError(ErrorCode.ROOMMATE_CLOSED, () -> service.comment(postId, new CommentInput("Còn chỗ?", null)));
    }

    private NguoiDung user(String username, String id) {
        var user = new NguoiDung();
        user.setMaNguoiDung(id);
        user.setHoVaTen(username);
        when(users.findByTenDangNhap(username)).thenReturn(Optional.of(user));
        return user;
    }

    private PhieuDatLich booking(String id, NguoiDung owner, TrangThaiDatLich status) {
        var room = new PhongTro();
        room.setMaPhongTro("PT011126010101");
        room.setHinhAnh(List.of());
        var booking = new PhieuDatLich();
        booking.setMaDatLich(id);
        booking.setKhachHang(owner);
        booking.setPhongTro(room);
        booking.setTrangThai(status);
        when(bookings.findById(id)).thenReturn(Optional.of(booking));
        return booking;
    }

    private void login(String username) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(username, null, List.of()));
    }

    private void assertError(ErrorCode expected, Runnable action) {
        assertEquals(expected, assertThrows(AppException.class, action::run).getErrorCode());
    }
}
