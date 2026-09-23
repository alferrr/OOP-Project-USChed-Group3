package com.uched.domain.model;

import com.uched.domain.value.TimeRange;

import java.time.DayOfWeek;

public class LabMeeting extends Meeting {
    public LabMeeting(DayOfWeek day, TimeRange time, Room room) {
        super(day, time, room);
    }

    @Override
    public MeetingType getType() {
        return MeetingType.LAB;
    }

    @Override
    public String describe() {
        return "Lab " + getDay() + " " + getTime().start() + "-" + getTime().end() + " @ " + roomLabel();
    }
}
