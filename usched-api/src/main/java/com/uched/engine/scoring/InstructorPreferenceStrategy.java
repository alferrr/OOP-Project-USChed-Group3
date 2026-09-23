package com.uched.engine.scoring;

import com.uched.domain.model.Schedule;
import com.uched.domain.model.Section;
import com.uched.engine.preference.SchedulePreference;

public class InstructorPreferenceStrategy extends AbstractScoringStrategy {
    @Override
    public String name() {
        return "Instructor";
    }

    @Override
    protected double computeRaw(Schedule schedule, SchedulePreference prefs) {
        if (schedule.getSections().isEmpty() || prefs.preferredInstructorIds().isEmpty()) {
            return 0.5;
        }
        long hits = schedule.getSections().stream()
                .map(Section::getInstructor)
                .filter(i -> i.isPresent() && prefs.preferredInstructorIds().contains(i.get().getId()))
                .count();
        return (double) hits / schedule.getSections().size();
    }

    @Override
    public double weight(SchedulePreference prefs) {
        return prefs.preferredInstructorIds().isEmpty() ? 0.0 : 2.0;
    }
}
