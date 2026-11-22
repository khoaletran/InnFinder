package com.innfinder.backend.service;

import com.innfinder.backend.entity.*;
import com.innfinder.backend.exception.*;
import com.innfinder.backend.repository.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class LandlordLedgerTests {
    private final ChuTroRepository landlords = mock(ChuTroRepository.class);
    private final GiaoDichRepository transactions = mock(GiaoDichRepository.class);
    private final LandlordLedgerService service = new LandlordLedgerService(landlords, transactions);
    @BeforeEach void setup() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("owner", "", List.of()));
        when(landlords.findByNguoiDung_TenDangNhap("owner")).thenReturn(Optional.of(ChuTro.builder().maChuTro("owner").build()));
    }
    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }
    @Test void cannotReadAnotherUsersReceipt() {
        when(transactions.findById("secret")).thenReturn(Optional.of(GiaoDich.builder()
                .nguoiDung(NguoiDung.builder().maNguoiDung("other").build()).build()));
        assertEquals(ErrorCode.TRANSACTION_NOT_FOUND, assertThrows(AppException.class,
                () -> service.receipt("secret")).getErrorCode());
    }
    @Test void rejectsReversedDateRangeBeforeQueryingLedger() {
        assertEquals(ErrorCode.INVALID_KEY, assertThrows(AppException.class,
                () -> service.search("", "", null, LocalDate.of(2026,11,22), LocalDate.of(2026,11,1), 0, 10)).getErrorCode());
        verifyNoInteractions(transactions);
    }
    @Test void limitsPageSizeEvenIfClientRequestsAllRecords() {
        when(transactions.findAll(org.mockito.ArgumentMatchers.<Specification<GiaoDich>>any(), any(Pageable.class))).thenAnswer(call ->
                new PageImpl<GiaoDich>(List.of(), call.getArgument(1), 0));
        service.search("", "", null, null, null, 0, 100000);
        verify(transactions).findAll(org.mockito.ArgumentMatchers.<Specification<GiaoDich>>any(), argThat((Pageable page) -> page.getPageSize() == 50));
    }
}
