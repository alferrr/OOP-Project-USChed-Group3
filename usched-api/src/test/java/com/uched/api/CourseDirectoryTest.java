package com.uched.api;

import com.uched.persistence.repository.CourseDirectoryRepository;
import com.uched.service.CourseDirectoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CourseDirectoryTest extends ApiTestBase {
    @Autowired CourseDirectoryRepository directory;
    @Autowired CourseDirectoryService service;

    @BeforeEach
    void clean() {
        directory.deleteAll();
    }

    @Test
    void importedCatalogCodesBecomeSearchableByAnyoneWithoutASession() throws Exception {
        load(row("CIS 2105", "Networking II", "A", "MON", "08:00", "10:00"));
        mvc.perform(get("/api/directory/courses").param("q", "cis 21"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("CIS 2105"))
                .andExpect(jsonPath("$[0].name").value("Networking II"));
        mvc.perform(get("/api/directory/courses").param("q", "network"))
                .andExpect(jsonPath("$[0].code").value("CIS 2105"));
    }

    @Test
    void rejectsTooShortQueriesAndTreatsPercentLiterally() throws Exception {
        service.record(java.util.List.of(new CourseDirectoryService.Entry("CIS 2105", "Networking II", 3.0, null)));
        mvc.perform(get("/api/directory/courses").param("q", "c")).andExpect(jsonPath("$").isEmpty());
        mvc.perform(get("/api/directory/courses").param("q", "%%")).andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void recordingTheSameCodeUpdatesRatherThanDuplicates() throws Exception {
        service.record(java.util.List.of(new CourseDirectoryService.Entry("CIS 2105", "Old", 3.0, null)));
        service.record(java.util.List.of(new CourseDirectoryService.Entry("cis 2105", "New title", null, "DCISM")));
        mvc.perform(get("/api/directory/courses").param("q", "2105"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("New title"))
                .andExpect(jsonPath("$[0].units").value(3.0));
    }

    @Test
    void adminCanSeedFromCsv() throws Exception {
        var csv = new MockMultipartFile("file", "d.csv", "text/csv",
                "code,name,units,department\nMATH 1101,Calculus I,3,DCISM\n,missing code,3,\n".getBytes());
        mvc.perform(multipart("/api/admin/directory/import").file(csv).header("X-Admin-Token", "test-admin-token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stored").value(1));
        mvc.perform(get("/api/directory/courses").param("q", "calc"))
                .andExpect(jsonPath("$[0].code").value("MATH 1101"));
    }
}
