package com.uched.engine.generator;

import com.uched.domain.exception.NoValidScheduleException;
import com.uched.domain.model.Course;
import com.uched.domain.model.Schedule;
import com.uched.engine.validator.ScheduleValidator;

import java.util.List;

/** Hides how combinations are searched. */
public interface ScheduleGenerator {
    List<Schedule> generate(List<Course> courses, ScheduleValidator validator, int limit)
            throws NoValidScheduleException;
}
