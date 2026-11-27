package com.innfinder.backend.service;

import com.innfinder.backend.entity.AiUsageLog;
import com.innfinder.backend.exception.*;
import com.innfinder.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RecommendationInteractionService {
    private final RoomDiscoveryService discovery;
    private final AiTrackingService tracking;
    private record Ticket(String actor, Set<String> rooms, Set<String> clicks, long expires) {}
    private record Window(long start, int count) {}
    private final Map<String, Ticket> tickets = new LinkedHashMap<>();
    private final Map<String, Window> rates = new LinkedHashMap<>();

    public synchronized String impression(List<String> ids, String source, String address) {
        long now = System.currentTimeMillis();
        tickets.values().removeIf(t -> t.expires < now);
        rates.values().removeIf(w -> now - w.start >= 60000);
        String actor = SecurityUtils.getCurrentUsername();
        String rateKey = actor != null ? "user:" + actor : "ip:" + address;
        Window previous = rates.getOrDefault(rateKey, new Window(now, 0));
        if (previous.count >= 30) throw new AppException(ErrorCode.AI_BUSY);
        if (rates.size() >= 2000 && !rates.containsKey(rateKey)) throw new AppException(ErrorCode.AI_BUSY);
        rates.put(rateKey, new Window(previous.start, previous.count + 1));
        if (ids == null || ids.isEmpty() || ids.size() > 24 || source == null || !Set.of("home_personalized", "detail_similar").contains(source))
            throw new AppException(ErrorCode.INVALID_KEY);
        List<String> safe = ids.stream().distinct().filter(id -> id != null && id.matches("PT\\d{12}")).toList();
        Set<String> valid = new HashSet<>();
        discovery.findByIds(safe).forEach(d -> valid.add(d.summary().getMaPhongTro()));
        String token = UUID.randomUUID().toString();
        if (tickets.size() >= 2000) tickets.remove(tickets.keySet().iterator().next());
        tickets.put(token, new Ticket(actor, valid, new HashSet<>(), now + 1800000));
        valid.forEach(id -> event("RECOMMEND_IMPRESSION", token, id, source, actor));
        return token;
    }
    public synchronized void click(String token, String room) {
        Ticket ticket = tickets.get(token);
        if (ticket == null || ticket.expires < System.currentTimeMillis()
                || !Objects.equals(ticket.actor, SecurityUtils.getCurrentUsername()) || !ticket.rooms.contains(room))
            throw new AppException(ErrorCode.INVALID_KEY);
        if (ticket.clicks.add(room)) event("RECOMMEND_CLICK", token, room, "visible_card", ticket.actor);
    }
    private void event(String feature, String trace, String room, String source, String actor) {
        tracking.recordAsync(AiUsageLog.builder().traceId(trace).feature(feature).model("hybrid-recommender")
                .searchMode(source).maNguoiDung(actor).maPhongTro(room).status("SUCCESS").metadataSummary("roomId=" + room).build());
    }
}
