package com.uched.api.controller;

import com.uched.api.dto.CourseDtos.DirectoryEntry;
import com.uched.service.CourseDirectoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Suggestions for the course-code box. Shared reference data only, so no ISMIS session is needed. */
@RestController
@RequestMapping("/api/directory")
public class DirectoryController {
    private final CourseDirectoryService directory;

    public DirectoryController(CourseDirectoryService directory) {
        this.directory = directory;
    }

    @GetMapping("/courses")
    public List<DirectoryEntry> search(@RequestParam(defaultValue = "") String q,
                                       @RequestParam(defaultValue = "8") int limit) {
        return directory.search(q, limit).stream()
                .map(e -> new DirectoryEntry(e.code(), e.name(), e.units(), e.department())).toList();
    }
}
