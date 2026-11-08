package com.uched.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class InsecureDefaultsGuardTest {
    @Test
    void rejectsDevSecret() {
        var consent = new UChedProperties.Consent();
        consent.setIpSalt("real-salt");
        assertThrows(IllegalStateException.class, () -> InsecureDefaultsGuard.validate(consent));
    }

    @Test
    void rejectsDevSalt() {
        var consent = new UChedProperties.Consent();
        consent.setSecret("a-real-secret-a-real-secret-a-real-secret");
        assertThrows(IllegalStateException.class, () -> InsecureDefaultsGuard.validate(consent));
    }

    @Test
    void acceptsRealValues() {
        var consent = new UChedProperties.Consent();
        consent.setSecret("a-real-secret-a-real-secret-a-real-secret");
        consent.setIpSalt("real-salt");
        assertDoesNotThrow(() -> InsecureDefaultsGuard.validate(consent));
    }
}
