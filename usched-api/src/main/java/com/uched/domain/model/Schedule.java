package com.uched.domain.model;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;

/** Immutable set of sections, one per selected course. Built via the engine's ScheduleBuilder. */
public final class Schedule {
    private static final Comparator<Meeting> BY_START = Comparator.comparing(m -> m.getTime().start());

    private final List<Section> sections;

    private Schedule(List<Section> sections) {
        this.sections = List.copyOf(sections);
    }

    public static Schedule of(List<Section> sections) {
        return new Schedule(sections);
    }

    public List<Section> getSections() {
        return sections;
    }

    public boolean conflictsWith(Section candidate) {
        return sections.stream().anyMatch(s -> s.conflictsWith(candidate));
    }

    public boolean hasConflict() {
        for (int i = 0; i < sections.size(); i++) {
            for (int j = i + 1; j < sections.size(); j++) {
                if (sections.get(i).conflictsWith(sections.get(j))) {
                    return true;
                }
            }
        }
        return false;
    }

    public double totalUnits() {
        return sections.stream().mapToDouble(Section::getUnits).sum();
    }

    public Set<DayOfWeek> schoolDays() {
        Set<DayOfWeek> days = new TreeSet<>();
        sections.forEach(s -> s.getMeetings().forEach(m -> days.add(m.getDay())));
        return days;
    }

    public Optional<LocalTime> earliestStart() {
        return allMeetings().map(m -> m.getTime().start()).min(Comparator.naturalOrder());
    }

    public Optional<LocalTime> latestEnd() {
        return allMeetings().map(m -> m.getTime().end()).max(Comparator.naturalOrder());
    }

    /** Meetings grouped by day, each day's list sorted by start time. Days without classes are absent. */
    public Map<DayOfWeek, List<Meeting>> meetingsByDay() {
        Map<DayOfWeek, List<Meeting>> byDay = new EnumMap<>(DayOfWeek.class);
        allMeetings().forEach(m -> byDay.computeIfAbsent(m.getDay(), d -> new ArrayList<>()).add(m));
        byDay.replaceAll((d, list) -> List.copyOf(list.stream().sorted(BY_START).toList()));
        return Map.copyOf(byDay);
    }

    /** Sum of idle minutes between consecutive classes on the same day. */
    public int totalGapMinutes() {
        int total = 0;
        for (List<Meeting> day : meetingsByDay().values()) {
            LocalTime runningEnd = null;
            for (Meeting m : day) {
                if (runningEnd != null && m.getTime().start().isAfter(runningEnd)) {
                    total += (int) java.time.Duration.between(runningEnd, m.getTime().start()).toMinutes();
                }
                if (runningEnd == null || m.getTime().end().isAfter(runningEnd)) {
                    runningEnd = m.getTime().end();
                }
            }
        }
        return total;
    }

    private java.util.stream.Stream<Meeting> allMeetings() {
        return sections.stream().flatMap(s -> s.getMeetings().stream());
    }
}
