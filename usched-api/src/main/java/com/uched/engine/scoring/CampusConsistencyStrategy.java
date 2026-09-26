package com.uched.engine.scoring;

import com.uched.domain.model.Room;
import com.uched.domain.model.Schedule;
import com.uched.domain.model.Section;
import com.uched.engine.preference.SchedulePreference;

import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * USC has two physical campuses (Main and Talamban); crossing between them mid-week (or mid-day) is a real
 * commute, not just a room change. Scores higher the more of the schedule's sections sit on a single,
 * shared campus - so if most of a student's courses land in Talamban, the best-ranked schedules keep the
 * rest there too instead of scattering a couple of sections onto Main. On by default (part of
 * ScheduleScorer.withDefaults()), weighted heavily: this matters more than most other soft preferences.
 */
public class CampusConsistencyStrategy extends AbstractScoringStrategy {
    @Override
    public String name() {
        return "CampusConsistency";
    }

    @Override
    protected double computeRaw(Schedule schedule, SchedulePreference prefs) {
        Map<String, Long> byCampus = schedule.getSections().stream()
                .map(CampusConsistencyStrategy::campusOf)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));
        if (byCampus.isEmpty()) {
            return 1.0; // no room data to go on (e.g. every meeting is TBA): nothing to penalise
        }
        long known = byCampus.values().stream().mapToLong(Long::longValue).sum();
        long majority = byCampus.values().stream().mapToLong(Long::longValue).max().orElse(0);
        return (double) majority / known;
    }

    @Override
    public double weight(SchedulePreference prefs) {
        return 2.5;
    }

    /** The campus most of a section's own meetings are held on, or null if none of them name a room. */
    private static String campusOf(Section section) {
        Map<String, Long> counts = section.getMeetings().stream()
                .map(m -> m.getRoom().map(Room::campus).orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));
        return counts.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
    }
}
