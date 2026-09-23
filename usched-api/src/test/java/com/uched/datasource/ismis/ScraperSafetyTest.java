package com.uched.datasource.ismis;

import com.uched.domain.exception.IsmisAuthenticationException;
import com.uched.domain.exception.IsmisChallengeException;
import com.uched.domain.exception.IsmisLayoutChangedException;
import com.uched.domain.exception.IsmisUnavailableException;
import com.uched.domain.exception.ScraperException;
import com.uched.domain.model.Course;
import com.uched.domain.value.Semester;
import com.uched.support.FakeIsmis;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScraperSafetyTest {
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
    }

    private IsmisConfig config() {
        IsmisConfig c = new IsmisConfig();
        c.setBaseUrl(ismis.baseUrl());
        c.setLoginPath("/login");
        c.setOfferedCoursesPath("/offered");
        c.setSearchPath("/search");
        c.setLogoutPath("/logout");
        c.setUsernameField("user");
        c.setPasswordField("pass");
        c.setMinDelayMs(0);
        c.setAllowedPathPrefixes(List.of("/home", "/CourseSchedule/OfferedCoursesFilter"));
        return c;
    }

    private ISMISScraper scraper(String password) {
        return new ISMISScraper(config(), new IsmisPageParser(),
                new IsmisCredentials("student".toCharArray(), password.toCharArray()));
    }

    @Test
    void happyPathReadsCoursesAndDestroysCredentials() {
        char[] pass = "correct-horse".toCharArray();
        List<Course> courses;
        try (ISMISScraper s = new ISMISScraper(config(), new IsmisPageParser(),
                new IsmisCredentials("student".toCharArray(), pass))) {
            courses = s.fetchCourses(Semester.FIRST, "2026-2027");
            assertThat(s.skippedRecords()).hasSize(1);
        }
        assertThat(courses).extracting(Course::getCode).containsExactly("CIS 2105", "MATH 1101");
        assertThat(courses.get(0).getSections()).hasSize(3);
        assertThat(pass).containsOnly('\0');
    }

    @Test
    void wrongPasswordIsAnAuthenticationFailure() {
        try (ISMISScraper s = scraper("nope")) {
            assertThatThrownBy(() -> s.fetchCourses(Semester.FIRST, "2026-2027"))
                    .isInstanceOf(IsmisAuthenticationException.class);
        }
    }

    @Test
    void captchaStopsTheScrapeInsteadOfBeingBypassed() {
        ismis.mode = FakeIsmis.Mode.CAPTCHA;
        try (ISMISScraper s = scraper("correct-horse")) {
            assertThatThrownBy(() -> s.fetchCourses(Semester.FIRST, "2026-2027"))
                    .isInstanceOf(IsmisChallengeException.class);
        }
    }

    @Test
    void layoutDriftIsReportedNotImported() {
        ismis.mode = FakeIsmis.Mode.LAYOUT_CHANGED;
        try (ISMISScraper s = scraper("correct-horse")) {
            assertThatThrownBy(() -> s.fetchCourses(Semester.FIRST, "2026-2027"))
                    .isInstanceOf(IsmisLayoutChangedException.class);
        }
    }

    @Test
    void layoutErrorsDescribeThePageStructureButNeverItsContent() {
        ismis.mode = FakeIsmis.Mode.LAYOUT_CHANGED;
        try (ISMISScraper s = scraper("correct-horse")) {
            assertThatThrownBy(() -> s.fetchCourses(Semester.FIRST, "2026-2027"))
                    .isInstanceOf(IsmisLayoutChangedException.class)
                    .hasMessageContaining("forms=[]").hasMessageContaining("tables=[]")
                    .hasMessageNotContaining("redesigned");
        }
    }

    @Test
    void followsThePagesAjaxLinkWhenTheFilterFormIsNotInTheRawPage() {
        ismis.mode = FakeIsmis.Mode.FILTER_VIA_AJAX;
        List<Course> courses;
        try (ISMISScraper s = scraper("correct-horse")) {
            courses = s.fetchCourses(Semester.FIRST, "2026-2027");
        }
        assertThat(courses).extracting(Course::getCode).containsExactly("CIS 2105", "MATH 1101");
        assertThat(ismis.hits()).contains("GET /CourseSchedule/OfferedCoursesFilter");
    }

    @Test
    void theSearchBoxReceivesTheStudentsQuery() {
        try (ISMISScraper s = scraper("correct-horse")) {
            s.setQuery("CIS 2105");
            s.fetchCourses(Semester.FIRST, "2026-2027");
        }
        String search = ismis.bodies().stream().filter(b -> b.contains("AcademicPeriod=")).reduce((a, b) -> b).orElseThrow();
        assertThat(search).contains("Courses=CIS+2105");
    }

    @Test
    void aSearchThatMatchesNothingIsAFriendlyNoResultsNotALayoutError() {
        try (ISMISScraper s = scraper("correct-horse")) {
            s.setQuery("nomatch");
            assertThatThrownBy(() -> s.fetchCourses(Semester.FIRST, "2026-2027"))
                    .isInstanceOf(com.uched.domain.exception.IsmisNoResultsException.class)
                    .hasMessageContaining("nomatch");
        }
    }

    @Test
    void multiPageSearchesAreFetchedAndAggregated() {
        try (ISMISScraper s = scraper("correct-horse")) {
            s.setQuery("many"); // a department-style search spanning 3 pages, e.g. an "AC" prefix search
            List<Course> courses = s.fetchCourses(Semester.FIRST, "2026-2027");
            assertThat(courses).extracting(Course::getCode).containsExactly("AA 3101", "AC 1101", "AC 1102");
            // the dissolved section on page 1 has no schedule and is skipped, but every page was still fetched
            assertThat(s.skippedRecords()).containsExactly("AA 3101 - Group 4 (row 4): no usable schedule");
        }
        assertThat(ismis.hits()).anySatisfy(h -> assertThat(h).startsWith("GET /search?")
                .contains("AcademicPeriod=FIRST_SEMESTER").contains("AcademicYear=2026")
                .contains("Courses=many").contains("page=2"));
    }

    @Test
    void pagesBeyondTheConfiguredCapAreSkippedAndNoted() {
        IsmisConfig capped = config();
        capped.setMaxPages(2);
        try (ISMISScraper s = new ISMISScraper(capped, new IsmisPageParser(),
                new IsmisCredentials("student".toCharArray(), "correct-horse".toCharArray()))) {
            s.setQuery("many");
            List<Course> courses = s.fetchCourses(Semester.FIRST, "2026-2027");
            assertThat(courses).extracting(Course::getCode).containsExactly("AA 3101", "AC 1101"); // page 3 skipped
            assertThat(s.skippedRecords()).anySatisfy(note -> assertThat(note).contains("pages 1-2 of 3"));
        }
    }

    @Test
    void siteDownIsUnavailable() {
        ismis.mode = FakeIsmis.Mode.DOWN;
        try (ISMISScraper s = scraper("correct-horse")) {
            assertThatThrownBy(() -> s.fetchCourses(Semester.FIRST, "2026-2027"))
                    .isInstanceOf(IsmisUnavailableException.class);
        }
    }

    @Test
    void unconfiguredIntegrationIsUnavailable() {
        IsmisCredentials creds = new IsmisCredentials("a".toCharArray(), "b".toCharArray());
        try (ISMISScraper s = new ISMISScraper(new IsmisConfig(), new IsmisPageParser(), creds)) {
            assertThatThrownBy(() -> s.fetchCourses(Semester.FIRST, "2026-2027"))
                    .isInstanceOf(com.uched.domain.exception.IsmisNotConfiguredException.class);
        }
    }

    @Test
    void writeLikeRequestsAreBlockedBeforeTheyLeaveTheMachine() {
        int before = ismis.hits().size();
        try (IsmisSession session = new IsmisSession(config())) {
            assertThatThrownBy(() -> session.request("DELETE", "/offered", null)).isInstanceOf(ScraperException.class);
            assertThatThrownBy(() -> session.request("PUT", "/offered", "x")).isInstanceOf(ScraperException.class);
            assertThatThrownBy(() -> session.request("POST", "/offered", "x")).isInstanceOf(ScraperException.class);
            assertThatThrownBy(() -> session.request("POST", "/enroll", "x")).isInstanceOf(ScraperException.class);
            assertThatThrownBy(() -> session.get("/enroll")).isInstanceOf(ScraperException.class);
            assertThatThrownBy(() -> session.get("http://evil.example/offered")).isInstanceOf(ScraperException.class);
        }
        assertThat(ismis.hits()).hasSize(before);
    }

    @Test
    void searchPostEchoesTheFormsHiddenFieldsAndSelectsTheTerm() {
        try (ISMISScraper s = scraper("correct-horse")) {
            s.fetchCourses(Semester.FIRST, "2026-2027");
        }
        String search = ismis.bodies().stream().filter(b -> b.contains("AcademicPeriod=")).reduce((a, b) -> b).orElseThrow();
        assertThat(search).contains("AcademicPeriod=FIRST_SEMESTER").contains("AcademicYear=2026")
                .contains("AjaxFormVM.Controller=CourseSchedule").contains("__RequestVerificationToken=srch-456");
    }

    @Test
    void aFormThatPostsSomewhereOtherThanTheSearchPathIsRefused() {
        ismis.mode = FakeIsmis.Mode.EVIL_ACTION;
        int before = ismis.hits().size();
        try (ISMISScraper s = scraper("correct-horse")) {
            assertThatThrownBy(() -> s.fetchCourses(Semester.FIRST, "2026-2027")).isInstanceOf(ScraperException.class);
        }
        assertThat(ismis.hits().subList(before, ismis.hits().size())).noneMatch(h -> h.contains("/enroll"));
    }

    @Test
    void neverIssuesAnythingOtherThanGetsAndTheLoginPost() {
        try (ISMISScraper s = scraper("correct-horse")) {
            s.fetchCourses(Semester.FIRST, "2026-2027");
        }
        assertThat(ismis.hits()).allSatisfy(h -> assertThat(h).matches("(GET /(login|offered|logout|home|CourseSchedule/OfferedCoursesFilter|search)|POST /(login|search))(\\?.*)?"));
    }
}
