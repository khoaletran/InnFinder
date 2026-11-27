package com.innfinder.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.innfinder.backend.config.RoommateRealtimeDbClient;
import com.innfinder.backend.dto.roommate.RoommateDtos.*;
import com.innfinder.backend.entity.*;
import com.innfinder.backend.entity.enums.TrangThaiDatLich;
import com.innfinder.backend.exception.AppException;
import com.innfinder.backend.exception.ErrorCode;
import com.innfinder.backend.repository.NguoiDungRepository;
import com.innfinder.backend.repository.PhieuDatLichRepository;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RoommateService {
    private static final String OPEN = "DANG_TIM";
    private static final String CLOSED = "DA_DU_NGUOI";
    private static final String CREATED = "taoLuc";
    private static final String APP_PENDING = "CHO_DUYET";
    private static final String APP_APPROVED = "DA_DUYET";
    private static final String APP_REJECTED = "TU_CHOI";
    private static final String APP_CANCELLED = "DA_HUY";

    private static final TypeReference<Map<String, Map<String, Object>>> MAP_OF_DOCS = new TypeReference<>() {};
    private static final TypeReference<Map<String, Object>> SINGLE_MAP = new TypeReference<>() {};

    private final RoommateRealtimeDbClient rtdb;
    private final PhieuDatLichRepository bookings;
    private final NguoiDungRepository users;

    public Page<Post> list(String area, Long maxPrice, String gender, int limit, String cursor) {
        Map<String, Map<String, Object>> raw = rtdb.get("baiOGhep", MAP_OF_DOCS);
        if (raw == null || raw.isEmpty()) {
            return new Page<>(List.of(), null);
        }

        String normalizedArea = (area != null && !area.isBlank())
                ? area.strip().toLowerCase(Locale.ROOT)
                : null;
        String normalizedGender = (gender != null && !gender.isBlank()) ? gender.strip() : null;

        List<Map.Entry<String, Map<String, Object>>> filtered = raw.entrySet().stream()
                .filter(e -> e.getValue() != null && OPEN.equals(str(e.getValue().get("trangThai"))))
                .filter(e -> {
                    if (normalizedArea == null) return true;
                    String khuVucTim = str(e.getValue().get("khuVucTim"));
                    return khuVucTim != null && khuVucTim.contains(normalizedArea);
                })
                .filter(e -> {
                    if (normalizedGender == null || "KHONG_YEU_CAU".equals(normalizedGender)) return true;
                    String postGender = str(e.getValue().get("gioiTinhUuTien"));
                    return postGender == null || "KHONG_YEU_CAU".equals(postGender) || normalizedGender.equals(postGender);
                })
                .filter(e -> maxPrice == null || num(e.getValue().get("chiPhiMoiNguoi")) <= maxPrice)
                .sorted(Comparator.comparingLong((Map.Entry<String, Map<String, Object>> e) -> num(e.getValue().get(CREATED))).reversed()
                        .thenComparing(Map.Entry::getKey))
                .toList();

        return paginate(filtered, limit, cursor, e -> post(e.getKey(), e.getValue(), null));
    }

    public Post detail(String id) {
        Map<String, Object> doc = requirePost(rtdb.get("baiOGhep/" + id, SINGLE_MAP));
        String username = SecurityUtils.getCurrentUsername();
        String userId = username == null ? null : users.findByTenDangNhap(username)
                .map(NguoiDung::getMaNguoiDung).orElse(null);
        return post(id, doc, userId);
    }

    public Page<Post> mine(int limit, String cursor) {
        String userId = currentUser().getMaNguoiDung();
        Map<String, Map<String, Object>> raw = rtdb.get("baiOGhep", MAP_OF_DOCS);
        if (raw == null || raw.isEmpty()) {
            return new Page<>(List.of(), null);
        }

        List<Map.Entry<String, Map<String, Object>>> mineList = raw.entrySet().stream()
                .filter(e -> e.getValue() != null && userId.equals(str(e.getValue().get("maNguoiDang"))))
                .sorted(Comparator.comparingLong((Map.Entry<String, Map<String, Object>> e) -> num(e.getValue().get(CREATED))).reversed()
                        .thenComparing(Map.Entry::getKey))
                .toList();

        return paginate(mineList, limit, cursor, e -> post(e.getKey(), e.getValue(), userId));
    }

    public Page<Comment> comments(String id, int limit, String cursor) {
        requirePost(rtdb.get("baiOGhep/" + id, SINGLE_MAP));
        Map<String, Map<String, Object>> raw = rtdb.get("binhLuanOGhep/" + id, MAP_OF_DOCS);
        if (raw == null || raw.isEmpty()) {
            return new Page<>(List.of(), null);
        }

        Map<String, List<Comment>> repliesByParent = new HashMap<>();
        List<Map.Entry<String, Map<String, Object>>> topLevel = new ArrayList<>();

        for (var entry : raw.entrySet()) {
            Map<String, Object> data = entry.getValue();
            if (data == null) continue;
            String parentId = str(data.get("parentId"));
            if (parentId == null || parentId.isBlank()) {
                topLevel.add(entry);
            } else {
                repliesByParent.computeIfAbsent(parentId, k -> new ArrayList<>())
                        .add(toComment(entry.getKey(), data, List.of()));
            }
        }

        repliesByParent.values().forEach(list ->
                list.sort(Comparator.comparing(Comment::guiLuc).thenComparing(Comment::id)));

        topLevel.sort(Comparator.comparingLong((Map.Entry<String, Map<String, Object>> e) -> num(e.getValue().get("guiLuc"))).reversed()
                .thenComparing(Map.Entry::getKey));

        return paginate(topLevel, limit, cursor, e -> {
            List<Comment> replies = repliesByParent.getOrDefault(e.getKey(), List.of());
            return toComment(e.getKey(), e.getValue(), replies);
        });
    }

    @Transactional(readOnly = true)
    public Booking booking(String bookingId) {
        var booking = eligibleBooking(bookingId, currentUser());
        Map<String, Object> active = rtdb.get("baiOGhepDangMo/" + bookingId, SINGLE_MAP);
        var room = booking.getPhongTro();
        Long giaNuoc = room.getGiaNuoc() != null ? room.getGiaNuoc().getGia() : null;
        Boolean giaNuocTheoNguoi = room.getGiaNuoc() != null ? room.getGiaNuoc().getTheoNguoi() : null;
        return new Booking(
                roomType(room),
                image(room),
                active == null ? null : str(active.get("baiDangId")),
                room.getGiaDien(),
                giaNuoc,
                giaNuocTheoNguoi
        );
    }

    @Transactional(readOnly = true)
    public String create(String bookingId, Input input) {
        var user = currentUser();
        var booking = eligibleBooking(bookingId, user);
        Map<String, Object> existingActive = rtdb.get("baiOGhepDangMo/" + bookingId, SINGLE_MAP);
        if (existingActive != null && str(existingActive.get("baiDangId")) != null) {
            throw new AppException(ErrorCode.ROOMMATE_EXISTS);
        }

        var room = booking.getPhongTro();
        var data = postFields(input);
        data.put("maDatLich", bookingId);
        data.put("maPhongTro", room.getMaPhongTro());
        data.put("loaiPhong", roomType(room));
        data.put("anhPhong", image(room));
        data.put("maNguoiDang", user.getMaNguoiDung());
        data.put("tenNguoiDang", displayName(user));
        data.put("soSlotDaDuyet", 0L);
        data.put("trangThai", OPEN);
        data.put(CREATED, Instant.now().toEpochMilli());
        Double lat = parseCoord(room.getViDo());
        Double lng = parseCoord(room.getKinhDo());
        if (lat != null && lng != null) {
            data.put("viDo", lat);
            data.put("kinhDo", lng);
        }

        String postId = rtdb.post("baiOGhep", data);
        rtdb.put("baiOGhepDangMo/" + bookingId, Map.of("baiDangId", postId));
        return postId;
    }

    public void edit(String id, Input input) {
        var userId = currentUser().getMaNguoiDung();
        Map<String, Object> doc = requirePost(rtdb.get("baiOGhep/" + id, SINGLE_MAP));
        checkOwner(doc, userId);
        checkOpen(doc);
        rtdb.patch("baiOGhep/" + id, postFields(input));
    }

    public void close(String id) {
        var userId = currentUser().getMaNguoiDung();
        Map<String, Object> doc = requirePost(rtdb.get("baiOGhep/" + id, SINGLE_MAP));
        checkOwner(doc, userId);
        closePostInternal(id, doc);
    }

    public void comment(String id, CommentInput input) {
        var user = currentUser();
        Map<String, Object> doc = requirePost(rtdb.get("baiOGhep/" + id, SINGLE_MAP));
        checkOpen(doc);

        String resolvedParentId = null;
        if (input.parentId() != null && !input.parentId().isBlank()) {
            String candidateParentId = input.parentId().strip();
            Map<String, Object> parentComment = rtdb.get("binhLuanOGhep/" + id + "/" + candidateParentId, SINGLE_MAP);
            if (parentComment == null || parentComment.isEmpty()) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            String grandParentId = str(parentComment.get("parentId"));
            resolvedParentId = (grandParentId != null && !grandParentId.isBlank()) ? grandParentId : candidateParentId;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("tenNguoiViet", displayName(user));
        payload.put("maNguoiViet", user.getMaNguoiDung());
        payload.put("noiDung", input.noiDung().strip());
        payload.put("guiLuc", Instant.now().toEpochMilli());
        payload.put("chuBai", user.getMaNguoiDung().equals(str(doc.get("maNguoiDang"))));
        if (resolvedParentId != null) {
            payload.put("parentId", resolvedParentId);
        }

        rtdb.post("binhLuanOGhep/" + id, payload);
    }

    // --- ĐĂNG KÝ Ở GHÉP & DUYỆT ĐƠN ---

    public Application apply(String postId, ApplyInput input) {
        var user = currentUser();
        Map<String, Object> doc = requirePost(rtdb.get("baiOGhep/" + postId, SINGLE_MAP));
        checkOpen(doc);

        if (user.getMaNguoiDung().equals(str(doc.get("maNguoiDang")))) {
            throw new AppException(ErrorCode.INVALID_KEY);
        }

        Map<String, Map<String, Object>> existingApps = rtdb.get("dangKyOGhep/" + postId, MAP_OF_DOCS);
        if (existingApps != null) {
            boolean alreadyActive = existingApps.values().stream()
                    .filter(Objects::nonNull)
                    .anyMatch(app -> user.getMaNguoiDung().equals(str(app.get("maNguoiDangKy")))
                            && (APP_PENDING.equals(str(app.get("trangThai")))
                            || APP_APPROVED.equals(str(app.get("trangThai")))));
            if (alreadyActive) {
                throw new AppException(ErrorCode.ROOMMATE_EXISTS);
            }
        }

        long now = Instant.now().toEpochMilli();
        Map<String, Object> appData = new HashMap<>();
        appData.put("postId", postId);
        appData.put("maNguoiDangKy", user.getMaNguoiDung());
        appData.put("tenNguoiDangKy", displayName(user));
        appData.put("sdtLienHe", input.sdtLienHe().strip());
        appData.put("gioiTinh", input.gioiTinh().strip());
        appData.put("ngheNghiep", input.ngheNghiep().strip());
        appData.put("loiNhan", input.loiNhan().strip());
        appData.put("trangThai", APP_PENDING);
        appData.put("lyDoTuChoi", "");
        appData.put("guiLuc", now);
        appData.put("xuLyLuc", 0L);

        String appId = rtdb.post("dangKyOGhep/" + postId, appData);

        Map<String, Object> myAppSummary = new HashMap<>();
        myAppSummary.put("postId", postId);
        myAppSummary.put("khuVuc", str(doc.get("khuVuc")));
        myAppSummary.put("loaiPhong", str(doc.get("loaiPhong")));
        myAppSummary.put("anhPhong", str(doc.get("anhPhong")));
        myAppSummary.put("chiPhiMoiNguoi", num(doc.get("chiPhiMoiNguoi")));
        myAppSummary.put("trangThai", APP_PENDING);
        myAppSummary.put("lyDoTuChoi", "");
        myAppSummary.put("guiLuc", now);
        rtdb.put("dangKyCuaToi/" + user.getMaNguoiDung() + "/" + appId, myAppSummary);

        return toApplication(appId, postId, appData);
    }

    public List<MyApplication> myApplications() {
        String userId = currentUser().getMaNguoiDung();
        Map<String, Map<String, Object>> raw = rtdb.get("dangKyCuaToi/" + userId, MAP_OF_DOCS);
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        return raw.entrySet().stream()
                .filter(e -> e.getValue() != null)
                .sorted(Comparator.comparingLong((Map.Entry<String, Map<String, Object>> e) -> num(e.getValue().get("guiLuc"))).reversed()
                        .thenComparing(Map.Entry::getKey))
                .map(e -> {
                    Map<String, Object> d = e.getValue();
                    return new MyApplication(
                            e.getKey(),
                            str(d.get("postId")),
                            str(d.get("khuVuc")),
                            str(d.get("loaiPhong")),
                            str(d.get("anhPhong")),
                            num(d.get("chiPhiMoiNguoi")),
                            str(d.get("trangThai")),
                            emptyToNull(str(d.get("lyDoTuChoi"))),
                            Instant.ofEpochMilli(num(d.get("guiLuc"))).toString()
                    );
                })
                .toList();
    }

    public List<ReceivedApplication> receivedApplications() {
        String userId = currentUser().getMaNguoiDung();
        Map<String, Map<String, Object>> postsMap = rtdb.get("baiOGhep", MAP_OF_DOCS);
        if (postsMap == null || postsMap.isEmpty()) {
            return List.of();
        }

        List<Map.Entry<String, Map<String, Object>>> myPosts = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> postEntry : postsMap.entrySet()) {
            Map<String, Object> postDoc = postEntry.getValue();
            if (postDoc != null && userId.equals(str(postDoc.get("maNguoiDang")))) {
                myPosts.add(postEntry);
            }
        }
        if (myPosts.isEmpty()) {
            return List.of();
        }

        // Tải song song danh sách đơn theo từng bài đăng thay vì gọi tuần tự từng bài
        Map<String, java.util.concurrent.CompletableFuture<Map<String, Map<String, Object>>>> futures = new LinkedHashMap<>();
        for (Map.Entry<String, Map<String, Object>> postEntry : myPosts) {
            String postId = postEntry.getKey();
            futures.put(postId, java.util.concurrent.CompletableFuture.supplyAsync(
                    () -> rtdb.get("dangKyOGhep/" + postId, MAP_OF_DOCS)));
        }

        List<ReceivedApplication> result = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> postEntry : myPosts) {
            String postId = postEntry.getKey();
            Map<String, Object> postDoc = postEntry.getValue();
            Map<String, Map<String, Object>> appsMap = futures.get(postId).join();
            if (appsMap == null || appsMap.isEmpty()) {
                continue;
            }
            for (Map.Entry<String, Map<String, Object>> appEntry : appsMap.entrySet()) {
                Map<String, Object> appDoc = appEntry.getValue();
                if (appDoc == null) continue;
                long xuLy = num(appDoc.get("xuLyLuc"));
                result.add(new ReceivedApplication(
                        appEntry.getKey(),
                        postId,
                        str(postDoc.get("khuVuc")),
                        str(postDoc.get("loaiPhong")),
                        str(postDoc.get("anhPhong")),
                        num(postDoc.get("chiPhiMoiNguoi")),
                        str(appDoc.get("maNguoiDangKy")),
                        str(appDoc.get("tenNguoiDangKy")),
                        str(appDoc.get("sdtLienHe")),
                        str(appDoc.get("gioiTinh")),
                        str(appDoc.get("ngheNghiep")),
                        str(appDoc.get("loiNhan")),
                        str(appDoc.get("trangThai")),
                        emptyToNull(str(appDoc.get("lyDoTuChoi"))),
                        Instant.ofEpochMilli(num(appDoc.get("guiLuc"))).toString(),
                        xuLy > 0 ? Instant.ofEpochMilli(xuLy).toString() : null
                ));
            }
        }

        result.sort(Comparator.comparing(ReceivedApplication::guiLuc).reversed()
                .thenComparing(ReceivedApplication::id));
        return result;
    }

    public Application myApplicationForPost(String postId) {
        String userId = currentUser().getMaNguoiDung();
        requirePost(rtdb.get("baiOGhep/" + postId, SINGLE_MAP));
        Map<String, Map<String, Object>> raw = rtdb.get("dangKyOGhep/" + postId, MAP_OF_DOCS);
        if (raw == null || raw.isEmpty()) {
            return null;
        }
        return raw.entrySet().stream()
                .filter(e -> e.getValue() != null && userId.equals(str(e.getValue().get("maNguoiDangKy"))))
                .sorted(Comparator.comparingLong((Map.Entry<String, Map<String, Object>> e) -> num(e.getValue().get("guiLuc"))).reversed())
                .map(e -> toApplication(e.getKey(), postId, e.getValue()))
                .findFirst()
                .orElse(null);
    }

    public List<Application> applications(String postId) {
        String userId = currentUser().getMaNguoiDung();
        Map<String, Object> doc = requirePost(rtdb.get("baiOGhep/" + postId, SINGLE_MAP));
        checkOwner(doc, userId);

        Map<String, Map<String, Object>> raw = rtdb.get("dangKyOGhep/" + postId, MAP_OF_DOCS);
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        return raw.entrySet().stream()
                .filter(e -> e.getValue() != null)
                .sorted(Comparator.comparingLong((Map.Entry<String, Map<String, Object>> e) -> num(e.getValue().get("guiLuc"))).reversed()
                        .thenComparing(Map.Entry::getKey))
                .map(e -> toApplication(e.getKey(), postId, e.getValue()))
                .toList();
    }

    public Application approveApplication(String postId, String appId) {
        String userId = currentUser().getMaNguoiDung();
        Map<String, Object> postDoc = requirePost(rtdb.get("baiOGhep/" + postId, SINGLE_MAP));
        checkOwner(postDoc, userId);
        checkOpen(postDoc);

        Map<String, Object> appDoc = rtdb.get("dangKyOGhep/" + postId + "/" + appId, SINGLE_MAP);
        if (appDoc == null || appDoc.isEmpty()) {
            throw new AppException(ErrorCode.ROOMMATE_NOT_FOUND);
        }
        if (!APP_PENDING.equals(str(appDoc.get("trangThai")))) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        long now = Instant.now().toEpochMilli();
        rtdb.patch("dangKyOGhep/" + postId + "/" + appId, Map.of(
                "trangThai", APP_APPROVED,
                "xuLyLuc", now
        ));
        String applicantId = str(appDoc.get("maNguoiDangKy"));
        if (applicantId != null && !applicantId.isBlank()) {
            rtdb.patch("dangKyCuaToi/" + applicantId + "/" + appId, Map.of("trangThai", APP_APPROVED));
        }

        long approvedCount = num(postDoc.get("soSlotDaDuyet")) + 1;
        long neededCount = num(postDoc.get("soNguoiCanTim"));
        rtdb.patch("baiOGhep/" + postId, Map.of("soSlotDaDuyet", approvedCount));
        if (neededCount > 0 && approvedCount >= neededCount) {
            closePostInternal(postId, postDoc);
        }

        appDoc.put("trangThai", APP_APPROVED);
        appDoc.put("xuLyLuc", now);
        return toApplication(appId, postId, appDoc);
    }

    public Application rejectApplication(String postId, String appId, ApplicationDecisionInput input) {
        String userId = currentUser().getMaNguoiDung();
        Map<String, Object> postDoc = requirePost(rtdb.get("baiOGhep/" + postId, SINGLE_MAP));
        checkOwner(postDoc, userId);

        Map<String, Object> appDoc = rtdb.get("dangKyOGhep/" + postId + "/" + appId, SINGLE_MAP);
        if (appDoc == null || appDoc.isEmpty()) {
            throw new AppException(ErrorCode.ROOMMATE_NOT_FOUND);
        }
        if (!APP_PENDING.equals(str(appDoc.get("trangThai")))) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        String reason = (input != null && input.lyDoTuChoi() != null) ? input.lyDoTuChoi().strip() : "";
        long now = Instant.now().toEpochMilli();
        rtdb.patch("dangKyOGhep/" + postId + "/" + appId, Map.of(
                "trangThai", APP_REJECTED,
                "lyDoTuChoi", reason,
                "xuLyLuc", now
        ));
        String applicantId = str(appDoc.get("maNguoiDangKy"));
        if (applicantId != null && !applicantId.isBlank()) {
            rtdb.patch("dangKyCuaToi/" + applicantId + "/" + appId, Map.of(
                    "trangThai", APP_REJECTED,
                    "lyDoTuChoi", reason
            ));
        }

        appDoc.put("trangThai", APP_REJECTED);
        appDoc.put("lyDoTuChoi", reason);
        appDoc.put("xuLyLuc", now);
        return toApplication(appId, postId, appDoc);
    }

    public void cancelApplication(String postId, String appId) {
        String userId = currentUser().getMaNguoiDung();
        Map<String, Object> appDoc = rtdb.get("dangKyOGhep/" + postId + "/" + appId, SINGLE_MAP);
        if (appDoc == null || appDoc.isEmpty()) {
            throw new AppException(ErrorCode.ROOMMATE_NOT_FOUND);
        }
        if (!userId.equals(str(appDoc.get("maNguoiDangKy")))) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        if (!APP_PENDING.equals(str(appDoc.get("trangThai")))) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }

        long now = Instant.now().toEpochMilli();
        rtdb.patch("dangKyOGhep/" + postId + "/" + appId, Map.of(
                "trangThai", APP_CANCELLED,
                "xuLyLuc", now
        ));
        rtdb.patch("dangKyCuaToi/" + userId + "/" + appId, Map.of("trangThai", APP_CANCELLED));
    }

    private void closePostInternal(String id, Map<String, Object> doc) {
        if (OPEN.equals(str(doc.get("trangThai")))) {
            rtdb.patch("baiOGhep/" + id, Map.of("trangThai", CLOSED));
            String bookingId = str(doc.get("maDatLich"));
            if (bookingId != null && !bookingId.isBlank()) {
                rtdb.delete("baiOGhepDangMo/" + bookingId);
            }
        }
    }

    private PhieuDatLich eligibleBooking(String bookingId, NguoiDung user) {
        var booking = bookings.findById(bookingId)
                .filter(value -> user.getMaNguoiDung().equals(value.getKhachHang().getMaNguoiDung()))
                .orElseThrow(() -> new AppException(ErrorCode.APPOINTMENT_NOT_FOUND));
        if (booking.getTrangThai() != TrangThaiDatLich.HOAN_THANH) {
            throw new AppException(ErrorCode.INVALID_APPOINTMENT_STATUS);
        }
        return booking;
    }

    private NguoiDung currentUser() {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) throw new AppException(ErrorCode.UNAUTHENTICATED);
        var user = users.findByTenDangNhap(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        if (Boolean.TRUE.equals(user.getTrangThaiKhoa())) {
            throw new AppException(ErrorCode.ACCOUNT_LOCKED);
        }
        if (user.isChuTro()) {
            throw new AppException(ErrorCode.ACCESS_DENIED);
        }
        return user;
    }

    private static String displayName(NguoiDung user) {
        return (user.getHoVaTen() == null || user.getHoVaTen().isBlank()) ? "Thành viên" : user.getHoVaTen();
    }

    private static Map<String, Object> postFields(Input input) {
        String area = input.khuVuc().strip();
        var fields = new HashMap<String, Object>();
        fields.put("khuVuc", area);
        fields.put("khuVucTim", area.toLowerCase(Locale.ROOT));
        fields.put("soNguoiCanTim", input.soNguoiCanTim().longValue());
        fields.put("chiPhiMoiNguoi", input.chiPhiMoiNguoi());
        fields.put("ngayVaoO", input.ngayVaoO().toString());
        fields.put("moTa", input.moTa().strip());
        fields.put("gioiTinhUuTien", input.gioiTinhUuTien() != null && !input.gioiTinhUuTien().isBlank()
                ? input.gioiTinhUuTien() : "KHONG_YEU_CAU");
        fields.put("tieuChi", input.tieuChi() == null
                ? List.of()
                : input.tieuChi().stream().map(String::strip).filter(s -> !s.isEmpty()).distinct().limit(8).toList());
        if (input.giaDien() != null) {
            fields.put("giaDien", input.giaDien());
        }
        if (input.giaNuoc() != null) {
            fields.put("giaNuoc", input.giaNuoc());
        }
        if (input.giaNuocTheoNguoi() != null) {
            fields.put("giaNuocTheoNguoi", input.giaNuocTheoNguoi());
        }
        return fields;
    }

    private static Post post(String id, Map<String, Object> doc, String userId) {
        String gender = str(doc.get("gioiTinhUuTien"));
        return new Post(
                id,
                str(doc.get("maPhongTro")),
                str(doc.get("loaiPhong")),
                str(doc.get("anhPhong")),
                str(doc.get("khuVuc")),
                num(doc.get("soNguoiCanTim")),
                num(doc.get("soSlotDaDuyet")),
                num(doc.get("chiPhiMoiNguoi")),
                str(doc.get("ngayVaoO")),
                str(doc.get("moTa")),
                gender != null ? gender : "KHONG_YEU_CAU",
                stringList(doc.get("tieuChi")),
                str(doc.get("tenNguoiDang")),
                str(doc.get("trangThai")),
                userId != null && userId.equals(str(doc.get("maNguoiDang"))),
                dbl(doc.get("viDo")),
                dbl(doc.get("kinhDo")),
                doc.get("giaDien") != null ? num(doc.get("giaDien")) : null,
                doc.get("giaNuoc") != null ? num(doc.get("giaNuoc")) : null,
                doc.get("giaNuocTheoNguoi") instanceof Boolean b ? b : null
        );
    }

    private static Comment toComment(String id, Map<String, Object> doc, List<Comment> replies) {
        return new Comment(
                id,
                str(doc.get("tenNguoiViet")),
                str(doc.get("noiDung")),
                Instant.ofEpochMilli(num(doc.get("guiLuc"))).toString(),
                Boolean.TRUE.equals(doc.get("chuBai")),
                str(doc.get("parentId")),
                replies
        );
    }

    private static Application toApplication(String id, String postId, Map<String, Object> doc) {
        long xuLy = num(doc.get("xuLyLuc"));
        return new Application(
                id,
                postId,
                str(doc.get("maNguoiDangKy")),
                str(doc.get("tenNguoiDangKy")),
                str(doc.get("sdtLienHe")),
                str(doc.get("gioiTinh")),
                str(doc.get("ngheNghiep")),
                str(doc.get("loiNhan")),
                str(doc.get("trangThai")),
                emptyToNull(str(doc.get("lyDoTuChoi"))),
                Instant.ofEpochMilli(num(doc.get("guiLuc"))).toString(),
                xuLy > 0 ? Instant.ofEpochMilli(xuLy).toString() : null
        );
    }

    private static String roomType(PhongTro room) {
        return room.getLoaiPhong() == null ? "Phòng trọ" : room.getLoaiPhong().getTenLoaiPhongTro();
    }

    private static String image(PhongTro room) {
        return room.getHinhAnh().stream()
                .sorted(Comparator.comparing((HinhAnh photo) -> !Boolean.TRUE.equals(photo.getLaDaiDien())))
                .map(HinhAnh::getUrl)
                .filter(url -> url != null && !url.isBlank())
                .findFirst().orElse(null);
    }

    private static Map<String, Object> requirePost(Map<String, Object> doc) {
        if (doc == null || doc.isEmpty()) throw new AppException(ErrorCode.ROOMMATE_NOT_FOUND);
        return doc;
    }

    private static void checkOpen(Map<String, Object> doc) {
        if (!OPEN.equals(str(doc.get("trangThai")))) throw new AppException(ErrorCode.ROOMMATE_CLOSED);
    }

    private static void checkOwner(Map<String, Object> doc, String userId) {
        if (!userId.equals(str(doc.get("maNguoiDang")))) throw new AppException(ErrorCode.ACCESS_DENIED);
    }

    private <T> Page<T> paginate(
            List<Map.Entry<String, Map<String, Object>>> sortedEntries,
            int limit,
            String cursor,
            java.util.function.Function<Map.Entry<String, Map<String, Object>>, T> mapper
    ) {
        int startIndex = 0;
        if (cursor != null && !cursor.isBlank()) {
            int found = -1;
            for (int i = 0; i < sortedEntries.size(); i++) {
                if (sortedEntries.get(i).getKey().equals(cursor)) {
                    found = i + 1;
                    break;
                }
            }
            if (found == -1) {
                throw new AppException(ErrorCode.INVALID_KEY);
            }
            startIndex = found;
        }

        List<T> items = new ArrayList<>();
        int end = Math.min(startIndex + limit, sortedEntries.size());
        for (int i = startIndex; i < end; i++) {
            items.add(mapper.apply(sortedEntries.get(i)));
        }
        String nextCursor = end < sortedEntries.size() && !items.isEmpty()
                ? sortedEntries.get(end - 1).getKey()
                : null;
        return new Page<>(items, nextCursor);
    }

    private static List<String> stringList(Object value) {
        if (value instanceof List<?> raw) {
            return raw.stream().filter(Objects::nonNull).map(String::valueOf).toList();
        }
        return List.of();
    }

    private static String emptyToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    private static String str(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static Double parseCoord(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static Double dbl(Object value) {
        if (value instanceof Number n) return n.doubleValue();
        if (value instanceof String s) return parseCoord(s);
        return null;
    }

    private static long num(Object value) {
        if (value instanceof Number n) return n.longValue();
        if (value instanceof String s) {
            try {
                return Long.parseLong(s);
            } catch (NumberFormatException ignored) {
                return 0L;
            }
        }
        return 0L;
    }
}
