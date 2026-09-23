package com.uched.api;

import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The core promise of the per-student catalog: nobody sees what another student has fetched. */
class PrivateCatalogTest extends ApiTestBase {

    private MockHttpServletRequestBuilder as(String sessionId, MockHttpServletRequestBuilder req) {
        return req.header("X-Ismis-Session", sessionId);
    }

    @Test
    void oneStudentsCoursesAreInvisibleToAnother() throws Exception {
        // STUDENT (the shared fixture identity) imports a course.
        load(row("CIS 2105", "Networking II", "A", "MON", "08:00", "09:30"));
        String otherSession = ismisSessions.seedTestSession("066E164");

        String mine = mvc.perform(asStudent(get("/api/courses")).param("semester", "1ST").param("academicYear", "2026-2027"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String theirs = mvc.perform(as(otherSession, get("/api/courses")).param("semester", "1ST").param("academicYear", "2026-2027"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThatOnlyOneSeesTheCourse(mine, theirs);

        long id = ((Number) JsonPath.read(mine, "$.items[0].id")).longValue();
        mvc.perform(as(otherSession, get("/api/courses/" + id)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(as(otherSession, get("/api/courses/" + id + "/sections"))
                        .param("semester", "1ST").param("academicYear", "2026-2027"))
                .andExpect(status().isNotFound());

        // Generating a schedule with someone else's course id fails the same way a made-up id would.
        String body = "{\"courseIds\":[" + id + "],\"semester\":\"1ST\",\"academicYear\":\"2026-2027\"}";
        mvc.perform(as(otherSession, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/schedules/generate"))
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    private static void assertThatOnlyOneSeesTheCourse(String mine, String theirs) {
        org.assertj.core.api.Assertions.assertThat((Integer) JsonPath.read(mine, "$.total")).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat((Integer) JsonPath.read(theirs, "$.total")).isEqualTo(0);
    }
}
