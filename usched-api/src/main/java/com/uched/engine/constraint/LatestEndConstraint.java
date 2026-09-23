package com.uched.engine.constraint;

import com.uched.domain.model.Schedule;

import java.time.LocalTime;

public class LatestEndConstraint implements ScheduleConstraint {
    private final LocalTime latest;

    public LatestEndConstraint(LocalTime latest) {
        this.latest = latest;
    }

    @Override
    public boolean isSatisfiedBy(Schedule schedule) {
        return schedule.latestEnd().map(e -> !e.isAfter(latest)).orElse(true);
    }

    @Override
    public String description() {
        return "no class after " + latest;
    }
}
