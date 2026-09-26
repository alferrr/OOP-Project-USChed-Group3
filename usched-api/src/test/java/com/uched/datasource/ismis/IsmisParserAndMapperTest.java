package com.uched.datasource.ismis;

import com.uched.domain.exception.IsmisLayoutChangedException;
import com.uched.domain.model.Course;
import com.uched.domain.model.MeetingType;
import com.uched.domain.value.Semester;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Parser and mapper against fixtures saved in the real ISMIS formats. */
class IsmisParserAndMapperTest {
    private final IsmisPageParser parser = new IsmisPageParser();

    private static String fixture(String name) throws IOException {
        return Files.readString(Path.of("src/test/resources/fixtures/" + name));
    }

    @Test
    void parsesTheRealResultsTable() throws IOException {
        List<IsmisRawCourse> rows = parser.parse(fixture("offered.html"));
        assertThat(rows).hasSize(5); // header, spacer, blank and footer rows are ignored
        IsmisRawCourse first = rows.get(0);
        assertThat(first.courseCode()).isEqualTo("CIS 2105 - Group 1");
        assertThat(first.title()).isEqualTo("NETWORKING II");
        assertThat(first.status()).isEqualTo("BLOCKSECTION");
        assertThat(first.scheduleLines()).containsExactly("MW 03:00 PM - 05:30 PM LB470TC");
        assertThat(first.enrolled()).isEqualTo("24/24");
        assertThat(rows.get(1).scheduleLines()).hasSize(2);
        assertThat(rows.get(2).teachers()).containsExactly("BARTLETT, EDWIN D.", "ROA, DORIZ R.");
    }

    @Test
    void aShortNoTableResponseMeansGenuinelyNoResultsNotALayoutChange() {
        // The real ISMIS shape for an empty search: a short ajax fragment, no table at all.
        assertThat(parser.parse("<div class=\"row\" id=\"CourseScheduleOfferedList\"></div>")).isEmpty();
        assertThat(parser.parse("")).isEmpty();
        assertThat(parser.parse((String) null)).isEmpty();
    }

    @Test
    void aLargeResponseWithNoTableIsStillALayoutChange() {
        // Not every no-table response is "no results": a big page ISMIS actually redesigned should still error.
        String big = "<html><body>" + "x".repeat(600) + "</body></html>";
        assertThatThrownBy(() -> parser.parse(big)).isInstanceOf(IsmisLayoutChangedException.class);
    }

    @Test
    void emptyOrUnexpectedPagesMeanLayoutChanged() {
        // A results table with a header but no data rows is a search that matched nothing, not a layout change.
        assertThat(parser.parse("<table><tr><th>CourseCode</th><th>Schedule</th></tr></table>")).isEmpty();
    }

    @Test
    void mapperBuildsSectionsFromCodeAndGroup() throws IOException {
        // The fallback campus passed in is deliberately wrong ("Main"): every room code here ends in "TC",
        // so the room's own suffix must win regardless of whatever default the caller supplies.
        var result = new IsmisCourseMapper().map(parser.parse(fixture("offered.html")),
                Semester.FIRST, "2026-2027", "Main", 3.0);
        assertThat(result.skipped()).hasSize(1).first().asString().contains("BAD 1");
        assertThat(result.courses()).extracting(Course::getCode).containsExactly("CIS 2105", "MATH 1101");

        Course net = result.courses().get(0);
        assertThat(net.getName()).isEqualTo("NETWORKING II");
        assertThat(net.getUnits()).isEqualTo(3.0); // the page has no units column, so the default applies
        assertThat(net.getSections()).extracting(s -> s.getSectionCode()).containsExactly("Group 1", "Group 6", "Group 8");

        var g1 = net.getSections().get(0);
        assertThat(g1.getMeetings()).extracting(m -> m.getDay()).containsExactly(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY);
        assertThat(g1.getMeetings().get(0).getTime().start()).isEqualTo(LocalTime.of(15, 0));
        assertThat(g1.getMeetings().get(0).getTime().end()).isEqualTo(LocalTime.of(17, 30));
        assertThat(g1.getMeetings().get(0).getRoom().orElseThrow().roomCode()).isEqualTo("LB470TC");
        assertThat(g1.getMeetings().get(0).getRoom().orElseThrow().campus()).isEqualTo("Talamban");
        assertThat(g1.getInstructor().orElseThrow().getName()).isEqualTo("SEBIAL, ARCHIVAL J.");
        assertThat(g1.getAvailableSlots()).contains(0); // 24/24 enrolled is full

        var g6 = net.getSections().get(1);
        assertThat(g6.getMeetings()).hasSize(4); // two schedule lines x TTh
        var g8 = net.getSections().get(2);
        assertThat(g8.getInstructor().orElseThrow().getName()).isEqualTo("BARTLETT, EDWIN D. / ROA, DORIZ R.");
        assertThat(g8.getAvailableSlots()).contains(4);
        assertThat(g8.getMeetings().get(0).getType()).isEqualTo(MeetingType.LECTURE);
    }

    @Test
    void scheduleGrammar() {
        assertThat(IsmisCourseMapper.parseDays("MWF")).containsExactly(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY);
        assertThat(IsmisCourseMapper.parseDays("TTh")).containsExactly(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY);
        assertThat(IsmisCourseMapper.parseDays("S")).containsExactly(DayOfWeek.SATURDAY);
        var noon = IsmisCourseMapper.parseSegment("M 11:00 AM - 01:00 PM", "C", false);
        assertThat(noon.get(0).getTime().start()).isEqualTo(LocalTime.of(11, 0));
        assertThat(noon.get(0).getTime().end()).isEqualTo(LocalTime.of(13, 0));
        var tba = IsmisCourseMapper.parseSegment("W 07:30 AM - 10:00 AM TBA", "C", false);
        assertThat(tba.get(0).getRoom()).isEmpty();
        var midday = IsmisCourseMapper.parseSegment("F 12:30 PM - 03:00 PM LB469TC", "C", false);
        assertThat(midday.get(0).getTime().start()).isEqualTo(LocalTime.of(12, 30));
    }

    @Test
    void roomCodeSuffixDecidesTheCampusNotTheConfiguredDefault() {
        // USC's two campuses aren't a separate field ISMIS reports - they're a suffix baked into the room
        // code itself, so a room's own "MC"/"TC" always wins over whatever default campus was configured.
        assertThat(IsmisCourseMapper.campusOf("LB470TC", "Main")).isEqualTo("Talamban");
        assertThat(IsmisCourseMapper.campusOf("LB201MC", "Talamban")).isEqualTo("Main");
        assertThat(IsmisCourseMapper.campusOf("lb470tc", "Main")).isEqualTo("Talamban"); // case-insensitive
        // No recognisable suffix at all: fall back to whatever default was configured.
        assertThat(IsmisCourseMapper.campusOf("GYM", "Main")).isEqualTo("Main");
    }

    @Test
    void searchFormFieldsIncludeEveryHiddenFieldAndTheDefaults() throws IOException {
        Map<String, String> fields = parser.formFields(fixture("search-form.html"), "form#CourseScheduleCourseScheduleOffered");
        assertThat(fields).containsEntry("AjaxFormVM.Controller", "CourseSchedule")
                .containsEntry("AjaxFormVM.Action", "CourseScheduleOffered")
                .containsEntry("__RequestVerificationToken", "SANITIZED-TOKEN")
                .containsEntry("AcademicPeriod", "NONE")
                .containsEntry("Courses", "");
        assertThat(fields.keySet()).noneMatch(k -> k.toLowerCase().contains("submit") && !k.startsWith("AjaxFormVM"));
        assertThat(parser.formAction(fixture("search-form.html"), "form#CourseScheduleCourseScheduleOffered"))
                .isEqualTo("/CourseSchedule/CourseScheduleOffered?Length=14");
    }

    @Test
    void pageInfoReadsTheRealAndDefaultCases() throws IOException {
        assertThat(parser.pageInfo(fixture("offered.html"))).containsExactly(1, 1);
        assertThat(parser.pageInfo(fixture("offered-paged-p1.html"))).containsExactly(1, 3);
        assertThat(parser.pageInfo(fixture("offered-paged-p2.html"))).containsExactly(2, 3);
        assertThat(parser.pageInfo("<span>Page 1 of 204</span>")).containsExactly(1, 204);
        assertThat(parser.pageInfo("no page marker here")).containsExactly(1, 1);
    }

    @Test
    void realLoginFormYieldsTheAntiForgeryTokenAndIsNotMistakenForAChallenge() throws IOException {
        String login = fixture("login-form.html");
        assertThat(parser.loginFormHiddenFields(login, "Password"))
                .containsExactly(Map.entry("__RequestVerificationToken", "SANITIZED-TOKEN"));
        assertThat(parser.loginFormHiddenFields(login, "NoSuchField")).isEmpty();
        IsmisSession.rejectChallenge(login); // must not throw
        IsmisSession.rejectChallenge(fixture("search-form.html"));
    }

    @Test
    void semesterAndYearMapToIsmisValues() {
        assertThat(IsmisConnection.academicPeriod(Semester.FIRST)).isEqualTo("FIRST_SEMESTER");
        assertThat(IsmisConnection.academicPeriod(Semester.SECOND)).isEqualTo("SECOND_SEMESTER");
        assertThat(IsmisConnection.academicPeriod(Semester.SUMMER)).isEqualTo("SUMMER");
        assertThat(IsmisConnection.startYear("2026-2027")).isEqualTo("2026");
    }
}
