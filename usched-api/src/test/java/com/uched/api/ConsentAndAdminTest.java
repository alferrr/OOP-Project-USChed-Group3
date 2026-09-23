package com.uched.api;

import com.jayway.jsonpath.JsonPath;
import com.uched.service.UChedProperties;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ConsentAndAdminTest extends ApiTestBase {
    static final String LOGIN = "{\"username\":\"u\",\"password\":\"p\"}";

    @Autowired UChedProperties props;

    private String grant() throws Exception {
        String json = mvc.perform(post("/api/consent").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"termsVersion\":\"2026-9-2\",\"agreedTerms\":true,\"agreedCredentialUse\":true}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.consentToken");
    }

    @Test
    void termsAreServedWithTheirVersion() throws Exception {
        mvc.perform(get("/api/consent/terms")).andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value("2026-9-2"))
                .andExpect(jsonPath("$.text").value(org.hamcrest.Matchers.containsString("Terms of Use")));
    }

    @Test
    void syncWithoutTokenIsForbidden() throws Exception {
        mvc.perform(post("/api/ismis/session").contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CONSENT_REQUIRED"));
        mvc.perform(get("/api/ismis/searches/abc")).andExpect(status().isForbidden());
    }

    @Test
    void searchesNeedValidQueries() throws Exception {
        String token = grant();
        for (String body : new String[]{
                "{\"semester\":\"1ST\",\"academicYear\":\"2026-2027\",\"queries\":[]}",
                "{\"semester\":\"1ST\",\"academicYear\":\"2026-2027\",\"queries\":[\"x\"]}",
                "{\"semester\":\"1ST\",\"academicYear\":\"2026-2027\"}",
                "{\"semester\":\"1ST\",\"academicYear\":\"2026-2027\",\"queries\":[" + "\"CIS 1\",".repeat(15) + "\"CIS 2\"]}"}) {
            mvc.perform(post("/api/ismis/searches").header("X-Consent-Token", token).header("X-Ismis-Session", "nope")
                            .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        }
    }

    @Test
    void searchingWithoutASignedInSessionAsksToSignIn() throws Exception {
        String token = grant();
        mvc.perform(post("/api/ismis/searches").header("X-Consent-Token", token).header("X-Ismis-Session", "made-up")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"semester\":\"1ST\",\"academicYear\":\"2026-2027\",\"queries\":[\"CIS 2105\"]}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("ISMIS_SESSION_EXPIRED"));
    }

    @Test
    void garbageOrTamperedTokenIsForbidden() throws Exception {
        String token = grant();
        for (String bad : new String[]{"garbage", token + "x", "a." + token.split("\\.")[1]}) {
            mvc.perform(post("/api/ismis/session").header("X-Consent-Token", bad)
                            .contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CONSENT_REQUIRED"));
        }
    }

    @Test
    void expiredTokenIsForbidden() throws Exception {
        long ttl = props.getConsent().getTtlMinutes();
        props.getConsent().setTtlMinutes(-1);
        String token;
        try {
            token = grant();
        } finally {
            props.getConsent().setTtlMinutes(ttl);
        }
        mvc.perform(post("/api/ismis/session").header("X-Consent-Token", token)
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CONSENT_REQUIRED"));
    }

    @Test
    void tokenForAnOldTermsVersionIsForbidden() throws Exception {
        String token = grant();
        String current = props.getTermsVersion();
        props.setTermsVersion("2099-1-1");
        try {
            mvc.perform(post("/api/ismis/session").header("X-Consent-Token", token)
                            .contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("CONSENT_REQUIRED"));
        } finally {
            props.setTermsVersion(current);
        }
    }

    @Test
    void bothConsentsAreRequiredToGetAToken() throws Exception {
        mvc.perform(post("/api/consent").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"termsVersion\":\"2026-9-2\",\"agreedTerms\":true,\"agreedCredentialUse\":false}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/consent").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"termsVersion\":\"1999-1-1\",\"agreedTerms\":true,\"agreedCredentialUse\":true}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void validTokenIsAcceptedAndUnconfiguredIsmisFailsCleanly() throws Exception {
        String token = grant();
        mvc.perform(post("/api/ismis/session").header("X-Consent-Token", token)
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("ISMIS_NOT_CONFIGURED"));
    }

    @Test
    void adminImportNeedsTheToken() throws Exception {
        var file = new org.springframework.mock.web.MockMultipartFile("file", "c.csv", "text/csv",
                (HEADER + row("CIS 1101", "Intro", "A", "MON", "08:00", "09:00")).getBytes());
        mvc.perform(multipart("/api/admin/import").file(file).param("semester", "1ST").param("academicYear", "2026-2027").param("studentIdNumber", STUDENT))
                .andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/admin/import").file(file).param("semester", "1ST").param("academicYear", "2026-2027")
                        .param("studentIdNumber", STUDENT).header("X-Admin-Token", "wrong"))
                .andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/admin/import").file(file).param("semester", "1ST").param("academicYear", "2026-2027")
                        .param("studentIdNumber", STUDENT).header("X-Admin-Token", "test-admin-token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.courses").value(1));
    }

    @Test
    void importReportsSkippedRowsAndWritesASnapshot() throws Exception {
        String csv = HEADER + row("CIS 1101", "Intro", "A", "MON", "08:00", "09:00")
                + "BAD 1,Bad,3,X,A,J,1ST,2026-2027,10,LECTURE,MON,10:00,09:00,R,C\n";
        var file = new org.springframework.mock.web.MockMultipartFile("file", "c.csv", "text/csv", csv.getBytes());
        mvc.perform(multipart("/api/admin/import").file(file).param("semester", "1ST").param("academicYear", "2026-2027")
                        .param("studentIdNumber", STUDENT).header("X-Admin-Token", "test-admin-token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.skipped").value(1));
        mvc.perform(asStudent(get("/api/catalog/status")).param("semester", "1ST").param("academicYear", "2026-2027"))
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.source").value("CSV"))
                .andExpect(jsonPath("$.fresh").value(true))
                .andExpect(jsonPath("$.courseCount").value(1));
    }
}
