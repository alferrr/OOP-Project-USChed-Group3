package com.uched.engine;

import com.uched.domain.model.Course;
import com.uched.domain.model.Instructor;
import com.uched.domain.model.LabMeeting;
import com.uched.domain.model.LectureMeeting;
import com.uched.domain.model.Meeting;
import com.uched.domain.model.Room;
import com.uched.domain.model.Section;
import com.uched.domain.value.Semester;
import com.uched.domain.value.TimeRange;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;

public final class Fixtures {
    private Fixtures() {
    }

    public static Meeting lecture(DayOfWeek day, String start, String end) {
        return new LectureMeeting(day, TimeRange.of(start, end), null);
    }

    public static Meeting lab(DayOfWeek day, String start, String end) {
        return new LabMeeting(day, TimeRange.of(start, end), null);
    }

    /** A meeting held in a room on the given campus, for anything testing campus-aware scoring. */
    public static Meeting lectureOn(String campus, DayOfWeek day, String start, String end) {
        return new LectureMeeting(day, TimeRange.of(start, end), new Room(null, "R1", campus));
    }

    public static Section section(String course, String code, Instructor instructor, Meeting... meetings) {
        return new Section(null, course, course + " name", 3, code, instructor,
                Semester.FIRST, "2026-2027", 40, List.of(meetings));
    }

    public static Section section(String course, String code, Meeting... meetings) {
        return section(course, code, null, meetings);
    }

    /** For tests that need real section ids (e.g. anything comparing schedules by section identity). */
    public static Section sectionWithId(long id, String course, String code, Meeting... meetings) {
        return new Section(id, course, course + " name", 3, code, null,
                Semester.FIRST, "2026-2027", 40, List.of(meetings));
    }

    public static Course course(String code, Section... sections) {
        return new Course(null, code, code + " name", null, 3, null, List.of(sections));
    }

    /** A course with n sections, each on a distinct hour slot on Monday. */
    public static Course courseWithSlots(String code, int n, int firstHour) {
        List<Section> sections = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            int h = firstHour + i;
            sections.add(section(code, String.valueOf((char) ('A' + i)),
                    lecture(DayOfWeek.MONDAY, String.format("%02d:00", h), String.format("%02d:30", h))));
        }
        return new Course(null, code, code + " name", null, 3, null, sections);
    }
}
