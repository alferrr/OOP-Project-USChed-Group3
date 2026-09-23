package com.uched.engine.constraint;

import com.uched.domain.model.Schedule;

import java.time.DayOfWeek;
import java.util.Set;

public class AvoidDaysConstraint implements ScheduleConstraint {
    private final Set<DayOfWeek> days;

    public AvoidDaysConstraint(Set<DayOfWeek> days) {
        this.days = Set.copyOf(days);
    }

    @Override
    public boolean isSatisfiedBy(Schedule schedule) {
        return schedule.schoolDays().stream().noneMatch(days::contains);
    }

    @Override
    public String description() {
        return "no classes on " + days;
    }
}
