package com.uched.engine;

import com.uched.domain.model.RankedSchedule;
import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;
import com.uched.engine.scoring.CampusConsistencyStrategy;
import com.uched.engine.scoring.ScheduleScorer;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.util.List;

import static com.uched.engine.Fixtures.lecture;
import static com.uched.engine.Fixtures.lectureOn;
import static com.uched.engine.Fixtures.section;
import static org.assertj.core.api.Assertions.assertThat;

class CampusConsistencyStrategyTest {
    private final SchedulePreference none = SchedulePreference.none();
    private final CampusConsistencyStrategy strategy = new CampusConsistencyStrategy();

    @Test
    void everySectionOnTheSameCampusScoresPerfect() {
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", lectureOn("Talamban", DayOfWeek.MONDAY, "08:00", "09:30")),
                section("B 1", "A", lectureOn("Talamban", DayOfWeek.TUESDAY, "10:00", "11:30"))));
        assertThat(strategy.score(s, none)).isEqualTo(1.0);
    }

    @Test
    void oneSectionOnTheOtherCampusDragsTheScoreDown() {
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", lectureOn("Talamban", DayOfWeek.MONDAY, "08:00", "09:30")),
                section("B 1", "A", lectureOn("Talamban", DayOfWeek.TUESDAY, "10:00", "11:30")),
                section("C 1", "A", lectureOn("Main", DayOfWeek.WEDNESDAY, "08:00", "09:30"))));
        // 2 of 3 sections share Talamban: the majority campus.
        assertThat(strategy.score(s, none)).isEqualTo(2.0 / 3.0);
    }

    @Test
    void anEvenSplitScoresHalf() {
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", lectureOn("Talamban", DayOfWeek.MONDAY, "08:00", "09:30")),
                section("B 1", "A", lectureOn("Main", DayOfWeek.TUESDAY, "10:00", "11:30"))));
        assertThat(strategy.score(s, none)).isEqualTo(0.5);
    }

    @Test
    void sectionsWithNoKnownRoomAreNotPenalised() {
        // No room data at all (every meeting is TBA): nothing to judge, so don't punish the schedule for it.
        Schedule s = Schedule.of(List.of(section("A 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:30"))));
        assertThat(strategy.score(s, none)).isEqualTo(1.0);
    }

    @Test
    void aSectionsCampusIsWhicheverItsOwnMeetingsMostlyAgreeOn() {
        // A section meeting M/W: both meetings happen to be on Talamban, so the section counts as Talamban.
        Schedule s = Schedule.of(List.of(
                section("A 1", "A",
                        lectureOn("Talamban", DayOfWeek.MONDAY, "08:00", "09:30"),
                        lectureOn("Talamban", DayOfWeek.WEDNESDAY, "08:00", "09:30")),
                section("B 1", "A", lectureOn("Talamban", DayOfWeek.TUESDAY, "10:00", "11:30"))));
        assertThat(strategy.score(s, none)).isEqualTo(1.0);
    }

    @Test
    void isOnByDefaultAndWeightedHeavily() {
        assertThat(ScheduleScorer.withDefaults().rank(
                List.of(Schedule.of(List.of(section("A 1", "A", lectureOn("Main", DayOfWeek.MONDAY, "10:00", "11:30"))))),
                none, 1).get(0).breakdown()).containsKey("CampusConsistency");
        assertThat(strategy.weight(none)).isGreaterThan(1.0);
    }

    @Test
    void theBestRankedScheduleKeepsEverythingOnTheMajorityCampus() {
        Schedule allTalamban = Schedule.of(List.of(
                section("A 1", "A", lectureOn("Talamban", DayOfWeek.MONDAY, "08:00", "09:30")),
                section("B 1", "A", lectureOn("Talamban", DayOfWeek.TUESDAY, "10:00", "11:30")),
                section("C 1", "A", lectureOn("Talamban", DayOfWeek.WEDNESDAY, "13:00", "14:30"))));
        Schedule oneStrayedToMain = Schedule.of(List.of(
                section("A 1", "B", lectureOn("Talamban", DayOfWeek.MONDAY, "08:00", "09:30")),
                section("B 1", "B", lectureOn("Talamban", DayOfWeek.TUESDAY, "10:00", "11:30")),
                section("C 1", "B", lectureOn("Main", DayOfWeek.WEDNESDAY, "13:00", "14:30"))));
        List<RankedSchedule> ranked = ScheduleScorer.withDefaults()
                .rank(List.of(oneStrayedToMain, allTalamban), none, 10);
        assertThat(ranked.get(0).schedule()).isSameAs(allTalamban);
    }
}
