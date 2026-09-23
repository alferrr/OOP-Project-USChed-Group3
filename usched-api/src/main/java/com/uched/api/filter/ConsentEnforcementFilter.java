package com.uched.api.filter;

import com.uched.domain.exception.ConsentRequiredException;
import com.uched.service.ConsentService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** The server-side consent gate: nothing under /api/ismis/** runs without a valid token for the current terms. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 30)
public class ConsentEnforcementFilter extends OncePerRequestFilter {
    public static final String HEADER = "X-Consent-Token";
    public static final String SESSION_ATTRIBUTE = "uched.consentSession";

    private final ConsentService consent;
    private final ErrorWriter errors;

    public ConsentEnforcementFilter(ConsentService consent, ErrorWriter errors) {
        this.consent = consent;
        this.errors = errors;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !req.getRequestURI().startsWith("/api/ismis/") || "OPTIONS".equals(req.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        try {
            var claims = consent.verify(req.getHeader(HEADER));
            req.setAttribute(SESSION_ATTRIBUTE, claims.sessionId());
        } catch (ConsentRequiredException e) {
            errors.write(res, 403, "CONSENT_REQUIRED", e.getMessage());
            return;
        }
        chain.doFilter(req, res);
    }
}
