package com.innfinder.backend.service;

import java.util.UUID;

/**
 * Thread-scoped context holding non-sensitive metadata for AI usage tracking.
 * Always cleared in a finally block at the service boundary.
 */
public final class AiTrackingContext {

    public static final class State {
        public String traceId = UUID.randomUUID().toString();
        public String feature = "UNKNOWN";
        public String intent;
        public String searchMode;
        public String userId;
        public String metadataSummary;
        public final java.util.List<Runnable> pending = new java.util.ArrayList<>();
    }

    private static final ThreadLocal<State> HOLDER = new ThreadLocal<>();

    private AiTrackingContext() {}

    public static State start(String feature, String userId) {
        State state = new State();
        state.feature = feature != null && !feature.isBlank() ? feature : "UNKNOWN";
        state.userId = userId;
        HOLDER.set(state);
        return state;
    }

    public static State current() {
        return HOLDER.get();
    }

    public static void setIntent(String intent) {
        State s = HOLDER.get();
        if (s != null) s.intent = intent;
    }

    public static void setSearchMode(String searchMode) {
        State s = HOLDER.get();
        if (s != null) s.searchMode = searchMode;
    }

    public static void setMetadataSummary(String summary) {
        State s = HOLDER.get();
        if (s != null && summary != null) {
            s.metadataSummary = summary.length() > 250 ? summary.substring(0, 250) : summary;
        }
    }

    public static void clear() {
        State state = HOLDER.get();
        HOLDER.remove();
        if (state != null) for (Runnable task : state.pending) {
            try { task.run(); } catch (Exception ignored) { /* Observability must not fail a response. */ }
        }
    }
}
