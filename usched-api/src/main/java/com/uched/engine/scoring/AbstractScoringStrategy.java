package com.uched.engine.scoring;

import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;

/** Template Method: score() is fixed; subclasses supply computeRaw(). */
public abstract class AbstractScoringStrategy implements ScoringStrategy {

    @Override
    public final double score(Schedule schedule, SchedulePreference prefs) {
        double raw = computeRaw(schedule, prefs);
        if (Double.isNaN(raw)) {
            return 0.0;
        }
        return Math.max(0.0, Math.min(1.0, raw));
    }

    protected abstract double computeRaw(Schedule schedule, SchedulePreference prefs);
}
