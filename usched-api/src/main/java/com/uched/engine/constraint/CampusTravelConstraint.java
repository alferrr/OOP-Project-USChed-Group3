package com.uched.engine.constraint;

import com.uched.domain.model.Meeting;
import com.uched.domain.model.Room;
import com.uched.domain.model.Schedule;

import java.time.Duration;
import java.util.List;

/**
 * USC's two campuses (Main and Talamban) are a real commute apart - roughly half an hour by jeepney in
 * typical Cebu traffic, not a room-to-room walk - so two classes back-to-back (or nearly so) on different
 * campuses the same day is often physically impossible, not just inconvenient. Always on, independent of
 * any preference: unlike MinBreakConstraint (a general minimum gap a student opts into), this specifically
 * targets a same-day campus switch and needs a much larger buffer than an ordinary between-class gap.
 * CampusConsistencyStrategy (soft scoring) still favours keeping everything on one campus when possible;
 * this constraint is the hard floor for whenever it isn't.
 */
public class CampusTravelConstraint implements ScheduleConstraint {
    static final int TRAVEL_MINUTES = 45;

    @Override
    public boolean isSatisfiedBy(Schedule schedule) {
        for (List<Meeting> day : schedule.meetingsByDay().values()) {
            for (int i = 1; i < day.size(); i++) {
                String prevCampus = campusOf(day.get(i - 1));
                String nextCampus = campusOf(day.get(i));
                if (prevCampus == null || nextCampus == null || prevCampus.equals(nextCampus)) {
                    continue; // same campus, or one side's room/campus is unknown - nothing to enforce
                }
                long gap = Duration.between(day.get(i - 1).getTime().end(), day.get(i).getTime().start()).toMinutes();
                if (gap < TRAVEL_MINUTES) {
                    return false;
                }
            }
        }
        return true;
    }

    @Override
    public String description() {
        return "at least " + TRAVEL_MINUTES + " minutes to travel between classes on different campuses the same day";
    }

    private static String campusOf(Meeting m) {
        return m.getRoom().map(Room::campus).orElse(null);
    }
}
