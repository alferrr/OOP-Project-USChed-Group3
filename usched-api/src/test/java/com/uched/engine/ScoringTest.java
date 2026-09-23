package com.uched.engine;

import com.uched.domain.model.Instructor;
import com.uched.domain.model.RankedSchedule;
import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;
import com.uched.engine.scoring.AbstractScoringStrategy;
import com.uched.engine.scoring.CompactScheduleStrategy;
import com.uched.engine.scoring.InstructorPreferenceStrategy;
import com.uched.engine.scoring.MinimalDaysStrategy;
import com.uched.engine.scoring.MorningPreferenceStrategy;
import com.uched.engine.scoring.ScheduleScorer;
import com.uched.engine.scoring.ScoringStrategy;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.util.List;

import static com.uched.engine.Fixtures.lecture;
import static com.uched.engine.Fixtures.section;
import static org.assertj.core.api.Assertions.assertThat;

class ScoringTest {
    private final SchedulePreference none = SchedulePreference.none();
    private final Schedule tight = Schedule.of(List.of(
            section("A 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:00")),
            section("B 1", "A", lecture(DayOfWeek.MONDAY, "09:00", "10:00"))));
    private final Schedule spread = Schedule.of(List.of(
            section("A 1", "A", lecture(DayOfWeek.MONDAY, "13:00", "14:00")),
            section("B 1", "A", lecture(DayOfWeek.WEDNESDAY, "16:00", "17:00"))));

    @Test
    void everyStrategyStaysInUnitRange() {
        List<ScoringStrategy> all = List.of(new CompactScheduleStrategy(), new MorningPreferenceStrategy(),
                new MinimalDaysStrategy(), new InstructorPreferenceStrategy());
        for (ScoringStrategy s : all) {
            for (Schedule sch : List.of(tight, spread)) {
                assertThat(s.score(sch, none)).isBetween(0.0, 1.0);
            }
        }
    }

    @Test
    void compactPrefersFewerGaps() {
        Schedule gappy = Schedule.of(List.of(
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:00")),
                section("B 1", "A", lecture(DayOfWeek.MONDAY, "15:00", "16:00"))));
        assertThat(new CompactScheduleStrategy().score(tight, none))
                .isGreaterThan(new CompactScheduleStrategy().score(gappy, none));
    }

    @Test
    void morningDirectionIsConfigurable() {
        var morning = new MorningPreferenceStrategy();
        assertThat(morning.score(tight, none)).isEqualTo(1.0);
        assertThat(morning.score(spread, none)).isEqualTo(0.0);
        SchedulePreference pm = SchedulePreference.builder().preferAfternoon(true).build();
        assertThat(morning.score(tight, pm)).isEqualTo(0.0);
    }

    @Test
    void minimalDaysPrefersFewerDays() {
        assertThat(new MinimalDaysStrategy().score(tight, none)).isEqualTo(1.0);
        assertThat(new MinimalDaysStrategy().score(spread, none)).isLessThan(1.0);
    }

    @Test
    void instructorPreferenceCountsPreferredSections() {
        Instructor liked = new Instructor(4L, "Juan Dela Cruz");
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", liked, lecture(DayOfWeek.MONDAY, "08:00", "09:00")),
                section("B 1", "A", lecture(DayOfWeek.TUESDAY, "08:00", "09:00"))));
        SchedulePreference prefs = SchedulePreference.builder().preferredInstructorId(4).build();
        assertThat(new InstructorPreferenceStrategy().score(s, prefs)).isEqualTo(0.5);
    }

    @Test
    void templateMethodClampsOutOfRangeValues() {
        AbstractScoringStrategy wild = new AbstractScoringStrategy() {
            @Override
            public String name() {
                return "Wild";
            }

            @Override
            protected double computeRaw(Schedule schedule, SchedulePreference prefs) {
                return 7.5;
            }
        };
        assertThat(wild.score(tight, none)).isEqualTo(1.0);
    }

    @Test
    void weightsChangeRanking() {
        ScheduleScorer scorer = ScheduleScorer.withDefaults();
        // tight is compact but morning-only; spread is afternoon. Preferring afternoon must flip the order.
        List<RankedSchedule> neutral = scorer.rank(List.of(tight, spread), none, 10);
        assertThat(neutral.get(0).schedule()).isSameAs(tight);
        assertThat(neutral.get(0).breakdown()).doesNotContainKey("Instructor");
        SchedulePreference pm = SchedulePreference.builder().preferAfternoon(true).preferredInstructorId(9).build();
        List<RankedSchedule> afternoon = scorer.rank(List.of(tight, spread), pm, 10);
        assertThat(afternoon.get(0).score()).isBetween(0.0, 100.0);
        assertThat(afternoon.get(0).breakdown()).containsKeys("Compact", "Morning", "MinimalDays", "Instructor");
    }

    @Test
    void newStrategyNeedsNoScorerChange() {
        ScoringStrategy alwaysOne = new AbstractScoringStrategy() {
            @Override
            public String name() {
                return "One";
            }

            @Override
            protected double computeRaw(Schedule s, SchedulePreference p) {
                return 1.0;
            }
        };
        RankedSchedule r = new ScheduleScorer(List.of(alwaysOne)).score(tight, none);
        assertThat(r.score()).isEqualTo(100.0);
    }

    @Test
    void ranksTruncatedToTopN() {
        assertThat(ScheduleScorer.withDefaults().rank(List.of(tight, spread), none, 1)).hasSize(1);
    }
}
