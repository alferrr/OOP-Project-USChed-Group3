package com.uched.api;

import com.uched.domain.value.Semester;
import com.uched.persistence.repository.CatalogSnapshotRepository;
import com.uched.persistence.repository.CourseRepository;
import com.uched.persistence.repository.InstructorRepository;
import com.uched.persistence.repository.RoomRepository;
import com.uched.persistence.repository.SectionRepository;
import com.uched.service.AdminImportService;
import com.uched.service.IsmisSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.io.StringReader;

@SpringBootTest
@AutoConfigureMockMvc
abstract class ApiTestBase {
    static final String HEADER = "course_code,course_name,units,department,section_code,instructor,semester,academic_year,available_slots,meeting_type,day,start_time,end_time,room,campus\n";
    /** The student most of these tests act as; import and query calls are scoped to this ID number. */
    static final String STUDENT = "241F065";

    @Autowired protected MockMvc mvc;
    @Autowired protected AdminImportService importer;
    @Autowired protected IsmisSessionService ismisSessions;
    @Autowired SectionRepository sections;
    @Autowired CourseRepository courses;
    @Autowired InstructorRepository instructors;
    @Autowired RoomRepository rooms;
    @Autowired CatalogSnapshotRepository snapshots;

    private String sessionId;

    @BeforeEach
    void cleanDatabase() {
        sections.deleteAll();
        courses.deleteAll();
        instructors.deleteAll();
        rooms.deleteAll();
        snapshots.deleteAll();
        sessionId = ismisSessions.seedTestSession(STUDENT);
    }

    /** X-Ismis-Session for STUDENT, needed on any request to a StudentCatalogFilter-scoped endpoint. */
    protected MockHttpServletRequestBuilder asStudent(MockHttpServletRequestBuilder req) {
        return req.header("X-Ismis-Session", sessionId);
    }

    protected void load(String rows) {
        importer.importCsv(new StringReader(HEADER + rows), Semester.FIRST, "2026-2027", STUDENT);
    }

    protected static String row(String code, String name, String section, String day, String start, String end) {
        return code + "," + name + ",3,DCISM," + section + ",Juan Dela Cruz,1ST,2026-2027,40,LECTURE," + day + ","
                + start + "," + end + ",LB 201,Talamban\n";
    }
}
