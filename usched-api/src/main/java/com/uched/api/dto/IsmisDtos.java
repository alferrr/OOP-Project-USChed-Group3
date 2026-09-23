package com.uched.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class IsmisDtos {
    private IsmisDtos() {
    }

    /** toString is redacted so the password can never reach a log line by accident. */
    public record IsmisLoginRequest(@NotBlank String username, @NotBlank String password) {
        @Override
        public String toString() {
            return "IsmisLoginRequest[REDACTED]";
        }
    }

    public record IsmisSessionResponse(String sessionId, Instant expiresAt, long idleMinutes) {
    }

    public record SearchRequest(@NotBlank String semester, @NotBlank String academicYear,
                                @NotEmpty @Size(max = 15) List<@NotBlank @Size(min = 2, max = 100) String> queries) {
    }

    public record SearchStartResponse(String jobId) {
    }

    public record CourseRefDto(long id, String code, String name, double units) {
    }

    public record SearchItemDto(String query, String status, String message, int courses, int sections,
                                List<CourseRefDto> found, List<CourseRefDto> suggestions, String searchedAs) {
    }

    public record SearchError(String code, String message) {
    }

    public record SearchStatusResponse(String jobId, String status, String message, List<SearchItemDto> items,
                                       SearchError error) {
    }

    public record ProspectusCourseDto(int yearLevel, String semester, String code, String title, double units,
                                      String requisiteNote) {
    }

    public record ProspectusResponse(String programName, String effectiveYear, List<ProspectusCourseDto> courses) {
    }
}
