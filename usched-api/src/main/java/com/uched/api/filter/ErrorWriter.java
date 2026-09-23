package com.uched.api.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uched.api.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** Filters run before controller advice, so they write the standard error shape themselves. */
@Component
public class ErrorWriter {
    private final ObjectMapper json;

    public ErrorWriter(ObjectMapper json) {
        this.json = json;
    }

    public void write(HttpServletResponse res, int status, String code, String message) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        res.setCharacterEncoding("UTF-8");
        res.setHeader("Cache-Control", "no-store");
        json.writeValue(res.getOutputStream(), new ErrorResponse(code, message));
    }
}
