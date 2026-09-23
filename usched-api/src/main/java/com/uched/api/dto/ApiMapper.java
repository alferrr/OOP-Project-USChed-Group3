package com.uched.api.dto;

import com.uched.api.dto.CourseDtos.MeetingDto;
import com.uched.api.dto.CourseDtos.SectionDto;
import com.uched.api.dto.ScheduleDtos.PreferencesDto;
import com.uched.api.dto.ScheduleDtos.ScheduleDto;
import com.uched.api.dto.ScheduleDtos.StatsDto;
import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.model.Meeting;
import com.uched.domain.model.RankedSchedule;
import com.uched.domain.model.Schedule;
import com.uched.domain.model.Section;
import com.uched.engine.preference.SchedulePreference;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Component
public class ApiMapper {

    public SchedulePreference toPreference(PreferencesDto dto) {
        SchedulePreference.Builder b = SchedulePreference.builder();
        if (dto == null) {
            return b.build();
        }
        var hard = dto.hard();
        if (hard != null) {
            b.maxSchoolDays(positive(hard.maxSchoolDays(), "maxSchoolDays"));
            b.maxClassesPerDay(positive(hard.maxClassesPerDay(), "maxClassesPerDay"));
            b.minBreakMinutes(hard.minBreakMinutes() == null || hard.minBreakMinutes() < 0 ? null : hard.minBreakMinutes());
            b.earliestStart(time(hard.earliestStart()));
            b.latestEnd(time(hard.latestEnd()));
            if (hard.avoidDays() != null) {
                hard.avoidDays().forEach(d -> b.avoidDay(day(d)));
            }
        }
        var soft = dto.soft();
        if (soft != null) {
            b.preferMorning(Boolean.TRUE.equals(soft.preferMorning()));
            b.preferAfternoon(Boolean.TRUE.equals(soft.preferAfternoon()));
            b.minimizeGaps(Boolean.TRUE.equals(soft.minimizeGaps()));
            b.minimizeDays(Boolean.TRUE.equals(soft.minimizeDays()));
            b.prioritizeLunchBreak(Boolean.TRUE.equals(soft.prioritizeLunchBreak()));
            if (soft.preferredInstructorIds() != null) {
                soft.preferredInstructorIds().forEach(b::preferredInstructorId);
            }
        }
        return b.build();
    }

    public SectionDto toDto(Section s) {
        List<MeetingDto> meetings = s.getMeetings().stream().map(this::toDto).toList();
        return new SectionDto(s.getId(), s.getCourseCode(), s.getCourseName(), s.getUnits(), s.getSectionCode(),
                s.getInstructor().map(i -> i.getId()).orElse(null),
                s.getInstructor().map(i -> i.getName()).orElse(null),
                s.getAvailableSlots().orElse(null), meetings);
    }

    public MeetingDto toDto(Meeting m) {
        return new MeetingDto(dayCode(m.getDay()), m.getTime().start().toString(), m.getTime().end().toString(),
                m.getRoom().map(r -> r.label()).orElse(null), m.getType().name());
    }

    public StatsDto stats(Schedule s) {
        return new StatsDto(s.schoolDays().size(),
                s.earliestStart().map(LocalTime::toString).orElse(null),
                s.latestEnd().map(LocalTime::toString).orElse(null),
                s.totalGapMinutes(), s.totalUnits());
    }

    public ScheduleDto toDto(int rank, RankedSchedule r) {
        return new ScheduleDto(rank, r.score(), r.breakdown(), stats(r.schedule()),
                r.schedule().getSections().stream().map(this::toDto).toList());
    }

    public static String dayCode(DayOfWeek d) {
        return d.name().substring(0, 3);
    }

    private static DayOfWeek day(String v) {
        for (DayOfWeek d : DayOfWeek.values()) {
            if (v != null && dayCode(d).equalsIgnoreCase(v.trim())) {
                return d;
            }
        }
        throw new InvalidCourseDataException("Unknown day: " + v);
    }

    private static LocalTime time(String v) {
        if (v == null || v.isBlank()) {
            return null;
        }
        try {
            return LocalTime.parse(v);
        } catch (DateTimeParseException e) {
            throw new InvalidCourseDataException("Invalid time: " + v);
        }
    }

    private static Integer positive(Integer v, String name) {
        if (v != null && v < 1) {
            throw new InvalidCourseDataException(name + " must be at least 1");
        }
        return v;
    }
}
