package com.uched.domain;

import com.uched.domain.exception.InvalidTimeRangeException;
import com.uched.domain.value.TimeRange;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TimeRangeTest {
    @Test
    void rejectsStartNotBeforeEnd() {
        assertThatThrownBy(() -> TimeRange.of("09:00", "09:00")).isInstanceOf(InvalidTimeRangeException.class);
        assertThatThrownBy(() -> TimeRange.of("10:00", "09:00")).isInstanceOf(InvalidTimeRangeException.class);
    }

    @Test
    void overlapCases() {
        assertThat(TimeRange.of("08:00", "09:30").overlaps(TimeRange.of("09:00", "10:30"))).isTrue();
        assertThat(TimeRange.of("09:00", "10:30").overlaps(TimeRange.of("08:00", "09:30"))).isTrue();
        assertThat(TimeRange.of("08:00", "12:00").overlaps(TimeRange.of("09:00", "10:00"))).isTrue();
    }

    @Test
    void adjacentIsNotOverlap() {
        assertThat(TimeRange.of("08:00", "09:30").overlaps(TimeRange.of("09:30", "11:00"))).isFalse();
    }

    @Test
    void duration() {
        assertThat(TimeRange.of("08:00", "09:30").durationMinutes()).isEqualTo(90);
    }
}
