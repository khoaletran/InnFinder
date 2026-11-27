package com.innfinder.backend.config;

import com.zaxxer.hikari.HikariDataSource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.net.URI;
import java.util.Locale;
import java.util.Set;

@Component
public class TestDepositAccess {
    private static final Set<String> LOCAL_HOSTS = Set.of(
            "localhost", "127.0.0.1", "::1", "[::1]", "0:0:0:0:0:0:0:1", "[0:0:0:0:0:0:0:1]"
    );

    private final boolean enabled;

    public TestDepositAccess(@Value("${INNFINDER_TEST_DEPOSIT:false}") boolean enabled, DataSource dataSource) {
        this.enabled = enabled && isLocalDatabase(dataSource);
    }

    public boolean isAllowed(HttpServletRequest request) {
        return enabled
                && isLocalHost(request.getRemoteAddr())
                && isLocalHost(request.getServerName())
                && request.getHeader("Forwarded") == null
                && request.getHeader("X-Forwarded-For") == null
                && request.getHeader("X-Forwarded-Host") == null
                && request.getHeader("X-Real-IP") == null;
    }

    private static boolean isLocalDatabase(DataSource dataSource) {
        if (!(dataSource instanceof HikariDataSource hikari)) {
            return false;
        }
        String url = hikari.getJdbcUrl();
        if (url == null || !url.startsWith("jdbc:mariadb://")) {
            return false;
        }
        try {
            return isLocalHost(URI.create(url.substring("jdbc:".length())).getHost());
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static boolean isLocalHost(String host) {
        return host != null && LOCAL_HOSTS.contains(host.toLowerCase(Locale.ROOT));
    }
}
