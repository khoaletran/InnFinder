package com.innfinder.backend.controller;

import com.innfinder.backend.dto.appointment.TransactionResponse;
import com.innfinder.backend.dto.response.ApiResponse;
import com.innfinder.backend.entity.enums.TrangThaiGD;
import com.innfinder.backend.service.LandlordLedgerService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/landlord/transactions")
public class LandlordLedgerController {
    private final LandlordLedgerService service;
    @GetMapping
    public ApiResponse<LandlordLedgerService.LedgerPage> search(
            @RequestParam(defaultValue = "") String search, @RequestParam(defaultValue = "") String type,
            @RequestParam(required = false) TrangThaiGD status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok(service.search(search, type, status, fromDate, toDate, page, size), "Lấy giao dịch thành công");
    }
    @GetMapping("/{id}")
    public ApiResponse<TransactionResponse> receipt(@PathVariable String id) {
        return ApiResponse.ok(service.receipt(id), "Lấy biên nhận thành công");
    }
}
