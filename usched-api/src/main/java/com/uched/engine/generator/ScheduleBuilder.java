package com.uched.engine.generator;

import com.uched.domain.model.Schedule;
import com.uched.domain.model.Section;

import java.util.ArrayList;
import java.util.List;

/** Mutable, engine-internal accumulator used during the search; frozen into an immutable Schedule. */
public class ScheduleBuilder {
    private final List<Section> chosen = new ArrayList<>();

    public boolean conflictsWith(Section candidate) {
        return chosen.stream().anyMatch(s -> s.conflictsWith(candidate));
    }

    public void push(Section section) {
        chosen.add(section);
    }

    public void pop() {
        chosen.remove(chosen.size() - 1);
    }

    public Schedule snapshot() {
        return Schedule.of(chosen);
    }
}
