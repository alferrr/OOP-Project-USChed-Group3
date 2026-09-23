package com.uched.engine.scoring;

import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;

public interface ScoringStrategy {
    String name();

    /** 0.0 (worst) to 1.0 (best). */
    double score(Schedule schedule, SchedulePreference prefs);

    /** Relative weight in the final average; 0 disables the strategy for these preferences. */
    default double weight(SchedulePreference prefs) {
        return 1.0;
    }
}
