package com.innfinder.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TestDepositAccessTests {
    @Test
    void requiresOptInFlag() {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.setServerName("localhost");

        assertFalse(new TestDepositAccess(false).isAllowed(request));
        assertTrue(new TestDepositAccess(true).isAllowed(request));
    }

    @Test
    void allowsExternalAndForwardedRequestsWhenEnabled() {
        var access = new TestDepositAccess(true);

        var external = new MockHttpServletRequest();
        external.setRemoteAddr("192.0.2.1");
        external.setServerName("preview.example.invalid");
        external.addHeader("X-Forwarded-For", "192.0.2.1");
        external.addHeader("X-Forwarded-Host", "preview.example.invalid");

        assertTrue(access.isAllowed(external));
        assertFalse(new TestDepositAccess(false).isAllowed(external));
    }
}
