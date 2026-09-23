package com.uched.domain;

import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.exception.MissingScheduleInfoException;
import com.uched.domain.model.LabMeeting;
import com.uched.domain.model.LectureMeeting;
import com.uched.domain.model.Meeting;
import com.uched.domain.model.MeetingType;
import com.uched.domain.model.Schedule;
import com.uched.domain.model.Section;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.util.List;

import static com.uched.engine.Fixtures.lab;
import static com.uched.engine.Fixtures.lecture;
import static com.uched.engine.Fixtures.section;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ConflictAndEncapsulationTest {
    private static final DayOfWeek MON = DayOfWeek.MONDAY;
    private static final DayOfWeek TUE = DayOfWeek.TUESDAY;

    @Test
    void sameDayOverlapConflicts() {
        assertThat(lecture(MON, "08:00", "09:30").conflictsWith(lecture(MON, "09:00", "10:30"))).isTrue();
    }

    @Test
    void adjacentAndDifferentDayDoNotConflict() {
        assertThat(lecture(MON, "08:00", "09:30").conflictsWith(lecture(MON, "09:30", "11:00"))).isFalse();
        assertThat(lecture(MON, "08:00", "09:30").conflictsWith(lecture(TUE, "08:00", "09:30"))).isFalse();
    }

    @Test
    void lectureVsLabConflict() {
        assertThat(lecture(MON, "08:00", "09:30").conflictsWith(lab(MON, "09:00", "10:00"))).isTrue();
    }

    @Test
    void multiMeetingSectionsConflictOnAnyMeeting() {
        Section a = section("CIS 1", "A", lecture(MON, "08:00", "09:30"), lecture(DayOfWeek.WEDNESDAY, "08:00", "09:30"));
        Section b = section("MATH 1", "A", lecture(TUE, "08:00", "09:30"), lecture(DayOfWeek.WEDNESDAY, "09:00", "10:00"));
        assertThat(a.conflictsWith(b)).isTrue();
    }

    @Test
    void polymorphicMeetingTypeAndDescription() {
        Meeting lec = lecture(MON, "08:00", "09:00");
        Meeting lb = lab(MON, "10:00", "11:00");
        assertThat(lec).isInstanceOf(LectureMeeting.class);
        assertThat(lb).isInstanceOf(LabMeeting.class);
        assertThat(lec.getType()).isEqualTo(MeetingType.LECTURE);
        assertThat(lb.getType()).isEqualTo(MeetingType.LAB);
        assertThat(lec.describe()).startsWith("Lecture");
        assertThat(lb.describe()).startsWith("Lab");
    }

    @Test
    void sectionMeetingsCannotBeModified() {
        Section s = section("CIS 1", "A", lecture(MON, "08:00", "09:00"));
        assertThatThrownBy(() -> s.getMeetings().add(lecture(TUE, "08:00", "09:00")))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void scheduleIsImmutableEvenIfSourceListChanges() {
        Section s = section("CIS 1", "A", lecture(MON, "08:00", "09:00"));
        List<Section> source = new java.util.ArrayList<>(List.of(s));
        Schedule schedule = Schedule.of(source);
        source.clear();
        assertThat(schedule.getSections()).hasSize(1);
        assertThatThrownBy(() -> schedule.getSections().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void invalidStateCannotBeConstructed() {
        assertThatThrownBy(() -> section("CIS 1", "A")).isInstanceOf(MissingScheduleInfoException.class);
        assertThatThrownBy(() -> section(" ", "A", lecture(MON, "08:00", "09:00")))
                .isInstanceOf(InvalidCourseDataException.class);
    }

    @Test
    void scheduleStats() {
        Schedule s = Schedule.of(List.of(
                section("A 1", "A", lecture(MON, "08:00", "09:00")),
                section("B 1", "A", lecture(MON, "10:00", "11:00"), lecture(TUE, "13:00", "14:00"))));
        assertThat(s.hasConflict()).isFalse();
        assertThat(s.schoolDays()).containsExactly(MON, TUE);
        assertThat(s.earliestStart()).contains(java.time.LocalTime.of(8, 0));
        assertThat(s.latestEnd()).contains(java.time.LocalTime.of(14, 0));
        assertThat(s.totalGapMinutes()).isEqualTo(60);
        assertThat(s.totalUnits()).isEqualTo(6.0);
    }
}
