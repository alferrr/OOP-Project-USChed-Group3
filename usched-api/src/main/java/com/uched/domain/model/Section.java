package com.uched.domain.model;

import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.exception.MissingScheduleInfoException;
import com.uched.domain.value.Semester;

import java.util.List;
import java.util.Optional;

public class Section {
    private final Long id;
    private final String courseCode;
    private final String courseName;
    private final double units;
    private final String sectionCode;
    private final Instructor instructor;
    private final Semester semester;
    private final String academicYear;
    private final Integer availableSlots;
    private final List<Meeting> meetings;

    public Section(Long id, String courseCode, String courseName, double units, String sectionCode,
                   Instructor instructor, Semester semester, String academicYear,
                   Integer availableSlots, List<Meeting> meetings) {
        if (courseCode == null || courseCode.isBlank()) {
            throw new InvalidCourseDataException("Course code is required");
        }
        if (sectionCode == null || sectionCode.isBlank()) {
            throw new InvalidCourseDataException("Section code is required for " + courseCode);
        }
        if (units <= 0) {
            throw new InvalidCourseDataException("Units must be positive for " + courseCode);
        }
        if (semester == null || academicYear == null || academicYear.isBlank()) {
            throw new InvalidCourseDataException("Semester and academic year are required for " + courseCode);
        }
        if (meetings == null || meetings.isEmpty()) {
            throw new MissingScheduleInfoException(courseCode + "-" + sectionCode + " has no meeting times");
        }
        this.id = id;
        this.courseCode = courseCode.trim();
        this.courseName = courseName == null ? "" : courseName.trim();
        this.units = units;
        this.sectionCode = sectionCode.trim();
        this.instructor = instructor;
        this.semester = semester;
        this.academicYear = academicYear.trim();
        this.availableSlots = availableSlots;
        this.meetings = List.copyOf(meetings);
    }

    public Long getId() {
        return id;
    }

    public String getCourseCode() {
        return courseCode;
    }

    public String getCourseName() {
        return courseName;
    }

    public double getUnits() {
        return units;
    }

    public String getSectionCode() {
        return sectionCode;
    }

    public Optional<Instructor> getInstructor() {
        return Optional.ofNullable(instructor);
    }

    public Semester getSemester() {
        return semester;
    }

    public String getAcademicYear() {
        return academicYear;
    }

    public Optional<Integer> getAvailableSlots() {
        return Optional.ofNullable(availableSlots);
    }

    public List<Meeting> getMeetings() {
        return meetings;
    }

    public String label() {
        return courseCode + "-" + sectionCode;
    }

    public boolean conflictsWith(Section other) {
        for (Meeting a : meetings) {
            for (Meeting b : other.meetings) {
                if (a.conflictsWith(b)) {
                    return true;
                }
            }
        }
        return false;
    }

    @Override
    public String toString() {
        return "Section[" + label() + "]";
    }
}
