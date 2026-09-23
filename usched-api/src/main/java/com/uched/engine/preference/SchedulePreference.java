package com.uched.engine.preference;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Set;

/**
 * Immutable student preferences. Hard rules discard schedules; soft rules only affect scoring.
 * Each preference is one or the other, never both.
 */
public final class SchedulePreference {
    private final Integer maxSchoolDays;
    private final Integer maxClassesPerDay;
    private final Integer minBreakMinutes;
    private final LocalTime earliestStart;
    private final LocalTime latestEnd;
    private final Set<DayOfWeek> avoidDays;

    private final boolean preferMorning;
    private final boolean preferAfternoon;
    private final boolean minimizeGaps;
    private final boolean minimizeDays;
    private final boolean prioritizeLunchBreak;
    private final Set<Long> preferredInstructorIds;

    private SchedulePreference(Builder b) {
        this.maxSchoolDays = b.maxSchoolDays;
        this.maxClassesPerDay = b.maxClassesPerDay;
        this.minBreakMinutes = b.minBreakMinutes;
        this.earliestStart = b.earliestStart;
        this.latestEnd = b.latestEnd;
        this.avoidDays = Set.copyOf(b.avoidDays);
        this.preferMorning = b.preferMorning;
        this.preferAfternoon = b.preferAfternoon;
        this.minimizeGaps = b.minimizeGaps;
        this.minimizeDays = b.minimizeDays;
        this.prioritizeLunchBreak = b.prioritizeLunchBreak;
        this.preferredInstructorIds = Set.copyOf(b.preferredInstructorIds);
    }

    public static SchedulePreference none() {
        return builder().build();
    }

    public static Builder builder() {
        return new Builder();
    }

    public Optional<Integer> maxSchoolDays() {
        return Optional.ofNullable(maxSchoolDays);
    }

    public Optional<Integer> maxClassesPerDay() {
        return Optional.ofNullable(maxClassesPerDay);
    }

    public Optional<Integer> minBreakMinutes() {
        return Optional.ofNullable(minBreakMinutes);
    }

    public Optional<LocalTime> earliestStart() {
        return Optional.ofNullable(earliestStart);
    }

    public Optional<LocalTime> latestEnd() {
        return Optional.ofNullable(latestEnd);
    }

    public Set<DayOfWeek> avoidDays() {
        return avoidDays;
    }

    public boolean preferMorning() {
        return preferMorning;
    }

    public boolean preferAfternoon() {
        return preferAfternoon;
    }

    public boolean minimizeGaps() {
        return minimizeGaps;
    }

    public boolean minimizeDays() {
        return minimizeDays;
    }

    public boolean prioritizeLunchBreak() {
        return prioritizeLunchBreak;
    }

    public Set<Long> preferredInstructorIds() {
        return preferredInstructorIds;
    }

    public static final class Builder {
        private Integer maxSchoolDays;
        private Integer maxClassesPerDay;
        private Integer minBreakMinutes;
        private LocalTime earliestStart;
        private LocalTime latestEnd;
        private final Set<DayOfWeek> avoidDays = EnumSet.noneOf(DayOfWeek.class);
        private boolean preferMorning;
        private boolean preferAfternoon;
        private boolean minimizeGaps;
        private boolean minimizeDays;
        private boolean prioritizeLunchBreak;
        private final Set<Long> preferredInstructorIds = new java.util.HashSet<>();

        public Builder maxSchoolDays(Integer v) {
            this.maxSchoolDays = v;
            return this;
        }

        public Builder maxClassesPerDay(Integer v) {
            this.maxClassesPerDay = v;
            return this;
        }

        public Builder minBreakMinutes(Integer v) {
            this.minBreakMinutes = v;
            return this;
        }

        public Builder earliestStart(LocalTime v) {
            this.earliestStart = v;
            return this;
        }

        public Builder latestEnd(LocalTime v) {
            this.latestEnd = v;
            return this;
        }

        public Builder avoidDay(DayOfWeek d) {
            this.avoidDays.add(d);
            return this;
        }

        public Builder preferMorning(boolean v) {
            this.preferMorning = v;
            return this;
        }

        public Builder preferAfternoon(boolean v) {
            this.preferAfternoon = v;
            return this;
        }

        public Builder minimizeGaps(boolean v) {
            this.minimizeGaps = v;
            return this;
        }

        public Builder minimizeDays(boolean v) {
            this.minimizeDays = v;
            return this;
        }

        public Builder prioritizeLunchBreak(boolean v) {
            this.prioritizeLunchBreak = v;
            return this;
        }

        public Builder preferredInstructorId(long id) {
            this.preferredInstructorIds.add(id);
            return this;
        }

        public SchedulePreference build() {
            return new SchedulePreference(this);
        }
    }
}
