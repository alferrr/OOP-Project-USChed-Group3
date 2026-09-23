package com.uched.engine.generator;

import com.uched.domain.exception.NoValidScheduleException;
import com.uched.domain.model.Course;
import com.uched.domain.model.Schedule;
import com.uched.domain.model.Section;
import com.uched.engine.validator.ScheduleValidator;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Backtracking with early pruning: conflicting or constraint-violating branches are cut immediately. */
public class BacktrackingScheduleGenerator implements ScheduleGenerator {

    @Override
    public List<Schedule> generate(List<Course> courses, ScheduleValidator validator, int limit) {
        List<Course> ordered = new ArrayList<>(courses);
        ordered.sort(Comparator.comparingInt(c -> c.getSections().size()));

        List<String> empty = ordered.stream()
                .filter(c -> c.getSections().isEmpty())
                .map(c -> c.getCode() + " has no sections offered this term")
                .toList();
        if (!empty.isEmpty()) {
            throw new NoValidScheduleException("Some selected courses have no sections.", empty);
        }

        List<Schedule> results = new ArrayList<>();
        search(ordered, 0, new ScheduleBuilder(), validator, limit, results);

        if (results.isEmpty()) {
            throw new NoValidScheduleException(
                    "No conflict-free schedule exists for the selected courses.",
                    explain(ordered, validator));
        }
        return List.copyOf(results);
    }

    private void search(List<Course> courses, int index, ScheduleBuilder builder,
                        ScheduleValidator validator, int limit, List<Schedule> results) {
        if (results.size() >= limit) {
            return;
        }
        if (index == courses.size()) {
            Schedule full = builder.snapshot();
            Set<String> required = new HashSet<>();
            courses.forEach(c -> required.add(c.getCode()));
            if (validator.isValid(full, required)) {
                results.add(full);
            }
            return;
        }
        for (Section section : courses.get(index).getSections()) {
            if (builder.conflictsWith(section)) {
                continue;
            }
            builder.push(section);
            if (validator.satisfiesConstraints(builder.snapshot())) {
                search(courses, index + 1, builder, validator, limit, results);
            }
            builder.pop();
            if (results.size() >= limit) {
                return;
            }
        }
    }

    /** Pinpoints course pairs where every section pairing conflicts; falls back to a hint about preferences. */
    private List<String> explain(List<Course> courses, ScheduleValidator validator) {
        List<String> details = new ArrayList<>();
        for (int i = 0; i < courses.size(); i++) {
            for (int j = i + 1; j < courses.size(); j++) {
                Course a = courses.get(i);
                Course b = courses.get(j);
                boolean allConflict = a.getSections().stream()
                        .allMatch(sa -> b.getSections().stream().allMatch(sa::conflictsWith));
                if (allConflict) {
                    details.add("Every section of " + a.getCode() + " conflicts with every section of " + b.getCode());
                }
            }
        }
        if (details.isEmpty()) {
            if (validator.constraints().isEmpty()) {
                details.add("The sections cannot be combined without overlapping; try different courses.");
            } else {
                details.add("Your preferences rule out every combination; try relaxing them.");
            }
        }
        return details;
    }
}
