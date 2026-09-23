package com.uched.engine;

import com.uched.domain.model.RankedSchedule;
import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;
import com.uched.engine.scoring.LunchBreakStrategy;
import com.uched.engine.scoring.ScheduleScorer;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.util.List;

import static com.uched.engine.Fixtures.lecture;
import static com.uched.engine.Fixtures.section;
import static org.assertj.core.api.Assertions.assertThat;

class LunchBreakStrategyTest {
    private final SchedulePreference none = SchedulePreference.none();
    private final LunchBreakStrategy strategy = new LunchBreakStrategy();

    @Test
    void aFreeHourAroundNoonCounts() {
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "10:00", "11:30")),
                section("B 1", "A", lecture(DayOfWeek.MONDAY, "13:00", "14:30"))));
        assertThat(strategy.score(s, none)).isEqualTo(1.0);
    }

    @Test
    void backToBackClassesThroughLunchScoreZero() {
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "10:00", "12:30")),
                section("B 1", "A", lecture(DayOfWeek.MONDAY, "13:00", "14:30"))));
        assertThat(strategy.score(s, none)).isEqualTo(0.0);
    }

    @Test
    void exactlyOneHourFreeStillCounts() {
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "10:00", "12:00")),
                section("B 1", "A", lecture(DayOfWeek.MONDAY, "13:00", "14:30"))));
        assertThat(strategy.score(s, none)).isEqualTo(1.0);
    }

    @Test
    void aDayFreeOfClassesDuringTheWindowCounts() {
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "07:00", "09:00")),
                section("B 1", "A", lecture(DayOfWeek.MONDAY, "16:00", "17:00"))));
        assertThat(strategy.score(s, none)).isEqualTo(1.0);
    }

    @Test
    void scoreIsTheFractionOfSchoolDaysWithABreak() {
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "10:00", "12:30"), lecture(DayOfWeek.TUESDAY, "13:00", "14:30")),
                section("B 1", "A", lecture(DayOfWeek.MONDAY, "13:00", "14:00"), lecture(DayOfWeek.TUESDAY, "16:00", "17:00"))));
        // Monday: back-to-back through lunch (no break). Tuesday: free 11:00-13:00 (break).
        assertThat(strategy.score(s, none)).isEqualTo(0.5);
    }

    @Test
    void aScheduleWithNoClassesAtAllScoresPerfect() {
        assertThat(strategy.score(Schedule.of(List.of()), none)).isEqualTo(1.0);
    }

    @Test
    void isOnByDefaultAndItsWeightIsHigherWhenPrioritised() {
        assertThat(ScheduleScorer.withDefaults().rank(
                List.of(Schedule.of(List.of(section("A 1", "A", lecture(DayOfWeek.MONDAY, "10:00", "11:30"))))),
                none, 1).get(0).breakdown()).containsKey("LunchBreak");
        assertThat(strategy.weight(none)).isGreaterThan(1.0); // outweighs Compact's usual preference for zero gaps
        assertThat(strategy.weight(SchedulePreference.builder().prioritizeLunchBreak(true).build()))
                .isGreaterThan(strategy.weight(none));
    }

    @Test
    void withNoPreferencesSetTheBestRankedScheduleHasALunchBreak() {
        Schedule withBreak = Schedule.of(List.of(
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "10:00", "11:30")),
                section("B 1", "A", lecture(DayOfWeek.MONDAY, "13:00", "14:30"))));
        // Genuinely no break: back-to-back straight through the whole lunch window, not just one short class.
        Schedule noBreak = Schedule.of(List.of(
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "10:00", "12:30")),
                section("B 1", "A", lecture(DayOfWeek.MONDAY, "12:30", "14:30"))));
        assertThat(strategy.score(noBreak, none)).isEqualTo(0.0);
        List<RankedSchedule> ranked = ScheduleScorer.withDefaults().rank(List.of(noBreak, withBreak), none, 10);
        assertThat(ranked.get(0).schedule()).isSameAs(withBreak);
    }
}
