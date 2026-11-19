package com.innfinder.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.innfinder.backend.dto.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** A bounded local rate limit for the public AI endpoints; does not trust client-supplied forwarded IPs. */
@Component
@RequiredArgsConstructor
public class AiRequestLimitFilter extends OncePerRequestFilter {
    private final ObjectMapper mapper;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();
    private record Window(long start, int count) {}

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !("POST".equals(request.getMethod()) && "/api/chat".equals(request.getServletPath()))
                && !("GET".equals(request.getMethod()) && request.getServletPath().startsWith("/api/rooms/ai-search"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        long now = System.currentTimeMillis();
        if (windows.size() > 5000) windows.entrySet().removeIf(e -> now - e.getValue().start() >= 60000);
        String address = request.getRemoteAddr();
        boolean full = windows.size() > 5000 && !windows.containsKey(address);
        Window window = full ? null : windows.compute(address, (key, old) ->
                old == null || now - old.start() >= 60000 ? new Window(now, 1) : new Window(old.start(), old.count() + 1));
        if (full || window.count() > 20) {
            response.setStatus(429);
            response.setHeader("Retry-After", "60");
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            mapper.writeValue(response.getWriter(), ApiResponse.error("Bạn đang gửi quá nhiều yêu cầu. Vui lòng chờ một phút nhé."));
            return;
        }
        chain.doFilter(request, response);
    }
}
