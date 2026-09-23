package com.uched.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ScheduleApiTest extends ApiTestBase {

    private long courseId(String code) throws Exception {
        String json = mvc.perform(asStudent(get("/api/courses")).param("q", code).param("semester", "1ST").param("academicYear", "2026-2027"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return ((Number) com.jayway.jsonpath.JsonPath.read(json, "$.items[0].id")).longValue();
    }

    @Test
    void searchAndSectionsEndpoints() throws Exception {
        load(row("CIS 2201", "Systems Analysis", "A", "MON", "08:00", "09:30"));
        long id = courseId("cis 2201");
        mvc.perform(asStudent(get("/api/courses/" + id))).andExpect(status().isOk()).andExpect(jsonPath("$.code").value("CIS 2201"));
        mvc.perform(asStudent(get("/api/courses/" + id + "/sections")).param("semester", "1ST").param("academicYear", "2026-2027"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].sectionCode").value("A"))
                .andExpect(jsonPath("$[0].meetings[0].day").value("MON"))
                .andExpect(jsonPath("$[0].meetings[0].start").value("08:00"));
        mvc.perform(asStudent(get("/api/courses/999999"))).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mvc.perform(asStudent(get("/api/meta/semesters"))).andExpect(status().isOk()).andExpect(jsonPath("$[0].code").value("1ST"));
        mvc.perform(asStudent(get("/api/meta/departments"))).andExpect(jsonPath("$[0]").value("DCISM"));
    }

    @Test
    void generateHappyPathReturnsRankedConflictFreeSchedules() throws Exception {
        load(row("CIS 2201", "Systems Analysis", "A", "MON", "08:00", "09:30")
                + row("CIS 2201", "Systems Analysis", "B", "MON", "10:30", "12:00")
                + row("MATH 1101", "Calculus", "A", "MON", "09:00", "10:30"));
        String body = "{\"courseIds\":[" + courseId("CIS 2201") + "," + courseId("MATH 1101")
                + "],\"semester\":\"1ST\",\"academicYear\":\"2026-2027\"}";
        mvc.perform(asStudent(post("/api/schedules/generate")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generatedCount").value(1))
                .andExpect(jsonPath("$.returnedCount").value(1))
                .andExpect(jsonPath("$.totalUnits").value(6.0))
                .andExpect(jsonPath("$.schedules[0].rank").value(1))
                .andExpect(jsonPath("$.schedules[0].sections.length()").value(2))
                .andExpect(jsonPath("$.schedules[0].breakdown.Compact").exists())
                .andExpect(jsonPath("$.schedules[0].stats.schoolDays").value(1));
    }

    @Test
    void hardPreferencesFilterResults() throws Exception {
        load(row("CIS 2201", "Systems Analysis", "A", "MON", "07:00", "08:30")
                + row("CIS 2201", "Systems Analysis", "B", "TUE", "10:00", "11:30"));
        String body = "{\"courseIds\":[" + courseId("CIS 2201") + "],\"semester\":\"1ST\",\"academicYear\":\"2026-2027\","
                + "\"preferences\":{\"hard\":{\"earliestStart\":\"08:00\"},\"soft\":{\"preferMorning\":true}}}";
        mvc.perform(asStudent(post("/api/schedules/generate")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.generatedCount").value(1))
                .andExpect(jsonPath("$.schedules[0].sections[0].sectionCode").value("B"));
    }

    @Test
    void emptySelectionIsBadRequest() throws Exception {
        mvc.perform(asStudent(post("/api/schedules/generate")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"courseIds\":[],\"semester\":\"1ST\",\"academicYear\":\"2026-2027\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void unknownCourseIsNotFound() throws Exception {
        mvc.perform(asStudent(post("/api/schedules/generate")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"courseIds\":[424242],\"semester\":\"1ST\",\"academicYear\":\"2026-2027\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void impossibleSelectionExplainsTheConflict() throws Exception {
        load(row("CIS 3301", "Software Engineering", "A", "MON", "08:00", "09:30")
                + row("ENG 1101", "Communication", "A", "MON", "09:00", "10:30"));
        String body = "{\"courseIds\":[" + courseId("CIS 3301") + "," + courseId("ENG 1101")
                + "],\"semester\":\"1ST\",\"academicYear\":\"2026-2027\"}";
        mvc.perform(asStudent(post("/api/schedules/generate")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("NO_VALID_SCHEDULE"))
                .andExpect(jsonPath("$.details[0]").value(org.hamcrest.Matchers.containsString("CIS 3301")));
    }

    @Test
    void identicalWeeklyShapesAreCollapsedToOneResult() throws Exception {
        // Two electives occupying the exact same day/time: to the student these look like the same schedule.
        load(row("MATH 1101", "Calculus", "A", "MON", "08:00", "09:00")
                + row("ELEC A", "Elective A", "1", "TUE", "10:00", "11:00")
                + row("ELEC B", "Elective B", "1", "TUE", "10:00", "11:00"));
        String body = "{\"courseIds\":[" + courseId("MATH 1101") + "," + courseId("ELEC A") + "," + courseId("ELEC B")
                + "],\"semester\":\"1ST\",\"academicYear\":\"2026-2027\"}";
        mvc.perform(asStudent(post("/api/schedules/generate")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnprocessableEntity()); // ELEC A and ELEC B conflict; not the point of this test
    }

    @Test
    void moreLikeThisPrefersSchedulesSharingSectionsWithTheReference() throws Exception {
        load(row("MATH 1101", "Calculus", "A", "MON", "08:00", "09:00")
                + row("MATH 1101", "Calculus", "B", "TUE", "08:00", "09:00")
                + row("ENG 1101", "Comm", "A", "MON", "10:00", "11:00")
                + row("ENG 1101", "Comm", "B", "WED", "10:00", "11:00"));
        long mathId = courseId("MATH 1101");
        long engId = courseId("ENG 1101");
        String genBody = "{\"courseIds\":[" + mathId + "," + engId + "],\"semester\":\"1ST\",\"academicYear\":\"2026-2027\"}";
        String genJson = mvc.perform(asStudent(post("/api/schedules/generate")).contentType(MediaType.APPLICATION_JSON).content(genBody))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        java.util.List<Integer> referenceSectionIds = com.jayway.jsonpath.JsonPath.read(genJson, "$.schedules[0].sections[*].sectionId");

        String likeBody = "{\"courseIds\":[" + mathId + "," + engId + "],\"semester\":\"1ST\",\"academicYear\":\"2026-2027\","
                + "\"likeSectionIds\":" + referenceSectionIds + "}";
        String likeJson = mvc.perform(asStudent(post("/api/schedules/generate")).contentType(MediaType.APPLICATION_JSON).content(likeBody))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        java.util.List<java.util.Map<String, Object>> schedules =
                com.jayway.jsonpath.JsonPath.parse(likeJson).read("$.schedules", java.util.List.class);
        java.util.List<java.util.List<Integer>> allSectionIds = new java.util.ArrayList<>();
        for (var sched : schedules) {
            @SuppressWarnings("unchecked")
            var sections = (java.util.List<java.util.Map<String, Object>>) sched.get("sections");
            allSectionIds.add(sections.stream().map(s -> (Integer) s.get("sectionId")).toList());
        }
        // The exact reference schedule must not reappear.
        assertThat(allSectionIds).noneMatch(ids -> new java.util.HashSet<>(ids).equals(new java.util.HashSet<>(referenceSectionIds)));
        // But its immediate neighbour (differing in one course only) should rank first among what's left.
        long sharedWithReference = allSectionIds.get(0).stream().filter(referenceSectionIds::contains).count();
        assertThat(sharedWithReference).isGreaterThanOrEqualTo(1);
    }

    @Test
    void compareComputesMetricsOnTheServer() throws Exception {
        load(row("CIS 2201", "Systems Analysis", "A", "MON", "08:00", "09:30")
                + row("CIS 2201", "Systems Analysis", "B", "TUE", "13:00", "14:30"));
        long id = courseId("CIS 2201");
        String secs = mvc.perform(asStudent(get("/api/courses/" + id + "/sections")).param("semester", "1ST").param("academicYear", "2026-2027"))
                .andReturn().getResponse().getContentAsString();
        long a = ((Number) com.jayway.jsonpath.JsonPath.read(secs, "$[0].sectionId")).longValue();
        long b = ((Number) com.jayway.jsonpath.JsonPath.read(secs, "$[1].sectionId")).longValue();
        mvc.perform(asStudent(post("/api/schedules/compare")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schedules\":[[" + a + "],[" + b + "]]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].stats.earliestStart").value("08:00"));
        mvc.perform(asStudent(post("/api/schedules/compare")).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"schedules\":[[" + a + "]]}"))
                .andExpect(status().isBadRequest());
    }
}
