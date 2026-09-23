package com.uched.engine.scoring;

import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;

public class CompactScheduleStrategy extends AbstractScoringStrategy {
    @Override
    public String name() {
        return "Compact";
    }

    @Override
    protected double computeRaw(Schedule schedule, SchedulePreference prefs) {
        return 1.0 / (1.0 + schedule.totalGapMinutes() / 120.0);
    }

    @Override
    public double weight(SchedulePreference prefs) {
        return prefs.minimizeGaps() ? 2.0 : 1.0;
    }
}
