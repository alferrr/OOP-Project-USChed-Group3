package com.uched.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.Map;

public final class ScheduleDtos {
    private ScheduleDtos() {
    }

    public record HardPrefs(Integer maxSchoolDays, Integer maxClassesPerDay, Integer minBreakMinutes,
                            String earliestStart, String latestEnd, List<String> avoidDays) {
    }

    public record SoftPrefs(Boolean preferMorning, Boolean preferAfternoon, Boolean minimizeGaps,
                            Boolean minimizeDays, Boolean prioritizeLunchBreak, List<Long> preferredInstructorIds) {
    }

    public record PreferencesDto(HardPrefs hard, SoftPrefs soft) {
    }

    /** likeSectionIds: optional, the sections of a schedule already shown, for "More like this". */
    public record GenerateRequest(@NotEmpty List<Long> courseIds, @NotBlank String semester,
                                  @NotBlank String academicYear, Integer limit, PreferencesDto preferences,
                                  List<Long> likeSectionIds) {
    }

    public record StatsDto(int schoolDays, String earliestStart, String latestEnd, int totalGapMinutes,
                           double totalUnits) {
    }

    public record ScheduleDto(int rank, double score, Map<String, Double> breakdown, StatsDto stats,
                              List<CourseDtos.SectionDto> sections) {
    }

    public record GenerateResponse(double totalUnits, int generatedCount, int returnedCount,
                                   List<ScheduleDto> schedules) {
    }

    /** Each entry is one schedule, given as its list of section ids. */
    public record CompareRequest(@NotEmpty List<List<Long>> schedules, PreferencesDto preferences) {
    }

    public record CompareItem(double score, Map<String, Double> breakdown, StatsDto stats) {
    }

    public record CompareResponse(List<CompareItem> items) {
    }
}
