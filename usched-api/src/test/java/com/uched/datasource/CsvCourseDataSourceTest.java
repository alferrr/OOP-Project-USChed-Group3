package com.uched.datasource;

import com.uched.domain.model.Course;
import com.uched.domain.model.MeetingType;
import com.uched.domain.value.Semester;
import org.junit.jupiter.api.Test;

import java.io.StringReader;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CsvCourseDataSourceTest {
    static final String HEADER = "course_code,course_name,units,department,section_code,instructor,semester,academic_year,available_slots,meeting_type,day,start_time,end_time,room,campus\n";

    @Test
    void groupsRowsIntoCoursesSectionsAndMeetings() {
        String csv = HEADER
                + "CIS 2201,Systems Analysis,3,DCISM,A,Juan Dela Cruz,1ST,2026-2027,40,LECTURE,MON,08:00,09:30,LB 201,Talamban\n"
                + "CIS 2201,Systems Analysis,3,DCISM,A,Juan Dela Cruz,1ST,2026-2027,40,LECTURE,WED,08:00,09:30,LB 201,Talamban\n"
                + "CIS 2201,Systems Analysis,3,DCISM,A,Juan Dela Cruz,1ST,2026-2027,40,LAB,SAT,13:00,16:00,LAB 1,Talamban\n";
        List<Course> courses = new CsvCourseDataSource(new StringReader(csv)).fetchCourses(Semester.FIRST, "2026-2027");
        assertThat(courses).hasSize(1);
        assertThat(courses.get(0).getDepartment()).isEqualTo("DCISM");
        var section = courses.get(0).getSections().get(0);
        assertThat(section.getMeetings()).hasSize(3);
        assertThat(section.getMeetings().get(2).getType()).isEqualTo(MeetingType.LAB);
    }

    @Test
    void invalidRowsAreSkippedAndReportedNotFatal() {
        String csv = HEADER
                + "CIS 2201,Systems Analysis,3,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,08:00,09:30,LB 201,Talamban\n"
                + "CIS 2202,Bad Times,3,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,10:00,09:00,LB 201,Talamban\n"
                + "CIS 2203,Bad Units,zero,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,MON,08:00,09:30,LB 201,Talamban\n"
                + "CIS 2204,Bad Day,3,DCISM,A,Juan,1ST,2026-2027,40,LECTURE,FUNDAY,08:00,09:30,LB 201,Talamban\n";
        var source = new CsvCourseDataSource(new StringReader(csv));
        List<Course> courses = source.fetchCourses(Semester.FIRST, "2026-2027");
        assertThat(courses).extracting(Course::getCode).containsExactly("CIS 2201");
        assertThat(source.skippedRecords()).hasSize(3);
    }

    @Test
    void otherTermsAreFilteredOut() {
        String csv = HEADER
                + "CIS 2201,Systems Analysis,3,DCISM,A,Juan,2ND,2026-2027,40,LECTURE,MON,08:00,09:30,LB 201,Talamban\n";
        assertThat(new CsvCourseDataSource(new StringReader(csv)).fetchCourses(Semester.FIRST, "2026-2027")).isEmpty();
    }

    @Test
    void mockAndCsvAreInterchangeableBehindTheInterface() {
        CourseDataSource mock = new MockCourseDataSource(List.of());
        CourseDataSource csv = new CsvCourseDataSource(new StringReader(HEADER));
        assertThat(List.of(mock, csv)).allSatisfy(s -> assertThat(s.fetchCourses(Semester.FIRST, "2026-2027")).isEmpty());
        assertThat(mock.type()).isEqualTo(SourceType.MOCK);
        assertThat(csv.type()).isEqualTo(SourceType.CSV);
    }
}
