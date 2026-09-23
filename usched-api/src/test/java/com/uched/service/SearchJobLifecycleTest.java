package com.uched.service;

import com.uched.domain.exception.IsmisAuthenticationException;
import com.uched.domain.exception.IsmisSessionExpiredException;
import com.uched.domain.exception.RateLimitedException;
import com.uched.domain.value.Semester;
import com.uched.support.FakeIsmis;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
class SearchJobLifecycleTest {
    static final FakeIsmis ismis = new FakeIsmis();

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("uched.ismis.base-url", ismis::baseUrl);
        r.add("uched.ismis.login-path", () -> "/login");
        r.add("uched.ismis.offered-courses-path", () -> "/offered");
        r.add("uched.ismis.search-path", () -> "/search");
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
    @Autowired ScheduleService scheduleService;
    @Autowired UChedProperties props;

    @BeforeEach
    void reset() {
        ismis.mode = FakeIsmis.Mode.NORMAL;
        ismis.acceptedPassword = "pw";
        ismis.expireSessions();
    }

    /** A fresh, unique student ID number for each test's scenario. */
    private static String student() {
        return "student-" + UUID.randomUUID();
    }

    private String signIn(String idNumber) {
        return sessions.login(idNumber, "pw".toCharArray()).sessionId();
    }

    private SearchJobService.View await(String jobId) throws InterruptedException {
        for (int i = 0; i < 150; i++) {
            var v = jobs.view(jobId);
            if (v.status() == SearchJobService.Status.DONE || v.status() == SearchJobService.Status.FAILED) {
                return v;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("job did not finish");
    }

    @Test
    void searchesRunOneByOneAndOneBadCodeDoesNotStopTheRest() throws Exception {
        String session = signIn(student());
        // "many" behaves like a department search: it spans several pages and now succeeds, fetching all of them.
        String id = jobs.submit(session, Semester.FIRST, "2026-2027",
                List.of("CIS 2105", "nomatch", "many", "MATH 1101", "cis 2105"));
        var v = await(id);

        assertThat(v.status()).isEqualTo(SearchJobService.Status.DONE);
        assertThat(v.items()).extracting(SearchJobService.Item::query)
                .containsExactly("CIS 2105", "nomatch", "many", "MATH 1101"); // duplicate ignoring case is dropped
        assertThat(v.items()).extracting(SearchJobService.Item::status).containsExactly(
                SearchJobService.ItemStatus.DONE, SearchJobService.ItemStatus.NO_RESULTS,
                SearchJobService.ItemStatus.DONE, SearchJobService.ItemStatus.DONE);
        assertThat(v.items().get(0).found()).extracting(SearchJobService.CourseRef::code)
                .containsExactly("CIS 2105", "MATH 1101");
        assertThat(v.items().get(1).message()).contains("nomatch");
        assertThat(v.items().get(2).found()).extracting(SearchJobService.CourseRef::code)
                .containsExactly("AA 3101", "AC 1101", "AC 1102");
    }

    @Test
    void theSameSessionServesLaterJobsWithoutSigningInAgain() throws Exception {
        String session = signIn(student());
        long logins = ismis.loginPosts();
        assertThat(await(jobs.submit(session, Semester.FIRST, "2026-2027", List.of("CIS 2105"))).status())
                .isEqualTo(SearchJobService.Status.DONE);
        assertThat(await(jobs.submit(session, Semester.FIRST, "2026-2027", List.of("MATH 1101"))).status())
                .isEqualTo(SearchJobService.Status.DONE);
        assertThat(ismis.loginPosts()).isEqualTo(logins);
    }

    @Test
    void anUnknownOrMadeUpSessionIdIsRejected() {
        assertThatThrownBy(() -> jobs.submit("not-a-real-session-id", Semester.FIRST, "2026-2027", List.of("CIS 2105")))
                .isInstanceOf(IsmisSessionExpiredException.class);
    }

    @Test
    void anUnknownJobIdIsRejected() {
        assertThatThrownBy(() -> jobs.view("nope")).hasMessageContaining("Unknown");
    }

    @Test
    void jobStatusIsKeyedByTheUnguessableJobIdAlone() throws Exception {
        // Tradeoff: like the ISMIS session id, a job id (a random UUID) is itself the access key for polling
        // its status; there is no separate per-caller ownership check on top of it.
        String id = jobs.submit(signIn(student()), Semester.FIRST, "2026-2027", List.of("CIS 2105"));
        assertThat(await(id).status()).isEqualTo(SearchJobService.Status.DONE);
    }

    @Test
    void signingOutEndsTheSessionImmediately() {
        String session = signIn(student());
        sessions.logout(session);
        assertThatThrownBy(() -> jobs.submit(session, Semester.FIRST, "2026-2027", List.of("CIS 2105")))
                .isInstanceOf(IsmisSessionExpiredException.class);
    }

    @Test
    void anIdleSessionExpires() {
        String session = signIn(student());
        long idle = props.getIsmisSession().getIdleMinutes();
        props.getIsmisSession().setIdleMinutes(0);
        try {
            assertThatThrownBy(() -> jobs.submit(session, Semester.FIRST, "2026-2027", List.of("CIS 2105")))
                    .isInstanceOf(IsmisSessionExpiredException.class);
        } finally {
            props.getIsmisSession().setIdleMinutes(idle);
        }
    }

    @Test
    void signingInAgainReplacesTheOldSessionForTheSameStudent() {
        String idNumber = student();
        String first = signIn(idNumber);
        String second = signIn(idNumber);
        assertThat(second).isNotEqualTo(first);
        assertThatThrownBy(() -> jobs.submit(first, Semester.FIRST, "2026-2027", List.of("CIS 2105")))
                .isInstanceOf(IsmisSessionExpiredException.class);
    }

    @Test
    void theCredentialsAreZeroedWhetherSignInSucceedsOrNot() {
        char[] ok = "pw".toCharArray();
        sessions.login(student(), ok);
        assertThat(ok).containsOnly('\0');

        char[] bad = "wrong".toCharArray();
        assertThatThrownBy(() -> sessions.login(student(), bad)).isExactlyInstanceOf(IsmisAuthenticationException.class);
        assertThat(bad).containsOnly('\0');
    }

    @Test
    void anEndedIsmisSessionStopsTheJobAndAsksToSignInAgain() throws Exception {
        String session = signIn(student());
        ismis.expireSessions(); // ISMIS drops the session behind USChed's back
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("CIS 2105", "MATH 1101"));
        var v = await(id);

        assertThat(v.status()).isEqualTo(SearchJobService.Status.FAILED);
        assertThat(v.errorCode()).isEqualTo("ISMIS_SESSION_EXPIRED");
        assertThat(v.items()).extracting(SearchJobService.Item::status).containsExactly(
                SearchJobService.ItemStatus.FAILED, SearchJobService.ItemStatus.SKIPPED);
        assertThatThrownBy(() -> jobs.submit(session, Semester.FIRST, "2026-2027", List.of("CIS 2105")))
                .isInstanceOf(IsmisSessionExpiredException.class);
    }

    @Test
    void onlyOneSearchRunsAtATimePerStudent() throws Exception {
        String session = signIn(student());
        ismis.mode = FakeIsmis.Mode.SLOW;
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("CIS 2105"));
        assertThatThrownBy(() -> jobs.submit(session, Semester.FIRST, "2026-2027", List.of("MATH 1101")))
                .isInstanceOf(RateLimitedException.class);
        assertThat(await(id).status()).isEqualTo(SearchJobService.Status.DONE);
    }

    @Test
    void geFreelecIsSearchedAsGeFelWithNoNumberAtAll() throws Exception {
        // GE-FEL is the actual, literal ISMIS course code; "GE-FREELEC" (or "GE Free Elective") is just its
        // descriptive long-form name, not something ISMIS searches by, and GE-FEL has no numbered variants at
        // all: the "2" in "GE-FREELEC 2" is a slot number in the curriculum, not part of the code, so it must
        // never be sent to ISMIS. This is a confirmed, known alias, not a guess.
        String session = signIn(student());
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("GE-FREELEC 2"));
        var v = await(id);

        assertThat(v.status()).isEqualTo(SearchJobService.Status.DONE);
        var item = v.items().get(0);
        assertThat(item.status()).isEqualTo(SearchJobService.ItemStatus.DONE);
        assertThat(item.query()).isEqualTo("GE-FREELEC 2"); // shown to the student exactly as they typed it
        assertThat(item.searchedAs()).isEqualTo("GE-FEL"); // what actually went to ISMIS, no "2"
        // GE-FEL is offered as several real electives ("Group 1", "Group 2", ...), the same way any other
        // course has several sections: these collapse into ONE "GE-FEL" catalog entry, not several separate
        // ones, so it shows up once in the student's saved courses no matter how many electives are under it.
        assertThat(item.courses()).isEqualTo(1);
        assertThat(item.sections()).isEqualTo(3);
        assertThat(item.found()).extracting(SearchJobService.CourseRef::code).containsExactly("GE-FEL");

        String search = ismis.bodies().stream().filter(b -> b.contains("Courses=")).reduce((a, b) -> b).orElseThrow();
        assertThat(search).contains("Courses=GE-FEL").doesNotContain("FREELEC");
    }

    @Test
    void choosingAScheduleChoosesWhichRealElectiveFillsTheGeFelSlot() throws Exception {
        // The point of collapsing GE-FEL into one course: the schedule generator already knows how to pick
        // one section per course, so it does the same job here — each ranked schedule carries one specific
        // real elective (Art Appreciation, Entrepreneurial Mind, ...), and picking a schedule is how the
        // student picks which elective they end up with. No separate "choose one" step is needed beforehand.
        String studentId = student();
        String session = signIn(studentId);
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("GE-FEL"));
        var found = await(id).items().get(0).found();
        assertThat(found).hasSize(1);
        long geFelCourseId = found.get(0).id();

        var result = scheduleService.generate(studentId, List.of(geFelCourseId), Semester.FIRST, "2026-2027",
                10, com.uched.engine.preference.SchedulePreference.none(), null);
        assertThat(result.ranked()).isNotEmpty();
        var electivesOffered = result.ranked().stream()
                .flatMap(r -> r.schedule().getSections().stream())
                .map(s -> s.getSectionCode())
                .distinct()
                .toList();
        assertThat(electivesOffered).isNotEmpty().allMatch(code -> code.startsWith("Group"));
    }

    @Test
    void spacedOutFreeElectiveWordingIsAlsoRecognised() throws Exception {
        // Real-world messiness: "GE Free Elec 2" typed by hand, not the tidy "GE-FREELEC" spelling.
        String session = signIn(student());
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("GE Free Elec 2"));
        var v = await(id);
        var item = v.items().get(0);
        assertThat(item.status()).isEqualTo(SearchJobService.ItemStatus.DONE);
        assertThat(item.searchedAs()).isEqualTo("GE-FEL");
    }

    @Test
    void geFreelecWithoutANumberIsAlsoResolved() throws Exception {
        String session = signIn(student());
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("ge-freelec"));
        var v = await(id);
        var item = v.items().get(0);
        assertThat(item.status()).isEqualTo(SearchJobService.ItemStatus.DONE);
        assertThat(item.searchedAs()).isEqualTo("GE-FEL");
    }

    @Test
    void theRealCodeTypedDirectlyIsNotRewritten() throws Exception {
        // "GE-FEL" alone is already the real code: searching it directly must not show a "searched as" note.
        String session = signIn(student());
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("GE-FEL"));
        var v = await(id);
        assertThat(v.items().get(0).searchedAs()).isNull();
    }

    @Test
    void geFelWithASlotNumberTypedDirectlyAlsoHasTheNumberStripped() throws Exception {
        // GE-FEL has no numbered variants at all, however it is typed: "GE-FEL 2" must be searched as bare
        // "GE-FEL" too, the same as the "GE-FREELEC" spelling.
        String session = signIn(student());
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("GE-FEL 2"));
        var v = await(id);
        var item = v.items().get(0);
        assertThat(item.status()).isEqualTo(SearchJobService.ItemStatus.DONE);
        assertThat(item.searchedAs()).isEqualTo("GE-FEL");
    }

    @Test
    void anUnrecognisedQueryHasNoSearchedAsBecauseNothingWasRewritten() throws Exception {
        String session = signIn(student());
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("CIS 2105"));
        var v = await(id);
        assertThat(v.items().get(0).searchedAs()).isNull();
    }

    @Test
    void aPlainNoMatchGetsNoSuggestionsWhenThereIsNoFamilyToBroadenTo() throws Exception {
        String session = signIn(student());
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("nomatch"));
        var v = await(id);
        var item = v.items().get(0);
        assertThat(item.status()).isEqualTo(SearchJobService.ItemStatus.NO_RESULTS);
        assertThat(item.suggestions()).isEmpty(); // "nomatch" has no trailing number to broaden from
    }

    @Test
    void theShortAjaxNoResultsShapeIsAlsoJustNoResults() throws Exception {
        // The real ISMIS shape for a genuinely empty search: a short fragment with no table at all.
        String session = signIn(student());
        String id = jobs.submit(session, Semester.FIRST, "2026-2027", List.of("shortnomatch"));
        var v = await(id);
        var item = v.items().get(0);
        assertThat(item.status()).isEqualTo(SearchJobService.ItemStatus.NO_RESULTS);
        assertThat(item.message()).doesNotContain("Could not find").doesNotContain("layout");
    }

    @Test
    void resolveAliasHandlesTheKnownFamilyInAnySpellingWithAndWithoutASlotNumberAndLeavesEverythingElseAlone() {
        assertThat(SearchJobService.resolveAlias("GE-FREELEC 2")).isEqualTo("GE-FEL");
        assertThat(SearchJobService.resolveAlias("ge-freelec 12")).isEqualTo("GE-FEL");
        assertThat(SearchJobService.resolveAlias("GE-FREELEC")).isEqualTo("GE-FEL");
        assertThat(SearchJobService.resolveAlias("GE Free Elec 2")).isEqualTo("GE-FEL");
        assertThat(SearchJobService.resolveAlias("ge free elec")).isEqualTo("GE-FEL");
        assertThat(SearchJobService.resolveAlias("GE-FEL")).isEqualTo("GE-FEL"); // already the real code, unchanged
        assertThat(SearchJobService.resolveAlias("GE-FEL 2")).isEqualTo("GE-FEL"); // same code, number stripped too
        assertThat(SearchJobService.resolveAlias("CIS 2105")).isEqualTo("CIS 2105");
    }

    @Test
    void queriesAreValidated() {
        String session = signIn(student());
        assertThatThrownBy(() -> jobs.submit(session, Semester.FIRST, "2026-2027", List.of(" ", "")))
                .hasMessageContaining("at least one");
        assertThatThrownBy(() -> jobs.submit(session, Semester.FIRST, "2026-2027", List.of("x")))
                .hasMessageContaining("2 to 100");
        List<String> many = java.util.stream.IntStream.range(0, 16).mapToObj(i -> "CIS " + (1000 + i)).toList();
        assertThatThrownBy(() -> jobs.submit(session, Semester.FIRST, "2026-2027", many))
                .hasMessageContaining("at most 15");
    }
}
