package com.uched.api.controller;

import com.uched.api.dto.ApiMapper;
import com.uched.api.dto.ScheduleDtos.CompareItem;
import com.uched.api.dto.ScheduleDtos.CompareRequest;
import com.uched.api.dto.ScheduleDtos.CompareResponse;
import com.uched.api.dto.ScheduleDtos.GenerateRequest;
import com.uched.api.dto.ScheduleDtos.GenerateResponse;
import com.uched.api.dto.ScheduleDtos.ScheduleDto;
import com.uched.api.filter.StudentCatalogFilter;
import com.uched.domain.value.Semester;
import com.uched.service.ScheduleService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

/** Course and section ids only ever resolve within the signed-in student's own catalog. */
@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {
    private final ScheduleService schedules;
    private final ApiMapper mapper;

    public ScheduleController(ScheduleService schedules, ApiMapper mapper) {
        this.schedules = schedules;
        this.mapper = mapper;
    }

    @PostMapping("/generate")
    public GenerateResponse generate(@Valid @RequestBody GenerateRequest req, HttpServletRequest http) {
        var result = schedules.generate(studentId(http), req.courseIds(), Semester.fromCode(req.semester()),
                req.academicYear(), req.limit(), mapper.toPreference(req.preferences()), req.likeSectionIds());
        List<ScheduleDto> dtos = new ArrayList<>();
        for (int i = 0; i < result.ranked().size(); i++) {
            dtos.add(mapper.toDto(i + 1, result.ranked().get(i)));
        }
        return new GenerateResponse(result.totalUnits(), result.generatedCount(), dtos.size(), dtos);
    }

    @PostMapping("/compare")
    public CompareResponse compare(@Valid @RequestBody CompareRequest req, HttpServletRequest http) {
        var ranked = schedules.compare(studentId(http), req.schedules(), mapper.toPreference(req.preferences()));
        return new CompareResponse(ranked.stream()
                .map(r -> new CompareItem(r.score(), r.breakdown(), mapper.stats(r.schedule()))).toList());
    }

    private static String studentId(HttpServletRequest http) {
        return (String) http.getAttribute(StudentCatalogFilter.STUDENT_ATTRIBUTE);
    }
}
