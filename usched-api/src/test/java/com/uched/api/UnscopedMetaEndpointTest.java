package com.uched.api;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression test: /api/meta/semesters is static, non-student data. The frontend never sends an ISMIS session
 * header for it, so it must work without one; a missing session must not silently look like a dead session
 * and bounce the student back to login right after they signed in.
 */
class UnscopedMetaEndpointTest extends ApiTestBase {
    @Test
    void semestersWorkWithNoIsmisSessionHeaderAtAll() throws Exception {
        mvc.perform(get("/api/meta/semesters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("1ST"));
    }

    @Test
    void departmentsAndAcademicYearsStillRequireASession() throws Exception {
        mvc.perform(get("/api/meta/departments")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/meta/academic-years")).andExpect(status().isUnauthorized());
    }
}
