package com.uched.api;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.ThrowableProxyUtil;
import ch.qos.logback.core.read.ListAppender;
import com.jayway.jsonpath.JsonPath;
import com.uched.support.FakeIsmis;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Signs in with a sentinel password and proves it appears in no log, response, error, or database row. */
class LogHygieneTest extends ApiTestBase {
    static final String SENTINEL = "SENTINEL-p4ssw0rd-9f3a71";
    static final FakeIsmis ismis = new FakeIsmis();

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("uched.ismis.base-url", ismis::baseUrl);
        r.add("uched.ismis.login-path", () -> "/login");
        r.add("uched.ismis.offered-courses-path", () -> "/offered");
        r.add("uched.ismis.search-path", () -> "/search");
        r.add("uched.ismis.username-field", () -> "user");
        r.add("uched.ismis.password-field", () -> "pass");
        r.add("uched.ismis.allowed-path-prefixes", () -> "/home");
    }

    @AfterAll
    static void stop() {
        ismis.close();
    }

    @Autowired JdbcTemplate jdbc;
    private ListAppender<ILoggingEvent> appender;
    private Logger root;

    @BeforeEach
    void attach() {
        root = (Logger) LoggerFactory.getLogger(Logger.ROOT_LOGGER_NAME);
        root.setLevel(Level.ALL);
        appender = new ListAppender<>();
        appender.start();
        root.addAppender(appender);
    }

    @AfterEach
    void detach() {
        root.detachAppender(appender);
        root.setLevel(Level.INFO);
    }

    private String token() throws Exception {
        String json = mvc.perform(post("/api/consent").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"termsVersion\":\"2026-9-2\",\"agreedTerms\":true,\"agreedCredentialUse\":true}"))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(json, "$.consentToken");
    }

    private String login(String token, String password, List<String> responses, int expectedStatus) throws Exception {
        String body = "{\"username\":\"student\",\"password\":\"" + password + "\"}";
        String resp = mvc.perform(post("/api/ismis/session").header("X-Consent-Token", token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().is(expectedStatus)).andReturn().getResponse().getContentAsString();
        responses.add(resp);
        return expectedStatus == 200 ? JsonPath.read(resp, "$.sessionId") : null;
    }

    private void search(String token, String session, List<String> queries, List<String> responses) throws Exception {
        String body = "{\"semester\":\"1ST\",\"academicYear\":\"2026-2027\",\"queries\":["
                + String.join(",", queries.stream().map(q -> "\"" + q + "\"").toList()) + "]}";
        String start = mvc.perform(post("/api/ismis/searches").header("X-Consent-Token", token)
                        .header("X-Ismis-Session", session).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString();
        responses.add(start);
        String jobId = JsonPath.read(start, "$.jobId");
        for (int i = 0; i < 100; i++) {
            String s = mvc.perform(get("/api/ismis/searches/" + jobId).header("X-Consent-Token", token))
                    .andReturn().getResponse().getContentAsString();
            responses.add(s);
            String state = JsonPath.read(s, "$.status");
            if (state.equals("DONE") || state.equals("FAILED")) {
                return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("job did not finish");
    }

    private void assertSentinelAbsentEverywhere(List<String> responses) {
        assertThat(responses).noneMatch(r -> r.contains(SENTINEL));
        List<String> logs = new ArrayList<>();
        for (ILoggingEvent e : new ArrayList<>(appender.list)) {
            logs.add(e.getFormattedMessage());
            logs.add(String.valueOf(e.getMDCPropertyMap()));
            if (e.getThrowableProxy() != null) {
                logs.add(ThrowableProxyUtil.asString(e.getThrowableProxy()));
            }
        }
        assertThat(logs).noneMatch(l -> l != null && l.contains(SENTINEL));
        List<String> tables = jdbc.queryForList(
                "select table_name from information_schema.tables where table_schema = 'PUBLIC'", String.class);
        for (String t : tables) {
            for (Map<String, Object> row : jdbc.queryForList("select * from " + t)) {
                assertThat(row.values()).noneMatch(v -> v != null && v.toString().contains(SENTINEL));
            }
        }
    }

    @Test
    void sentinelPasswordNeverLeaksOnAWrongPassword() throws Exception {
        ismis.acceptedPassword = "something-else";
        List<String> responses = new ArrayList<>();
        login(token(), SENTINEL, responses, 401);
        assertThat(responses.get(0)).contains("ISMIS_AUTH_FAILED");
        assertSentinelAbsentEverywhere(responses);
    }

    @Test
    void sentinelPasswordNeverLeaksAcrossASessionOfSeveralSearches() throws Exception {
        ismis.acceptedPassword = SENTINEL;
        ismis.expireSessions(); // start from a clean fake
        long loginsBefore = ismis.loginPosts();
        List<String> responses = new ArrayList<>();
        String token = token();
        String session = login(token, SENTINEL, responses, 200);
        search(token, session, List.of("CIS 2105"), responses);
        search(token, session, List.of("MATH 1101"), responses);
        assertThat(responses.get(responses.size() - 1)).contains("\"status\":\"DONE\"");
        assertSentinelAbsentEverywhere(responses);

        // The point of the session: two searches, one sign-in, and the password was never sent again.
        assertThat(ismis.loginPosts() - loginsBefore).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from courses", Integer.class)).isEqualTo(2);
    }

    @Test
    void malformedBodyDoesNotEchoTheSentinelEither() throws Exception {
        String token = token();
        String resp = mvc.perform(post("/api/ismis/session").header("X-Consent-Token", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"student\",\"password\":\"" + SENTINEL + "\", oops"))
                .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();
        assertThat(resp).doesNotContain(SENTINEL);
        assertSentinelAbsentEverywhere(List.of(resp));
    }
}
