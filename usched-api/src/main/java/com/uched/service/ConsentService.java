package com.uched.service;

import com.uched.domain.exception.ConsentRequiredException;
import com.uched.persistence.entity.ConsentRecordEntity;
import com.uched.persistence.repository.ConsentRecordRepository;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class ConsentService {
    public record Terms(String version, String text) {
    }

    public record Grant(String token, Instant expiresAt) {
    }

    /** Verified contents of a consent token. */
    public record Claims(String sessionId, String termsVersion, Instant expiresAt) {
    }

    private final ConsentRecordRepository records;
    private final UChedProperties props;
    private final String termsText;

    public ConsentService(ConsentRecordRepository records, UChedProperties props) {
        this.records = records;
        this.props = props;
        try {
            this.termsText = new String(new ClassPathResource("terms.md").getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("terms.md is missing from the classpath", e);
        }
    }

    public Terms currentTerms() {
        return new Terms(props.getTermsVersion(), termsText);
    }

    /** Records consent evidence (no credentials, no names) and returns a signed token. */
    public Grant record(String termsVersion, boolean agreedTerms, boolean agreedCredentialUse,
                        String ip, String userAgent) {
        if (!agreedTerms || !agreedCredentialUse || !props.getTermsVersion().equals(termsVersion)) {
            throw new ConsentRequiredException("Both consents are required for the current terms version.");
        }
        String sessionId = UUID.randomUUID().toString();
        Instant now = Instant.now();
        ConsentRecordEntity e = new ConsentRecordEntity();
        e.setSessionId(sessionId);
        e.setTermsVersion(termsVersion);
        e.setAgreedTerms(true);
        e.setAgreedCredentialUse(true);
        e.setIpHash(hash(props.getConsent().getIpSalt() + ":" + (ip == null ? "" : ip)));
        e.setUserAgent(userAgent == null ? null : userAgent.substring(0, Math.min(255, userAgent.length())));
        e.setAcceptedAt(now);
        records.save(e);

        Instant expires = now.plus(Duration.ofMinutes(props.getConsent().getTtlMinutes()));
        return new Grant(sign(sessionId, termsVersion, expires), expires);
    }

    /** Throws ConsentRequiredException unless the token is authentic, unexpired, and for the current terms. */
    public Claims verify(String token) {
        if (token == null || token.isBlank()) {
            throw new ConsentRequiredException("Consent is required before using ISMIS features.");
        }
        int dot = token.indexOf('.');
        if (dot < 1) {
            throw invalid();
        }
        String payloadB64 = token.substring(0, dot);
        byte[] expected = mac(payloadB64);
        byte[] actual;
        try {
            actual = Base64.getUrlDecoder().decode(token.substring(dot + 1));
        } catch (IllegalArgumentException e) {
            throw invalid();
        }
        if (!MessageDigest.isEqual(expected, actual)) {
            throw invalid();
        }
        String payload;
        try {
            payload = new String(Base64.getUrlDecoder().decode(payloadB64), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            throw invalid();
        }
        String[] parts = payload.split("\\|");
        if (parts.length != 3) {
            throw invalid();
        }
        Instant expires = Instant.ofEpochSecond(Long.parseLong(parts[2]));
        if (expires.isBefore(Instant.now())) {
            throw new ConsentRequiredException("Consent has expired. Please accept the terms again.");
        }
        if (!props.getTermsVersion().equals(parts[1])) {
            throw new ConsentRequiredException("The terms have changed. Please review and accept them again.");
        }
        return new Claims(parts[0], parts[1], expires);
    }

    private String sign(String sessionId, String version, Instant expires) {
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
                (sessionId + "|" + version + "|" + expires.getEpochSecond()).getBytes(StandardCharsets.UTF_8));
        return payload + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(mac(payload));
    }

    private byte[] mac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(props.getConsent().getSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC unavailable", e);
        }
    }

    private static String hash(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private static ConsentRequiredException invalid() {
        return new ConsentRequiredException("Consent token is not valid.");
    }
}
