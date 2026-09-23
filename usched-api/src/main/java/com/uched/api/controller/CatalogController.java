package com.uched.api.controller;

import com.uched.api.dto.CatalogDtos.CatalogStatusResponse;
import com.uched.api.filter.StudentCatalogFilter;
import com.uched.domain.value.Semester;
import com.uched.service.CatalogService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {
    private final CatalogService catalog;

    public CatalogController(CatalogService catalog) {
        this.catalog = catalog;
    }

    @GetMapping("/status")
    public CatalogStatusResponse status(@RequestParam String semester, @RequestParam String academicYear,
                                        HttpServletRequest http) {
        String studentId = (String) http.getAttribute(StudentCatalogFilter.STUDENT_ATTRIBUTE);
        var s = catalog.status(studentId, Semester.fromCode(semester), academicYear);
        return new CatalogStatusResponse(s.available(), s.source() == null ? null : s.source().name(),
                s.scrapedAt(), s.courseCount(), s.sectionCount(), s.fresh());
    }
}
