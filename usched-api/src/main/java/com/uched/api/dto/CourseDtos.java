package com.uched.api.dto;

import java.util.List;

public final class CourseDtos {
    private CourseDtos() {
    }

    public record CourseSummary(Long id, String code, String name, double units, String department,
                                String prerequisites) {
    }

    public record CoursePage(List<CourseSummary> items, int page, int size, long total) {
    }

    public record MeetingDto(String day, String start, String end, String room, String type) {
    }

    public record SectionDto(Long sectionId, String courseCode, String courseName, double units, String sectionCode,
                             Long instructorId, String instructor, Integer availableSlots,
                             List<MeetingDto> meetings) {
    }

    public record OptionDto(String code, String label) {
    }
}
