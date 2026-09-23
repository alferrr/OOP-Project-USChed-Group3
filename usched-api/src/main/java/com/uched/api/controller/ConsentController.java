package com.uched.api.controller;

import com.uched.api.dto.ConsentDtos.ConsentRequest;
import com.uched.api.dto.ConsentDtos.ConsentResponse;
import com.uched.api.dto.ConsentDtos.TermsResponse;
import com.uched.service.ConsentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/consent")
public class ConsentController {
    private final ConsentService consent;

    public ConsentController(ConsentService consent) {
        this.consent = consent;
    }

    @GetMapping("/terms")
    public TermsResponse terms() {
        var t = consent.currentTerms();
        return new TermsResponse(t.version(), t.text());
    }

    @PostMapping
    public ConsentResponse accept(@Valid @RequestBody ConsentRequest req, HttpServletRequest http) {
        var grant = consent.record(req.termsVersion(), req.agreedTerms(), req.agreedCredentialUse(),
                http.getRemoteAddr(), http.getHeader("User-Agent"));
        return new ConsentResponse(grant.token(), grant.expiresAt());
    }
}
