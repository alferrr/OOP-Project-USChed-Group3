package com.uched.engine.constraint;

import com.uched.domain.model.Meeting;
import com.uched.domain.model.Schedule;

import java.time.Duration;
import java.util.List;

public class MinBreakConstraint implements ScheduleConstraint {
    private final int minutes;

    public MinBreakConstraint(int minutes) {
        this.minutes = minutes;
    }

    @Override
    public boolean isSatisfiedBy(Schedule schedule) {
        for (List<Meeting> day : schedule.meetingsByDay().values()) {
            for (int i = 1; i < day.size(); i++) {
                long gap = Duration.between(day.get(i - 1).getTime().end(), day.get(i).getTime().start()).toMinutes();
                if (gap < minutes) {
                    return false;
                }
            }
        }
        return true;
    }

    @Override
    public String description() {
        return "at least " + minutes + " minutes between classes";
    }
}
