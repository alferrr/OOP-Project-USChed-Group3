package com.uched.engine.scoring;

import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;

public class MinimalDaysStrategy extends AbstractScoringStrategy {
    @Override
    public String name() {
        return "MinimalDays";
    }

    @Override
    protected double computeRaw(Schedule schedule, SchedulePreference prefs) {
        int days = schedule.schoolDays().size();
        return days <= 1 ? 1.0 : 1.0 - (days - 1) / 5.0;
    }

    @Override
    public double weight(SchedulePreference prefs) {
        return prefs.minimizeDays() ? 2.0 : 1.0;
    }
}
