package com.uched.engine.scoring;

import com.uched.domain.model.Meeting;
import com.uched.domain.model.RankedSchedule;
import com.uched.domain.model.Schedule;
import com.uched.domain.model.Section;
import com.uched.engine.preference.SchedulePreference;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Weighted average of enabled strategies, scaled 0-100. Adding a strategy needs no change here. */
public class ScheduleScorer {
    private final List<ScoringStrategy> strategies;

    public ScheduleScorer(List<ScoringStrategy> strategies) {
        this.strategies = List.copyOf(strategies);
    }

    public static ScheduleScorer withDefaults() {
        return new ScheduleScorer(List.of(
                new CompactScheduleStrategy(),
                new MorningPreferenceStrategy(),
                new MinimalDaysStrategy(),
                new InstructorPreferenceStrategy(),
                new LunchBreakStrategy(),
                new CampusConsistencyStrategy()));
    }

    public RankedSchedule score(Schedule schedule, SchedulePreference prefs) {
        Map<String, Double> breakdown = new LinkedHashMap<>();
        double weighted = 0;
        double totalWeight = 0;
        for (ScoringStrategy strategy : strategies) {
            double w = strategy.weight(prefs);
            if (w <= 0) {
                continue; // disabled for these preferences: neither scored nor shown
            }
            double sub = strategy.score(schedule, prefs);
            breakdown.put(strategy.name(), round(sub, 2));
            weighted += sub * w;
            totalWeight += w;
        }
        double score = totalWeight == 0 ? 0 : weighted / totalWeight * 100.0;
        return new RankedSchedule(schedule, round(score, 1), breakdown);
    }

    /**
     * Ranked best-first; ties broken by fewer school days, then fewer gap minutes. At most one schedule per
     * distinct weekly time pattern: several section combinations can land on the exact same days and times
     * (e.g. two elective sections that happen to meet at the same hour), and showing all of them as separate
     * "top" results just looks like the same schedule repeated, so only the best-scoring one of each pattern
     * is kept.
     */
    public List<RankedSchedule> rank(List<Schedule> schedules, SchedulePreference prefs, int topN) {
        List<RankedSchedule> ranked = new ArrayList<>();
        schedules.forEach(s -> ranked.add(score(s, prefs)));
        ranked.sort(Comparator
                .comparingDouble(RankedSchedule::score).reversed()
                .thenComparingInt(r -> r.schedule().schoolDays().size())
                .thenComparingInt(r -> r.schedule().totalGapMinutes()));
        return takeDistinctShapes(ranked, topN);
    }

    /**
     * Ranked by closeness to a reference schedule (most shared sections first, score as the tie-break), for
     * "More like this". The reference schedule itself is excluded: showing the exact same schedule back would
     * not be useful. Still at most one result per distinct weekly time pattern.
     */
    public List<RankedSchedule> rankBySimilarity(List<Schedule> schedules, SchedulePreference prefs,
                                                 Set<Long> referenceSectionIds, int topN) {
        List<RankedSchedule> ranked = new ArrayList<>();
        for (Schedule s : schedules) {
            Set<Long> ids = sectionIds(s);
            if (ids.equals(referenceSectionIds)) {
                continue; // identical to what the student is already looking at
            }
            ranked.add(score(s, prefs));
        }
        ranked.sort(Comparator
                .<RankedSchedule>comparingInt(r -> -overlap(sectionIds(r.schedule()), referenceSectionIds))
                .thenComparing(Comparator.comparingDouble(RankedSchedule::score).reversed()));
        return takeDistinctShapes(ranked, topN);
    }

    private static List<RankedSchedule> takeDistinctShapes(List<RankedSchedule> ordered, int topN) {
        List<RankedSchedule> out = new ArrayList<>();
        Set<List<String>> seenShapes = new HashSet<>();
        for (RankedSchedule r : ordered) {
            if (out.size() >= topN) {
                break;
            }
            if (seenShapes.add(weeklyShape(r.schedule()))) {
                out.add(r);
            }
        }
        return List.copyOf(out);
    }

    /** The schedule's visual pattern on the weekly calendar: every meeting's day+time, independent of which
     * course or section fills it. Two schedules with the same shape look identical to the student. */
    private static List<String> weeklyShape(Schedule schedule) {
        List<String> slots = new ArrayList<>();
        for (Section s : schedule.getSections()) {
            for (Meeting m : s.getMeetings()) {
                slots.add(m.getDay() + " " + m.getTime().start() + "-" + m.getTime().end());
            }
        }
        return slots.stream().sorted().toList();
    }

    private static Set<Long> sectionIds(Schedule schedule) {
        Set<Long> ids = new LinkedHashSet<>();
        schedule.getSections().forEach(s -> ids.add(s.getId()));
        return ids;
    }

    private static int overlap(Set<Long> a, Set<Long> b) {
        int n = 0;
        for (Long id : a) {
            if (b.contains(id)) {
                n++;
            }
        }
        return n;
    }

    private static double round(double v, int places) {
        double f = Math.pow(10, places);
        return Math.round(v * f) / f;
    }
}
