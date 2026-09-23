package com.uched.service;

import com.uched.support.FakeIsmis;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class ProspectusEndpointTest {
    static final FakeIsmis ismis = new FakeIsmis();

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("uched.ismis.base-url", ismis::baseUrl);
        r.add("uched.ismis.login-path", () -> "/login");
        r.add("uched.ismis.offered-courses-path", () -> "/offered");
        r.add("uched.ismis.search-path", () -> "/search");
        r.add("uched.ismis.prospectus-path", () -> "/prospectus");
        r.add("uched.ismis.username-field", () -> "user");
        r.add("uched.ismis.password-field", () -> "pass");
        r.add("uched.ismis.allowed-path-prefixes", () -> "/home");
    }

    @AfterAll
    static void stop() {
        ismis.close();
    }

    @Autowired IsmisSessionService sessions;

    @BeforeEach
    void reset() {
        ismis.mode = FakeIsmis.Mode.NORMAL;
        ismis.acceptedPassword = "pw";
        ismis.expireSessions();
    }

    @Test
    void theLiveConnectionServesTheStudentsOwnCurriculum() {
        var opened = sessions.login("241F065", "pw".toCharArray());
        try (var lease = sessions.lease(opened.sessionId())) {
            var p = lease.connection().prospectus();
            assertThat(p.programName()).contains("INFORMATION TECHNOLOGY");
            assertThat(p.courses()).extracting(c -> c.code()).contains("CIS 1101", "CIS 2201", "IT ELEC 3");
        }
    }

    @Test
    void aBusySessionRefusesAConcurrentProspectusFetch() throws InterruptedException {
        var opened = sessions.login("241F065", "pw".toCharArray());
        var lease = sessions.lease(opened.sessionId()); // held, simulating a search in progress
        assertThatThrownBy(() -> sessions.lease(opened.sessionId()))
                .isInstanceOf(com.uched.domain.exception.RateLimitedException.class);
        lease.close();
    }
}
