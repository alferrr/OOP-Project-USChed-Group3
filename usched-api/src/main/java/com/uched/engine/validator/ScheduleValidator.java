package com.uched.engine.validator;

import com.uched.domain.model.Schedule;
import com.uched.domain.model.Section;
import com.uched.engine.constraint.ScheduleConstraint;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Checks one section per course, no meeting conflicts, and every hard constraint (polymorphic loop). */
public class ScheduleValidator {
    private final List<ScheduleConstraint> constraints;

    public ScheduleValidator(List<ScheduleConstraint> constraints) {
        this.constraints = List.copyOf(constraints);
    }

    public List<ScheduleConstraint> constraints() {
        return constraints;
    }

    /** True if the (possibly partial) schedule breaks no hard constraint. */
    public boolean satisfiesConstraints(Schedule schedule) {
        for (ScheduleConstraint c : constraints) {
            if (!c.isSatisfiedBy(schedule)) {
                return false;
            }
        }
        return true;
    }

    /** Human-readable violations; empty means valid. */
    public List<String> violations(Schedule schedule, Set<String> requiredCourseCodes) {
        List<String> problems = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (Section s : schedule.getSections()) {
            if (!seen.add(s.getCourseCode())) {
                problems.add("More than one section of " + s.getCourseCode());
            }
        }
        for (String required : requiredCourseCodes) {
            if (!seen.contains(required)) {
                problems.add("Missing a section of " + required);
            }
        }
        if (schedule.hasConflict()) {
            problems.add("Schedule has overlapping meetings");
        }
        for (ScheduleConstraint c : constraints) {
            if (!c.isSatisfiedBy(schedule)) {
                problems.add("Violates: " + c.description());
            }
        }
        return problems;
    }

    public boolean isValid(Schedule schedule, Set<String> requiredCourseCodes) {
        return violations(schedule, requiredCourseCodes).isEmpty();
    }
}
