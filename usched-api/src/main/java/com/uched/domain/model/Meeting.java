package com.uched.domain.model;

import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.value.TimeRange;

import java.time.DayOfWeek;
import java.util.Optional;

/** One class session on one day. A section meeting M/W is stored as two Meetings. */
public abstract class Meeting {
    private final DayOfWeek day;
    private final TimeRange time;
    private final Room room;

    protected Meeting(DayOfWeek day, TimeRange time, Room room) {
        if (day == null || time == null) {
            throw new InvalidCourseDataException("Meeting day and time are required");
        }
        if (day == DayOfWeek.SUNDAY) {
            throw new InvalidCourseDataException("Meetings cannot be on Sunday");
        }
        this.day = day;
        this.time = time;
        this.room = room;
    }

    public DayOfWeek getDay() {
        return day;
    }

    public TimeRange getTime() {
        return time;
    }

    public Optional<Room> getRoom() {
        return Optional.ofNullable(room);
    }

    public abstract MeetingType getType();

    public abstract String describe();

    /** Same day and overlapping time. Adjacent meetings do not conflict. */
    public boolean conflictsWith(Meeting other) {
        return day == other.day && time.overlaps(other.time);
    }

    protected String roomLabel() {
        return room == null ? "TBA" : room.label();
    }
}
