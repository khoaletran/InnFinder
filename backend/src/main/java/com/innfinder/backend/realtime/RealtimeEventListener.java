package com.innfinder.backend.realtime;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class RealtimeEventListener {

    private final SseNotificationService sseNotificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void handleRealtimeEvent(RealtimeNotificationEvent event) {
        if (event.targetUserIds() != null) {
            for (String userId : event.targetUserIds()) {
                if (userId != null && !userId.isBlank()) {
                    sseNotificationService.sendToUser(userId, event.eventType(), event.payload());
                }
            }
        }
        if (event.broadcastAdmins()) {
            sseNotificationService.sendToAdmins(event.eventType(), event.payload());
        }
    }
}
