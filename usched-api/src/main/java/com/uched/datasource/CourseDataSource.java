package com.uched.datasource;

import com.uched.domain.exception.DataSourceException;
import com.uched.domain.model.Course;
import com.uched.domain.value.Semester;

import java.util.List;

/** Hides where course data comes from (ISMIS, CSV, mock). */
public interface CourseDataSource {
    List<Course> fetchCourses(Semester semester, String academicYear) throws DataSourceException;

    SourceType type();

    /** False when the source has no units information (the importer then keeps units it already knows). */
    default boolean providesUnits() {
        return true;
    }

    /** Records skipped while reading (bad rows), for the import report. */
    default List<String> skippedRecords() {
        return List.of();
    }
}
