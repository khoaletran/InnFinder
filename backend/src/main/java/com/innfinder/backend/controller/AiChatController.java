package com.innfinder.backend.controller;

import com.innfinder.backend.dto.chat.ChatRequest;
import com.innfinder.backend.dto.chat.ChatResponse;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class AiChatController {
    private final ChatService chatService;

    @PostMapping
    public ApiResponse<ChatResponse> chat(@Valid @RequestBody ChatRequest request) {
        return ApiResponse.ok(chatService.chat(request), "Trợ lý đã trả lời");
    }
}
