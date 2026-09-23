package com.uched.api;

import com.uched.datasource.FetchedCourseDataSource;
import com.uched.datasource.SourceType;
import com.uched.domain.model.Course;
import com.uched.domain.model.LectureMeeting;
import com.uched.domain.model.Section;
import com.uched.domain.value.Semester;
import com.uched.domain.value.TimeRange;
import com.uched.persistence.repository.CourseRepository;
import com.uched.service.CourseImportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.DayOfWeek;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ImportUnitsTest extends ApiTestBase {
    @Autowired CourseImportService importService;
    @Autowired CourseRepository courseRepo;

    private Course scraped(double units) {
        Section s = new Section(null, "CIS 2105", "NETWORKING II", units, "Group 1", null, Semester.FIRST, "2026-2027", 0,
                List.of(new LectureMeeting(DayOfWeek.MONDAY, TimeRange.of("15:00", "17:30"), null)));
        return new Course(null, "CIS 2105", "NETWORKING II", null, units, null, null, List.of(s));
    }

    @Test
    void aSourceWithoutUnitsNeverOverwritesKnownUnits() {
        load("CIS 2105,Networking II,4,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,08:00,09:00,LB 1,Talamban\n");
        importService.importFrom(new FetchedCourseDataSource(SourceType.ISMIS, List.of(scraped(3.0)), List.of(), false),
                Semester.FIRST, "2026-2027", STUDENT);
        assertThat(courseRepo.findByStudentIdNumberAndCode(STUDENT, "CIS 2105").orElseThrow().getUnits()).isEqualByComparingTo("4");
    }

    @Test
    void aBrandNewCourseFromSuchASourceGetsTheDefaultUnits() {
        importService.importFrom(new FetchedCourseDataSource(SourceType.ISMIS, List.of(scraped(3.0)), List.of(), false),
                Semester.FIRST, "2026-2027", STUDENT);
        assertThat(courseRepo.findByStudentIdNumberAndCode(STUDENT, "CIS 2105").orElseThrow().getUnits()).isEqualByComparingTo("3");
    }

    @Test
    void aSourceThatDoesProvideUnitsStillUpdatesThem() {
        load("CIS 2105,Networking II,4,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,08:00,09:00,LB 1,Talamban\n");
        importService.importFrom(new FetchedCourseDataSource(SourceType.CSV, List.of(scraped(5.0)), List.of(), true),
                Semester.FIRST, "2026-2027", STUDENT);
        assertThat(courseRepo.findByStudentIdNumberAndCode(STUDENT, "CIS 2105").orElseThrow().getUnits()).isEqualByComparingTo("5");
    }
}
