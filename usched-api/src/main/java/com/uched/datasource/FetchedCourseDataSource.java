package com.uched.datasource;

import com.uched.domain.model.Course;
import com.uched.domain.value.Semester;

import java.util.List;

/** Already-fetched data (e.g. from a finished scrape) so import never touches a live session. */
public class FetchedCourseDataSource implements CourseDataSource {
    private final SourceType type;
    private final List<Course> courses;
    private final List<String> skipped;
    private final boolean providesUnits;

    public FetchedCourseDataSource(SourceType type, List<Course> courses, List<String> skipped) {
        this(type, courses, skipped, true);
    }

    public FetchedCourseDataSource(SourceType type, List<Course> courses, List<String> skipped, boolean providesUnits) {
        this.providesUnits = providesUnits;
        this.type = type;
        this.courses = List.copyOf(courses);
        this.skipped = List.copyOf(skipped);
    }

    @Override
    public List<Course> fetchCourses(Semester semester, String academicYear) {
        return courses;
    }

    @Override
    public boolean providesUnits() {
        return providesUnits;
    }

    @Override
    public SourceType type() {
        return type;
    }

    @Override
    public List<String> skippedRecords() {
        return skipped;
    }
}
