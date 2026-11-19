package com.innfinder.backend.controller;

import com.innfinder.backend.dto.chat.ChatRequest;
import com.innfinder.backend.dto.chat.ChatResponse;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chat;

    @PostMapping
    public ApiResponse<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        return ApiResponse.ok(chat.chat(request), "Trợ lý đã trả lời");
    }
}
