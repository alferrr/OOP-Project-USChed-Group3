package com.uched.domain.model;

import java.util.Map;

/** A schedule with its 0-100 score and per-strategy sub-scores (0.0-1.0). */
public record RankedSchedule(Schedule schedule, double score, Map<String, Double> breakdown) {
    public RankedSchedule {
        breakdown = Map.copyOf(breakdown);
    }
}
