package com.uched.api.controller;

import com.uched.api.dto.CourseDtos.OptionDto;
import com.uched.api.filter.StudentCatalogFilter;
import com.uched.domain.value.Semester;
import com.uched.service.CourseService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/meta")
public class MetaController {
    private final CourseService courses;

    public MetaController(CourseService courses) {
        this.courses = courses;
    }

    @GetMapping("/semesters")
    public List<OptionDto> semesters() {
        return Arrays.stream(Semester.values())
                .map(s -> new OptionDto(s.code(), switch (s) {
                    case FIRST -> "1st Semester";
                    case SECOND -> "2nd Semester";
                    case SUMMER -> "Summer";
                })).toList();
    }

    /** Scoped to the signed-in student: only years/departments that appear in their own catalog. */
    @GetMapping("/academic-years")
    public List<String> academicYears(HttpServletRequest http) {
        return courses.academicYears(studentId(http));
    }

    @GetMapping("/departments")
    public List<String> departments(HttpServletRequest http) {
        return courses.departments(studentId(http));
    }

    private static String studentId(HttpServletRequest http) {
        return (String) http.getAttribute(StudentCatalogFilter.STUDENT_ATTRIBUTE);
    }
}
