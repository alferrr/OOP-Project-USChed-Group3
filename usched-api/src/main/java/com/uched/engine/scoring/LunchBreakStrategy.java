package com.uched.engine.scoring;

import com.uched.domain.model.Meeting;
import com.uched.domain.model.Schedule;
import com.uched.engine.preference.SchedulePreference;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

/**
 * Scores higher the more school days give the student a real midday break. On by default (part of
 * ScheduleScorer.withDefaults()), so the best schedules have a lunch break even with no preferences set.
 */
public class LunchBreakStrategy extends AbstractScoringStrategy {
    private static final LocalTime WINDOW_START = LocalTime.of(11, 0);
    private static final LocalTime WINDOW_END = LocalTime.of(14, 0);
    private static final int MIN_BREAK_MINUTES = 60;

    @Override
    public String name() {
        return "LunchBreak";
    }

    @Override
    protected double computeRaw(Schedule schedule, SchedulePreference prefs) {
        Map<DayOfWeek, List<Meeting>> byDay = schedule.meetingsByDay();
        if (byDay.isEmpty()) {
            return 1.0;
        }
        long withBreak = byDay.values().stream().filter(LunchBreakStrategy::hasLunchBreak).count();
        return (double) withBreak / byDay.size();
    }

    @Override
    public double weight(SchedulePreference prefs) {
        // Heavier than the others by default: a lunch break is a common, concrete want, worth outweighing
        // CompactScheduleStrategy's usual preference for zero gaps when the two disagree.
        return prefs.prioritizeLunchBreak() ? 3.0 : 1.5;
    }

    /** True if the day has a free, contiguous stretch of at least an hour overlapping 11:00-14:00. */
    static boolean hasLunchBreak(List<Meeting> dayMeetings) {
        LocalTime cursor = WINDOW_START;
        for (Meeting m : dayMeetings) {
            LocalTime start = clamp(m.getTime().start());
            LocalTime end = clamp(m.getTime().end());
            if (start.isAfter(cursor) && java.time.Duration.between(cursor, start).toMinutes() >= MIN_BREAK_MINUTES) {
                return true;
            }
            if (end.isAfter(cursor)) {
                cursor = end;
            }
            if (!cursor.isBefore(WINDOW_END)) {
                return false;
            }
        }
        return java.time.Duration.between(cursor, WINDOW_END).toMinutes() >= MIN_BREAK_MINUTES;
    }

    private static LocalTime clamp(LocalTime t) {
        if (t.isBefore(WINDOW_START)) {
            return WINDOW_START;
        }
        return t.isAfter(WINDOW_END) ? WINDOW_END : t;
    }
}
