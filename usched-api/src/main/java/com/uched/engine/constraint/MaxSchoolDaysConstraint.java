package com.uched.engine.constraint;

import com.uched.domain.model.Schedule;

public class MaxSchoolDaysConstraint implements ScheduleConstraint {
    private final int max;

    public MaxSchoolDaysConstraint(int max) {
        this.max = max;
    }

    @Override
    public boolean isSatisfiedBy(Schedule schedule) {
        return schedule.schoolDays().size() <= max;
    }

    @Override
    public String description() {
        return "at most " + max + " school days";
    }
}
