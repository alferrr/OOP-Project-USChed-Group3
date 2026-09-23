package com.uched.engine.constraint;

import com.uched.engine.preference.SchedulePreference;

import java.util.ArrayList;
import java.util.List;

/** Turns the hard half of a SchedulePreference into constraint objects. */
public final class ConstraintFactory {
    private ConstraintFactory() {
    }

    public static List<ScheduleConstraint> from(SchedulePreference p) {
        List<ScheduleConstraint> list = new ArrayList<>();
        p.maxSchoolDays().ifPresent(v -> list.add(new MaxSchoolDaysConstraint(v)));
        p.maxClassesPerDay().ifPresent(v -> list.add(new MaxClassesPerDayConstraint(v)));
        p.minBreakMinutes().filter(v -> v > 0).ifPresent(v -> list.add(new MinBreakConstraint(v)));
        p.earliestStart().ifPresent(v -> list.add(new EarliestStartConstraint(v)));
        p.latestEnd().ifPresent(v -> list.add(new LatestEndConstraint(v)));
        if (!p.avoidDays().isEmpty()) {
            list.add(new AvoidDaysConstraint(p.avoidDays()));
        }
        return List.copyOf(list);
    }
}
