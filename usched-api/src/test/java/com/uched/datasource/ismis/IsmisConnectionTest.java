package com.uched.datasource.ismis;

import com.uched.domain.exception.IsmisAuthenticationException;
import com.uched.domain.exception.IsmisNoResultsException;
import com.uched.domain.exception.IsmisSessionExpiredException;
import com.uched.domain.value.Semester;
import com.uched.support.FakeIsmis;
import com.uched.support.FakeIsmisConfig;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IsmisConnectionTest {
    static FakeIsmis ismis;

    @BeforeAll
    static void start() {
        ismis = new FakeIsmis();
    }

    @AfterAll
    static void stop() {
        ismis.close();
    }

    @BeforeEach
    void reset() {
        ismis.mode = FakeIsmis.Mode.NORMAL;
        ismis.acceptedPassword = "correct-horse";
        ismis.expireSessions();
    }

    private IsmisConnection signIn(char[] password) {
        try (IsmisCredentials c = new IsmisCredentials("student".toCharArray(), password)) {
            return IsmisConnection.signIn(FakeIsmisConfig.of(ismis), new IsmisPageParser(), c);
        }
    }

    @Test
    void oneSignInServesSeveralSearchesAndTheCredentialsAreGoneAfterwards() {
        char[] pass = "correct-horse".toCharArray();
        long before = ismis.loginPosts();
        try (IsmisConnection c = signIn(pass)) {
            assertThat(pass).containsOnly('\0'); // destroyed as soon as sign-in returned
            assertThat(c.search(Semester.FIRST, "2026-2027", "CIS 2105").courses()).hasSize(2);
            assertThat(c.search(Semester.FIRST, "2026-2027", "MATH 1101").courses()).hasSize(2);
            assertThatThrownBy(() -> c.search(Semester.FIRST, "2026-2027", "nomatch"))
                    .isInstanceOf(IsmisNoResultsException.class);
            assertThat(c.providesUnits()).isFalse();
        }
        assertThat(ismis.loginPosts() - before).isEqualTo(1);
    }

    @Test
    void wrongCredentialsAreAnAuthenticationFailureNotAnExpiredSession() {
        assertThatThrownBy(() -> signIn("nope".toCharArray()))
                .isExactlyInstanceOf(IsmisAuthenticationException.class);
    }

    @Test
    void aSessionIsmisDropsIsReportedAsExpiredSoTheStudentSignsInAgain() {
        try (IsmisConnection c = signIn("correct-horse".toCharArray())) {
            c.search(Semester.FIRST, "2026-2027", "CIS 2105");
            ismis.expireSessions();
            assertThatThrownBy(() -> c.search(Semester.FIRST, "2026-2027", "CIS 2105"))
                    .isInstanceOf(IsmisSessionExpiredException.class);
        }
    }

    @Test
    void prospectusIsFetchedOnceAndCachedForTheSession() {
        long before = ismis.hits().stream().filter(h -> h.startsWith("GET /prospectus")).count();
        try (IsmisConnection c = signIn("correct-horse".toCharArray())) {
            var p1 = c.prospectus();
            assertThat(p1.programName()).isEqualTo("BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY");
            assertThat(p1.effectiveYear()).isEqualTo("2023");
            assertThat(p1.courses()).hasSize(4);
            var p2 = c.prospectus();
            assertThat(p2).isSameAs(p1); // cached: no second GET
        }
        long after = ismis.hits().stream().filter(h -> h.startsWith("GET /prospectus")).count();
        assertThat(after - before).isEqualTo(1);
    }

    @Test
    void aClosedConnectionCannotSearch() {
        IsmisConnection c = signIn("correct-horse".toCharArray());
        c.close();
        c.close(); // idempotent
        assertThatThrownBy(() -> c.search(Semester.FIRST, "2026-2027", "CIS 2105"))
                .isInstanceOf(IsmisSessionExpiredException.class);
    }
}
