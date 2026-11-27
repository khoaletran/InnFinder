package com.innfinder.backend.config;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TestDepositAccessTests {
    @Test
    void requiresOptInAndLocalMariaDb() {
        try (HikariDataSource dataSource = new HikariDataSource()) {
            dataSource.setJdbcUrl("jdbc:mariadb://localhost:3307/innfinder_db");
            var request = localRequest();

            assertFalse(new TestDepositAccess(false, dataSource).isAllowed(request));
            assertTrue(new TestDepositAccess(true, dataSource).isAllowed(request));

            dataSource.setJdbcUrl("jdbc:mariadb://db.example.invalid:3306/innfinder_db");
            assertFalse(new TestDepositAccess(true, dataSource).isAllowed(request));

            dataSource.setJdbcUrl("jdbc:mysql://localhost:3306/innfinder_db");
            assertFalse(new TestDepositAccess(true, dataSource).isAllowed(request));
        }
    }

    @Test
    void rejectsExternalAndForwardedRequests() {
        try (HikariDataSource dataSource = new HikariDataSource()) {
            dataSource.setJdbcUrl("jdbc:mariadb://localhost:3307/innfinder_db");
            var access = new TestDepositAccess(true, dataSource);

            var direct = localRequest();
            direct.setRemoteAddr("192.0.2.1");
            assertFalse(access.isAllowed(direct));

            var publicHost = localRequest();
            publicHost.setServerName("preview.example.invalid");
            assertFalse(access.isAllowed(publicHost));

            var forwarded = localRequest();
            forwarded.addHeader("X-Forwarded-For", "192.0.2.1");
            assertFalse(access.isAllowed(forwarded));
        }
    }

    private static MockHttpServletRequest localRequest() {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.setServerName("localhost");
        return request;
    }
}
