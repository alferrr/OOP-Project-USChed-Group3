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
import com.uched.domain.value.Semester;
import java.util.List;
import java.util.UUID;

@SpringBootTest
class SearchJobProspectusUnitsTest {
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
    @Autowired SearchJobService jobs;

    @BeforeEach
    void reset() {
        ismis.mode = FakeIsmis.Mode.NORMAL;
        ismis.acceptedPassword = "pw";
        ismis.expireSessions();
    }

    @Test
    void searchedCoursesTakeTheirRealUnitsFromTheProspectus() throws Exception {
        String session = sessions.login("student-" + UUID.randomUUID(), "pw".toCharArray()).sessionId();
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("CIS 2105"));
        SearchJobService.View v = null;
        for (int i = 0; i < 150; i++) {
            v = jobs.view(id);
            if (v.status() == SearchJobService.Status.DONE || v.status() == SearchJobService.Status.FAILED) break;
            Thread.sleep(100);
        }
        assertThat(v.status()).isEqualTo(SearchJobService.Status.DONE);
        var found = v.items().get(0).found();
        // MATH 1101 is in the prospectus at 2 units; CIS 2105 is not, so it keeps the default.
        assertThat(found).filteredOn(c -> c.code().equals("MATH 1101")).singleElement()
                .extracting(SearchJobService.CourseRef::units).isEqualTo(2.0);
        assertThat(found).filteredOn(c -> c.code().equals("CIS 2105")).singleElement()
                .extracting(SearchJobService.CourseRef::units).isEqualTo(3.0);
    }
}
