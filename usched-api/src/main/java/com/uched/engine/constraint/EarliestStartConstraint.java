package com.uched.engine.constraint;

import com.uched.domain.model.Schedule;

import java.time.LocalTime;

public class EarliestStartConstraint implements ScheduleConstraint {
    private final LocalTime earliest;

    public EarliestStartConstraint(LocalTime earliest) {
        this.earliest = earliest;
    }

    @Override
    public boolean isSatisfiedBy(Schedule schedule) {
        return schedule.earliestStart().map(s -> !s.isBefore(earliest)).orElse(true);
    }

    @Override
    public String description() {
        return "no class before " + earliest;
    }
}
