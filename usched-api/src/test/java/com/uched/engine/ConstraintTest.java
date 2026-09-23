package com.uched.engine;

import com.uched.domain.model.Schedule;
import com.uched.engine.constraint.AvoidDaysConstraint;
import com.uched.engine.constraint.EarliestStartConstraint;
import com.uched.engine.constraint.LatestEndConstraint;
import com.uched.engine.constraint.MaxClassesPerDayConstraint;
import com.uched.engine.constraint.MaxSchoolDaysConstraint;
import com.uched.engine.constraint.MinBreakConstraint;
import com.uched.engine.constraint.ScheduleConstraint;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

import static com.uched.engine.Fixtures.lecture;
import static com.uched.engine.Fixtures.section;
import static org.assertj.core.api.Assertions.assertThat;

class ConstraintTest {
    private final Schedule schedule = Schedule.of(List.of(
            section("A 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:00")),
            section("B 1", "A", lecture(DayOfWeek.MONDAY, "09:30", "10:30"), lecture(DayOfWeek.SATURDAY, "13:00", "14:00"))));

    private void check(ScheduleConstraint passes, ScheduleConstraint fails) {
        assertThat(passes.isSatisfiedBy(schedule)).isTrue();
        assertThat(fails.isSatisfiedBy(schedule)).isFalse();
        assertThat(fails.description()).isNotBlank();
    }

    @Test
    void maxSchoolDays() {
        check(new MaxSchoolDaysConstraint(2), new MaxSchoolDaysConstraint(1));
    }

    @Test
    void maxClassesPerDay() {
        check(new MaxClassesPerDayConstraint(2), new MaxClassesPerDayConstraint(1));
    }

    @Test
    void minBreak() {
        check(new MinBreakConstraint(30), new MinBreakConstraint(45));
    }

    @Test
    void earliestStart() {
        check(new EarliestStartConstraint(LocalTime.of(8, 0)), new EarliestStartConstraint(LocalTime.of(9, 0)));
    }

    @Test
    void latestEnd() {
        check(new LatestEndConstraint(LocalTime.of(14, 0)), new LatestEndConstraint(LocalTime.of(13, 0)));
    }

    @Test
    void avoidDays() {
        check(new AvoidDaysConstraint(Set.of(DayOfWeek.FRIDAY)), new AvoidDaysConstraint(Set.of(DayOfWeek.SATURDAY)));
    }
}
