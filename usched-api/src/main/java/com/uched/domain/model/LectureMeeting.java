package com.uched.domain.model;

import com.uched.domain.value.TimeRange;

import java.time.DayOfWeek;

public class LectureMeeting extends Meeting {
    public LectureMeeting(DayOfWeek day, TimeRange time, Room room) {
        super(day, time, room);
    }

    @Override
    public MeetingType getType() {
        return MeetingType.LECTURE;
    }

    @Override
    public String describe() {
        return "Lecture " + getDay() + " " + getTime().start() + "-" + getTime().end() + " @ " + roomLabel();
    }
}
