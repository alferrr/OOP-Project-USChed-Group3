package com.uched.service;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "uched")
@Getter
@Setter
public class UChedProperties {
    private String termsVersion = "2026-9-2";
    private boolean requireHttps = false;
    private List<String> corsAllowedOrigins = List.of("http://localhost:5173");
    private Consent consent = new Consent();
    private Catalog catalog = new Catalog();
    private Scrape scrape = new Scrape();
    private Generation generation = new Generation();
    private Admin admin = new Admin();
    private IsmisSession ismisSession = new IsmisSession();

    @Getter
    @Setter
    public static class Consent {
        /** HMAC key. The default is for local development only; set UCHED_CONSENT_SECRET elsewhere. */
        private String secret = "dev-only-change-me-dev-only-change-me";
        private long ttlMinutes = 60;
        private String ipSalt = "dev-only-salt";
    }

    @Getter
    @Setter
    public static class Catalog {
        private long ttlHours = 24;
    }

    @Getter
    @Setter
    public static class Scrape {
        private int maxConcurrent = 2;
        private long timeoutSeconds = 180;
    }

    @Getter
    @Setter
    public static class Generation {
        private int cap = 500;
        private int defaultLimit = 20;
    }

    @Getter
    @Setter
    public static class Admin {
        /** Simple shared token for /api/admin/**; blank disables the endpoints. */
        private String token = "";
    }

    /** The ISMIS sign-in session (cookies only, never the password) held in server memory. */
    @Getter
    @Setter
    public static class IsmisSession {
        private long idleMinutes = 20;
        private long maxMinutes = 60;
        private int maxSessions = 100;
    }
}
