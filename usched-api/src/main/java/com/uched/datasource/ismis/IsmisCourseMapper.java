package com.uched.datasource.ismis;

import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.exception.USChedException;
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
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Anti-corruption layer: raw rows in, validated domain objects out. Bad rows are skipped and reported.
 * Handles the real formats: "CIS 2105 - Group 1", "MW 03:00 PM - 05:30 PM LB470TC", "24/24".
 */
public class IsmisCourseMapper {
    private static final Pattern CODE_GROUP = Pattern.compile("^(.+?)\\s+-\\s+(.+)$");
    private static final Pattern ENROLLED = Pattern.compile("^(\\d+)\\s*/\\s*(\\d+)$");
    private static final Pattern SEGMENT = Pattern.compile(
            "^\\s*([MTWFS][A-Za-z]*)\\s+(\\d{1,2})(?::(\\d{2}))?\\s*([AaPp][Mm])?\\s*(?:-|–|to)\\s*"
                    + "(\\d{1,2})(?::(\\d{2}))?\\s*([AaPp][Mm])?(?:\\s+(\\S.*?))?\\s*$");

    public record Result(List<Course> courses, List<String> skipped) {
    }

    private static final class SectionAcc {
        final List<Meeting> meetings = new ArrayList<>();
        Instructor instructor;
        Integer slots;
    }

    private static final class CourseAcc {
        String title;
        final Map<String, SectionAcc> sections = new LinkedHashMap<>();
    }

    public Result map(List<IsmisRawCourse> rows, Semester semester, String academicYear, String campus,
                      double defaultUnits) {
        Map<String, CourseAcc> byCode = new LinkedHashMap<>();
        List<String> skipped = new ArrayList<>();
        for (IsmisRawCourse raw : rows) {
            try {
                readRow(raw, campus, byCode);
            } catch (USChedException | IllegalArgumentException e) {
                skipped.add((raw.courseCode() == null || raw.courseCode().isBlank() ? "row" : raw.courseCode().trim())
                        + " (row " + raw.row() + "): " + e.getMessage());
            }
        }
        List<Course> courses = new ArrayList<>();
        byCode.forEach((code, c) -> {
            List<Section> sections = new ArrayList<>();
            c.sections.forEach((sectionCode, s) -> {
                try {
                    sections.add(new Section(null, code, c.title, defaultUnits, sectionCode, s.instructor,
                            semester, academicYear, s.slots, s.meetings));
                } catch (USChedException e) {
                    skipped.add(code + "-" + sectionCode + ": " + e.getMessage());
                }
            });
            try {
                courses.add(new Course(null, code, c.title, null, defaultUnits, null, null, sections));
            } catch (USChedException e) {
                skipped.add(code + ": " + e.getMessage());
            }
        });
        return new Result(courses, skipped);
    }

    private void readRow(IsmisRawCourse raw, String campus, Map<String, CourseAcc> byCode) {
        Matcher cg = CODE_GROUP.matcher(need(raw.courseCode(), "course code"));
        if (!cg.matches()) {
            throw new InvalidCourseDataException("expected \"CODE - Group\" but got \"" + raw.courseCode() + "\"");
        }
        String code = cg.group(1).trim();
        String section = cg.group(2).trim();
        String title = need(raw.title(), "description");
        boolean lab = title.toLowerCase(Locale.ROOT).matches(".*\\blab(oratory)?\\b.*");

        List<Meeting> meetings = new ArrayList<>();
        for (String line : raw.scheduleLines() == null ? List.<String>of() : raw.scheduleLines()) {
            meetings.addAll(parseSegment(line, campus, lab));
        }
        if (meetings.isEmpty()) {
            throw new InvalidCourseDataException("no usable schedule");
        }

        CourseAcc c = byCode.computeIfAbsent(code, k -> new CourseAcc());
        c.title = title;
        SectionAcc s = c.sections.computeIfAbsent(section, k -> new SectionAcc());
        s.meetings.addAll(meetings);
        List<String> teachers = raw.teachers() == null ? List.of() : raw.teachers();
        if (!teachers.isEmpty()) {
            String name = String.join(" / ", teachers);
            s.instructor = new Instructor(null, name.substring(0, Math.min(150, name.length())));
        }
        if (raw.enrolled() != null) {
            Matcher e = ENROLLED.matcher(raw.enrolled().trim());
            if (e.matches()) {
                s.slots = Math.max(0, Integer.parseInt(e.group(2)) - Integer.parseInt(e.group(1)));
            }
        }
    }

    static List<Meeting> parseSegment(String segment, String campus, boolean lab) {
        Matcher m = SEGMENT.matcher(segment);
        if (!m.matches()) {
            throw new InvalidCourseDataException("unrecognised schedule: " + segment.trim());
        }
        List<DayOfWeek> days = parseDays(m.group(1));
        String endSuffix = m.group(7);
        LocalTime end = time(m.group(5), m.group(6), endSuffix);
        LocalTime start = time(m.group(2), m.group(3), m.group(4) != null ? m.group(4) : endSuffix);
        if (m.group(4) == null && !start.isBefore(end) && start.getHour() >= 12) {
            start = start.minusHours(12);
        }
        TimeRange range = new TimeRange(start, end);
        String roomText = m.group(8);
        Room room = roomText == null || roomText.equalsIgnoreCase("TBA") ? null
                : new Room(null, roomText.trim(), campusOf(roomText.trim(), campus));
        List<Meeting> out = new ArrayList<>();
        for (DayOfWeek d : days) {
            out.add(lab ? new LabMeeting(d, range, room) : new LectureMeeting(d, range, room));
        }
        return out;
    }

    /**
     * USC's two campuses show up as a suffix baked right into the room code (e.g. "LB470TC" -> Talamban,
     * "LB201MC" -> Main), not as a separate field ISMIS reports - so the campus configured as a "default"
     * is really only a fallback for the rare room code that has neither suffix.
     */
    static String campusOf(String roomCode, String fallback) {
        String upper = roomCode.toUpperCase(Locale.ROOT);
        if (upper.endsWith("TC")) {
            return "Talamban";
        }
        if (upper.endsWith("MC")) {
            return "Main";
        }
        return fallback;
    }

    static List<DayOfWeek> parseDays(String token) {
        List<DayOfWeek> days = new ArrayList<>();
        String t = token;
        while (!t.isEmpty()) {
            String lower = t.toLowerCase(Locale.ROOT);
            if (lower.startsWith("th")) {
                days.add(DayOfWeek.THURSDAY);
                t = t.substring(2);
            } else if (lower.startsWith("sat")) {
                days.add(DayOfWeek.SATURDAY);
                t = t.substring(3);
            } else {
                switch (Character.toUpperCase(t.charAt(0))) {
                    case 'M' -> days.add(DayOfWeek.MONDAY);
                    case 'T' -> days.add(DayOfWeek.TUESDAY);
                    case 'W' -> days.add(DayOfWeek.WEDNESDAY);
                    case 'F' -> days.add(DayOfWeek.FRIDAY);
                    case 'S' -> days.add(DayOfWeek.SATURDAY);
                    default -> throw new InvalidCourseDataException("unknown day token: " + token);
                }
                t = t.substring(1);
            }
        }
        return days;
    }

    private static LocalTime time(String hour, String minute, String suffix) {
        int h = Integer.parseInt(hour);
        int min = minute == null ? 0 : Integer.parseInt(minute);
        if (suffix != null) {
            boolean pm = suffix.equalsIgnoreCase("pm");
            h = h % 12 + (pm ? 12 : 0);
        }
        return LocalTime.of(h, min);
    }

    private static String need(String v, String what) {
        if (v == null || v.isBlank()) {
            throw new InvalidCourseDataException("missing " + what);
        }
        return v;
    }
}
