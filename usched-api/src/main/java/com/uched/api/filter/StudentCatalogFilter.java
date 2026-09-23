package com.uched.api.filter;

import com.uched.domain.exception.IsmisSessionExpiredException;
import com.uched.service.IsmisSessionService;
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
 * Course, schedule, meta and catalog data is private per student, so these endpoints need to know who is
 * asking. That identity comes from the student's own live ISMIS session (the same one signed in via
 * /api/ismis/session): its id, in the X-Ismis-Session header, resolves to the student's ISMIS ID number, which
 * every downstream query is scoped by. A missing or expired session means the same as anywhere else in the
 * app: sign in again.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 35)
public class StudentCatalogFilter extends OncePerRequestFilter {
    public static final String STUDENT_ATTRIBUTE = "uched.studentIdNumber";
    /** Same header name as IsmisController.SESSION_HEADER; duplicated here to avoid a filter-to-controller dependency. */
    public static final String SESSION_HEADER = "X-Ismis-Session";
    // /api/meta/semesters is deliberately left out: it is a fixed, non-student list (1st/2nd Sem, Summer),
    // and the frontend never sends a session header for it.
    private static final String[] SCOPED_PREFIXES = {"/api/courses", "/api/schedules", "/api/catalog",
            "/api/meta/departments", "/api/meta/academic-years"};

    private final IsmisSessionService sessions;
    private final ErrorWriter errors;

    public StudentCatalogFilter(IsmisSessionService sessions, ErrorWriter errors) {
        this.sessions = sessions;
        this.errors = errors;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        if ("OPTIONS".equals(req.getMethod())) {
            return true;
        }
        String path = req.getRequestURI();
        for (String prefix : SCOPED_PREFIXES) {
            if (path.startsWith(prefix)) {
                return false;
            }
        }
        return true;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        try {
            String studentIdNumber = sessions.identify(req.getHeader(SESSION_HEADER));
            req.setAttribute(STUDENT_ATTRIBUTE, studentIdNumber);
        } catch (IsmisSessionExpiredException e) {
            errors.write(res, 401, "ISMIS_SESSION_EXPIRED", e.getMessage());
            return;
        }
        chain.doFilter(req, res);
    }
}
