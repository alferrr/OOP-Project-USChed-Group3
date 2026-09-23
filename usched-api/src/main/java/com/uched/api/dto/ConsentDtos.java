package com.uched.api.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public final class ConsentDtos {
    private ConsentDtos() {
    }

    public record TermsResponse(String version, String text) {
    }

    public record ConsentRequest(@NotBlank String termsVersion, boolean agreedTerms, boolean agreedCredentialUse) {
    }

    public record ConsentResponse(String consentToken, Instant expiresAt) {
    }
}
