package com.uched.api.controller;

import com.uched.api.dto.ApiMapper;
import com.uched.api.dto.CourseDtos.CoursePage;
import com.uched.api.dto.CourseDtos.CourseSummary;
import com.uched.api.dto.CourseDtos.SectionDto;
import com.uched.api.filter.StudentCatalogFilter;
import com.uched.domain.model.Course;
import com.uched.domain.value.Semester;
import com.uched.service.CourseService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Every result here is scoped to the signed-in student's own catalog (StudentCatalogFilter). */
@RestController
@RequestMapping("/api/courses")
public class CourseController {
    private final CourseService courses;
    private final ApiMapper mapper;

    public CourseController(CourseService courses, ApiMapper mapper) {
        this.courses = courses;
        this.mapper = mapper;
    }

    @GetMapping
    public CoursePage search(@RequestParam(required = false) String q,
                             @RequestParam(required = false) String department,
                             @RequestParam String semester, @RequestParam String academicYear,
                             @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
                             HttpServletRequest http) {
        var result = courses.search(studentId(http), q, department, Semester.fromCode(semester), academicYear, page, size);
        return new CoursePage(result.items().stream().map(CourseController::summary).toList(),
                result.page(), result.size(), result.total());
    }

    @GetMapping("/{id}")
    public CourseSummary get(@PathVariable long id, HttpServletRequest http) {
        return summary(courses.get(studentId(http), id));
    }

    @GetMapping("/{id}/sections")
    public List<SectionDto> sections(@PathVariable long id, @RequestParam String semester,
                                     @RequestParam String academicYear, HttpServletRequest http) {
        return courses.sections(studentId(http), id, Semester.fromCode(semester), academicYear)
                .stream().map(mapper::toDto).toList();
    }

    /** Empties the signed-in student's own private catalog (every course/section fetched from ISMIS so far). */
    @DeleteMapping
    public ResponseEntity<Void> clear(HttpServletRequest http) {
        courses.clearCatalog(studentId(http));
        return ResponseEntity.noContent().build();
    }

    private static CourseSummary summary(Course c) {
        return new CourseSummary(c.getId(), c.getCode(), c.getName(), c.getUnits(), c.getDepartment(),
                c.getPrerequisites());
    }

    private static String studentId(HttpServletRequest http) {
        return (String) http.getAttribute(StudentCatalogFilter.STUDENT_ATTRIBUTE);
    }
}
