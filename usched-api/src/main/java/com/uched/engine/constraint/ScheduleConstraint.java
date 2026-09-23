package com.uched.engine.constraint;

import com.uched.domain.model.Schedule;

/**
 * One hard rule. Every implementation is monotone: if a partial schedule violates it,
 * so does any schedule extending it, which lets the generator prune early.
 */
public interface ScheduleConstraint {
    boolean isSatisfiedBy(Schedule schedule);

    String description();
}
