package com.uched.api;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** DELETE /api/courses empties one student's own fetched catalog, and nobody else's. */
class ClearCatalogTest extends ApiTestBase {

    @Test
    void wipesEveryFetchedCourseAndSectionForThatStudentOnly() throws Exception {
        load(row("CIS 2105", "Networking II", "A", "MON", "08:00", "09:30"));
        load(row("MATH 1101", "Calculus 1", "A", "TUE", "10:00", "11:30"));
        String otherSession = ismisSessions.seedTestSession("066E164");
        importer.importCsv(new java.io.StringReader(HEADER + row("ENG 1101", "Communication Arts", "A", "WED", "13:00", "14:30")),
                com.uched.domain.value.Semester.FIRST, "2026-2027", "066E164");

        mvc.perform(asStudent(delete("/api/courses"))).andExpect(status().isNoContent());

        String mine = mvc.perform(asStudent(get("/api/courses")).param("semester", "1ST").param("academicYear", "2026-2027"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat((Integer) JsonPath.read(mine, "$.total")).isEqualTo(0);

        // The other student's own catalog is untouched.
        String theirSessionHeader = "X-Ismis-Session";
        String theirs = mvc.perform(get("/api/courses").header(theirSessionHeader, otherSession)
                        .param("semester", "1ST").param("academicYear", "2026-2027"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat((Integer) JsonPath.read(theirs, "$.total")).isEqualTo(1);
    }
}
