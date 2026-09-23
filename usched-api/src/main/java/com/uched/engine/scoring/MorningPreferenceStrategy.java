package com.uched.engine.scoring;

import com.uched.domain.model.Meeting;
import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;

import java.time.LocalTime;

/** Share of class time before noon; inverted when the student prefers afternoons. */
public class MorningPreferenceStrategy extends AbstractScoringStrategy {
    private static final LocalTime NOON = LocalTime.NOON;

    @Override
    public String name() {
        return "Morning";
    }

    @Override
    protected double computeRaw(Schedule schedule, SchedulePreference prefs) {
        double morning = 0;
        double total = 0;
        for (var section : schedule.getSections()) {
            for (Meeting m : section.getMeetings()) {
                total += m.getTime().durationMinutes();
                LocalTime end = m.getTime().end().isAfter(NOON) ? NOON : m.getTime().end();
                if (m.getTime().start().isBefore(NOON)) {
                    morning += java.time.Duration.between(m.getTime().start(), end).toMinutes();
                }
            }
        }
        if (total == 0) {
            return 0.5;
        }
        double fraction = morning / total;
        return prefs.preferAfternoon() ? 1.0 - fraction : fraction;
    }

    @Override
    public double weight(SchedulePreference prefs) {
        return (prefs.preferMorning() || prefs.preferAfternoon()) ? 2.0 : 1.0;
    }
}
