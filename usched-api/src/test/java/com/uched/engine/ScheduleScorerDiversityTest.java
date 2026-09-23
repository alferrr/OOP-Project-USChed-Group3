package com.uched.engine;

import com.uched.domain.model.RankedSchedule;
import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;
import com.uched.engine.scoring.ScheduleScorer;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Set;

import static com.uched.engine.Fixtures.lecture;
import static com.uched.engine.Fixtures.section;
import static com.uched.engine.Fixtures.sectionWithId;
import static org.assertj.core.api.Assertions.assertThat;

class ScheduleScorerDiversityTest {
    private final SchedulePreference none = SchedulePreference.none();
    private final ScheduleScorer scorer = ScheduleScorer.withDefaults();

    @Test
    void rankKeepsOnlyOneScheduleOfEachDistinctWeeklyShape() {
        // Two electives that happen to occupy the exact same day/time: to the student these look identical.
        Schedule a = Schedule.of(List.of(
                section("MATH 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:00")),
                section("ELEC A", "1", lecture(DayOfWeek.TUESDAY, "10:00", "11:00"))));
        Schedule b = Schedule.of(List.of(
                section("MATH 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:00")),
                section("ELEC B", "1", lecture(DayOfWeek.TUESDAY, "10:00", "11:00"))));
        // A genuinely different shape.
        Schedule c = Schedule.of(List.of(
                section("MATH 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:00")),
                section("ELEC C", "1", lecture(DayOfWeek.WEDNESDAY, "13:00", "14:00"))));

        List<RankedSchedule> ranked = scorer.rank(List.of(a, b, c), none, 10);
        assertThat(ranked).hasSize(2); // a and b collapse into one; c stays
        assertThat(ranked).extracting(r -> r.schedule().getSections().stream()
                        .anyMatch(s -> s.getCourseCode().equals("ELEC C")))
                .contains(true);
    }

    @Test
    void rankNeverReturnsMoreThanTopNEvenAfterDeduplication() {
        Schedule a = Schedule.of(List.of(section("MATH 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:00"))));
        Schedule b = Schedule.of(List.of(section("MATH 1", "B", lecture(DayOfWeek.TUESDAY, "08:00", "09:00"))));
        Schedule c = Schedule.of(List.of(section("MATH 1", "C", lecture(DayOfWeek.WEDNESDAY, "08:00", "09:00"))));
        assertThat(scorer.rank(List.of(a, b, c), none, 2)).hasSize(2);
    }

    @Test
    void rankBySimilarityOrdersByOverlapWithTheReferenceFirst() {
        // Reference: sections 1 (MATH) and 2 (ENG).
        Schedule closer = Schedule.of(List.of(
                sectionWithId(1, "MATH 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:00")), // shares MATH
                sectionWithId(30, "ENG 1", "B", lecture(DayOfWeek.WEDNESDAY, "10:00", "11:00"))));
        // Shares nothing with the reference, but scores higher on every strategy.
        Schedule farther = Schedule.of(List.of(
                sectionWithId(40, "MATH 1", "Z", lecture(DayOfWeek.THURSDAY, "10:00", "11:00")),
                sectionWithId(41, "ENG 1", "Z", lecture(DayOfWeek.THURSDAY, "13:00", "14:00"))));

        List<RankedSchedule> ranked = scorer.rankBySimilarity(List.of(closer, farther), none, Set.of(1L, 2L), 10);
        assertThat(ranked.get(0).schedule()).isSameAs(closer);
    }

    @Test
    void rankBySimilarityExcludesTheReferenceScheduleItself() {
        Schedule reference = Schedule.of(List.of(sectionWithId(1, "MATH 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:00"))));
        List<RankedSchedule> ranked = scorer.rankBySimilarity(List.of(reference), none, Set.of(1L), 10);
        assertThat(ranked).isEmpty();
    }
}
