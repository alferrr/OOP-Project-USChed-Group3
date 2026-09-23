package com.uched.api.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Marks /api/ismis/** as sensitive: responses are never cached, and the request attribute lets any
 * logging or diagnostics code skip bodies. USChed also runs no request-body logging anywhere.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class SensitiveRequestMaskingFilter extends OncePerRequestFilter {
    public static final String SENSITIVE_ATTRIBUTE = "uched.sensitive";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        return !req.getRequestURI().startsWith("/api/ismis/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        req.setAttribute(SENSITIVE_ATTRIBUTE, Boolean.TRUE);
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Pragma", "no-cache");
        chain.doFilter(req, res);
    }
}
