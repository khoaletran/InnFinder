package com.innfinder.backend.realtime;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Slf4j
@Service
public class SseNotificationService {

    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;

    private final Map<String, CopyOnWriteArrayList<SseEmitter>> userEmitters = new ConcurrentHashMap<>();
    private final CopyOnWriteArrayList<SseEmitter> adminEmitters = new CopyOnWriteArrayList<>();

    public SseEmitter subscribe(String maNguoiDung, boolean isAdmin) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        CopyOnWriteArrayList<SseEmitter> list = userEmitters.computeIfAbsent(
                maNguoiDung,
                key -> new CopyOnWriteArrayList<>()
        );
        list.add(emitter);

        if (isAdmin) {
            adminEmitters.add(emitter);
        }

        Runnable cleanup = () -> removeEmitter(maNguoiDung, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(() -> {
            emitter.complete();
            cleanup.run();
        });
        emitter.onError(ex -> cleanup.run());

        try {
            emitter.send(SseEmitter.event()
                    .name("connected")
                    .data(Map.of("status", "ok", "userId", maNguoiDung)));
        } catch (IOException ex) {
            cleanup.run();
        }

        return emitter;
    }

    public void sendToUser(String maNguoiDung, String eventName, Object payload) {
        CopyOnWriteArrayList<SseEmitter> emitters = userEmitters.get(maNguoiDung);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            dispatch(emitter, maNguoiDung, eventName, payload);
        }
    }

    public void sendToAdmins(String eventName, Object payload) {
        if (adminEmitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : adminEmitters) {
            dispatch(emitter, null, eventName, payload);
        }
    }

    @Scheduled(fixedRate = 25_000)
    public void sendHeartbeat() {
        userEmitters.forEach((userId, emitters) -> {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (IOException | IllegalStateException ex) {
                    removeEmitter(userId, emitter);
                }
            }
        });
    }

    private void dispatch(SseEmitter emitter, String maNguoiDung, String eventName, Object payload) {
        try {
            emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(payload != null ? payload : Map.of()));
        } catch (IOException | IllegalStateException ex) {
            if (maNguoiDung != null) {
                removeEmitter(maNguoiDung, emitter);
            } else {
                adminEmitters.remove(emitter);
            }
        }
    }

    private void removeEmitter(String maNguoiDung, SseEmitter emitter) {
        adminEmitters.remove(emitter);
        userEmitters.computeIfPresent(maNguoiDung, (key, list) -> {
            list.remove(emitter);
            return list.isEmpty() ? null : list;
        });
    }
}
