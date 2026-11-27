package com.innfinder.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Kiểm soát quyền sử dụng chức năng giả lập nộp cọc thử nghiệm dựa trên biến môi trường INNFINDER_TEST_DEPOSIT.
 */
@Component
public class TestDepositAccess {
    private final boolean enabled;

    public TestDepositAccess(@Value("${INNFINDER_TEST_DEPOSIT:false}") boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isAllowed(HttpServletRequest request) {
        return enabled;
    }
}
