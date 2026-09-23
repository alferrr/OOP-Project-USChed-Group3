package com.uched.datasource;

import com.uched.domain.model.Course;
import com.uched.domain.value.Semester;

import java.util.List;

/** In-memory data for tests. */
public class MockCourseDataSource implements CourseDataSource {
    private final List<Course> courses;

    public MockCourseDataSource(List<Course> courses) {
        this.courses = List.copyOf(courses);
    }

    @Override
    public List<Course> fetchCourses(Semester semester, String academicYear) {
        return courses;
    }

    @Override
    public SourceType type() {
        return SourceType.MOCK;
    }
}
