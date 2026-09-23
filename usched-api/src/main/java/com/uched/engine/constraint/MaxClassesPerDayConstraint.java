package com.uched.engine.constraint;

import com.uched.domain.model.Schedule;

public class MaxClassesPerDayConstraint implements ScheduleConstraint {
    private final int max;

    public MaxClassesPerDayConstraint(int max) {
        this.max = max;
    }

    @Override
    public boolean isSatisfiedBy(Schedule schedule) {
        return schedule.meetingsByDay().values().stream().allMatch(day -> day.size() <= max);
    }

    @Override
    public String description() {
        return "at most " + max + " classes per day";
    }
}
