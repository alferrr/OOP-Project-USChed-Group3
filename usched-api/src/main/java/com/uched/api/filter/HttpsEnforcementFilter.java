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

/** Sends HSTS on secure responses and refuses plain HTTP for /api/ismis/** when requireHttps is on. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class HttpsEnforcementFilter extends OncePerRequestFilter {
    private final UChedProperties props;
    private final ErrorWriter errors;

    public HttpsEnforcementFilter(UChedProperties props, ErrorWriter errors) {
        this.props = props;
        this.errors = errors;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !req.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        boolean secure = req.isSecure() || "https".equalsIgnoreCase(req.getHeader("X-Forwarded-Proto"));
        if (secure) {
            res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        } else if (props.isRequireHttps() && req.getRequestURI().startsWith("/api/ismis/")) {
            errors.write(res, 403, "HTTPS_REQUIRED", "This endpoint is only available over HTTPS.");
            return;
        }
        chain.doFilter(req, res);
    }
}
