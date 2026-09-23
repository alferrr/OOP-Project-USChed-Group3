package com.uched.domain.value;

import com.uched.domain.exception.InvalidTimeRangeException;

import java.time.Duration;
import java.time.LocalTime;

/** Immutable half-open time interval [start, end). Adjacent ranges do not overlap. */
public record TimeRange(LocalTime start, LocalTime end) {

    public TimeRange {
        if (start == null || end == null) {
            throw new InvalidTimeRangeException("Start and end time are required");
        }
        if (!start.isBefore(end)) {
            throw new InvalidTimeRangeException("Start (" + start + ") must be before end (" + end + ")");
        }
    }

    public static TimeRange of(String start, String end) {
        return new TimeRange(LocalTime.parse(start), LocalTime.parse(end));
    }

    public boolean overlaps(TimeRange other) {
        return start.isBefore(other.end) && other.start.isBefore(end);
    }

    public int durationMinutes() {
        return (int) Duration.between(start, end).toMinutes();
    }
}
