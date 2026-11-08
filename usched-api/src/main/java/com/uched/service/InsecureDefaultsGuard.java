package com.uched.service;

import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

/**
 * Refuses to start in a deployed setup (require-https on) while the consent HMAC key or IP salt is still the
 * publicly known development default - anyone could forge consent tokens and reverse the salted IP hashes.
 */
@Component
public class InsecureDefaultsGuard {
    private final UChedProperties props;

    public InsecureDefaultsGuard(UChedProperties props) {
        this.props = props;
    }

    @PostConstruct
    void check() {
        if (props.isRequireHttps()) {
            validate(props.getConsent());
        }
    }

    static void validate(UChedProperties.Consent consent) {
        if (UChedProperties.Consent.DEV_SECRET.equals(consent.getSecret())) {
            throw new IllegalStateException("UCHED_CONSENT_SECRET must be set when UCHED_REQUIRE_HTTPS is on");
        }
        if (UChedProperties.Consent.DEV_IP_SALT.equals(consent.getIpSalt())) {
            throw new IllegalStateException("UCHED_IP_SALT must be set when UCHED_REQUIRE_HTTPS is on");
        }
    }
}
