package com.uched.datasource;

import com.uched.domain.exception.DataSourceException;
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
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

import java.io.IOException;
import java.io.Reader;
import java.time.DayOfWeek;
import java.time.DateTimeException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** One CSV row per meeting. Invalid rows are skipped and reported, never fatal. */
public class CsvCourseDataSource implements CourseDataSource {
    private final Reader reader;
    private final List<String> skipped = new ArrayList<>();

    public CsvCourseDataSource(Reader reader) {
        this.reader = reader;
    }

    @Override
    public SourceType type() {
        return SourceType.CSV;
    }

    @Override
    public List<String> skippedRecords() {
        return List.copyOf(skipped);
    }

    private record SectionKey(String section, Semester semester, String year) {
    }

    private static final class CourseAcc {
        String name, department, prerequisites;
        double units;
        final Map<SectionKey, SectionAcc> sections = new LinkedHashMap<>();
    }

    private static final class SectionAcc {
        String instructor;
        Integer slots;
        final List<Meeting> meetings = new ArrayList<>();
    }

    @Override
    public List<Course> fetchCourses(Semester semester, String academicYear) {
        skipped.clear();
        Map<String, CourseAcc> byCourse = new LinkedHashMap<>();
        try (CSVParser parser = CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true).setTrim(true).build().parse(reader)) {
            for (CSVRecord r : parser) {
                try {
                    readRow(r, semester, academicYear, byCourse);
                } catch (USChedException | IllegalArgumentException | DateTimeException e) {
                    skipped.add("line " + r.getRecordNumber() + ": " + e.getMessage());
                }
            }
        } catch (IOException | IllegalArgumentException e) {
            throw new DataSourceException("Could not read CSV: " + e.getMessage(), e);
        }
        return build(byCourse);
    }

    private void readRow(CSVRecord r, Semester wantedSem, String wantedYear, Map<String, CourseAcc> byCourse) {
        Semester sem = Semester.fromCode(require(r, "semester"));
        String year = require(r, "academic_year");
        if ((wantedSem != null && sem != wantedSem) || (wantedYear != null && !wantedYear.equals(year))) {
            return;
        }
        String code = require(r, "course_code");
        String sectionCode = require(r, "section_code");
        double units = Double.parseDouble(require(r, "units"));
        if (units <= 0) {
            throw new InvalidCourseDataException("units must be positive for " + code);
        }
        DayOfWeek day = parseDay(require(r, "day"));
        TimeRange time = TimeRange.of(require(r, "start_time"), require(r, "end_time"));
        String roomCode = opt(r, "room");
        String campus = opt(r, "campus");
        Room room = roomCode == null ? null : new Room(null, roomCode, campus == null ? "Main" : campus);
        Meeting meeting = "LAB".equalsIgnoreCase(opt(r, "meeting_type"))
                ? new LabMeeting(day, time, room) : new LectureMeeting(day, time, room);

        CourseAcc c = byCourse.computeIfAbsent(code, k -> new CourseAcc());
        c.name = require(r, "course_name");
        c.units = units;
        c.department = opt(r, "department");
        c.prerequisites = opt(r, "prerequisites");
        SectionAcc s = c.sections.computeIfAbsent(new SectionKey(sectionCode, sem, year), k -> new SectionAcc());
        s.instructor = opt(r, "instructor");
        String slots = opt(r, "available_slots");
        s.slots = slots == null ? null : Integer.valueOf(slots);
        s.meetings.add(meeting);
    }

    private List<Course> build(Map<String, CourseAcc> byCourse) {
        List<Course> courses = new ArrayList<>();
        byCourse.forEach((code, c) -> {
            List<Section> sections = new ArrayList<>();
            c.sections.forEach((k, s) -> {
                try {
                    Instructor ins = s.instructor == null ? null : new Instructor(null, s.instructor);
                    sections.add(new Section(null, code, c.name, c.units, k.section(), ins,
                            k.semester(), k.year(), s.slots, s.meetings));
                } catch (USChedException e) {
                    skipped.add(code + "-" + k.section() + ": " + e.getMessage());
                }
            });
            try {
                courses.add(new Course(null, code, c.name, null, c.units, c.department, c.prerequisites, sections));
            } catch (USChedException e) {
                skipped.add(code + ": " + e.getMessage());
            }
        });
        return courses;
    }

    public static DayOfWeek parseDay(String v) {
        return switch (v.trim().toUpperCase()) {
            case "MON" -> DayOfWeek.MONDAY;
            case "TUE" -> DayOfWeek.TUESDAY;
            case "WED" -> DayOfWeek.WEDNESDAY;
            case "THU" -> DayOfWeek.THURSDAY;
            case "FRI" -> DayOfWeek.FRIDAY;
            case "SAT" -> DayOfWeek.SATURDAY;
            default -> throw new InvalidCourseDataException("unknown day: " + v);
        };
    }

    private static String require(CSVRecord r, String col) {
        String v = opt(r, col);
        if (v == null) {
            throw new InvalidCourseDataException("missing " + col);
        }
        return v;
    }

    private static String opt(CSVRecord r, String col) {
        if (!r.isMapped(col) || !r.isSet(col)) {
            return null;
        }
        String v = r.get(col);
        return v == null || v.isBlank() ? null : v.trim();
    }
}
