package com.uched.api.controller;

import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.value.Semester;
import com.uched.service.AdminImportService;
import com.uched.service.ImportReport;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;

/** Protected by AdminTokenFilter (X-Admin-Token). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminImportService importer;

    public AdminController(AdminImportService importer) {
        this.importer = importer;
    }

    /** studentIdNumber says whose private catalog this CSV is imported into. */
    @PostMapping("/import")
    public ImportReport importCsv(@RequestParam("file") MultipartFile file, @RequestParam String semester,
                                  @RequestParam String academicYear, @RequestParam String studentIdNumber) throws IOException {
        if (file.isEmpty()) {
            throw new InvalidCourseDataException("The CSV file is empty.");
        }
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)) {
            return importer.importCsv(reader, Semester.fromCode(semester), academicYear, studentIdNumber);
        }
    }
}
