package com.uched.api.filter;

import com.uched.service.UChedProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Minimal admin protection (open decision D5): a shared token; a blank token disables the endpoints. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 40)
public class AdminTokenFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Admin-Token";

    private final UChedProperties props;
    private final ErrorWriter errors;

    public AdminTokenFilter(UChedProperties props, ErrorWriter errors) {
        this.props = props;
        this.errors = errors;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !req.getRequestURI().startsWith("/api/admin/") || "OPTIONS".equals(req.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String expected = props.getAdmin().getToken();
        if (expected == null || expected.isBlank()) {
            errors.write(res, 403, "ADMIN_DISABLED", "Admin endpoints are disabled on this server.");
            return;
        }
        String given = req.getHeader(HEADER);
        boolean ok = given != null && MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), given.getBytes(StandardCharsets.UTF_8));
        if (!ok) {
            errors.write(res, 401, "ADMIN_UNAUTHORIZED", "Missing or invalid admin token.");
            return;
        }
        chain.doFilter(req, res);
    }
}
