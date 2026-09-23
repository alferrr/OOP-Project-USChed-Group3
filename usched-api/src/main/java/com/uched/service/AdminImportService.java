package com.uched.service;

import com.uched.datasource.CourseDataSourceFactory;
import com.uched.domain.value.Semester;
import org.springframework.stereotype.Service;

import java.io.Reader;

@Service
public class AdminImportService {
    private final CourseDataSourceFactory factory;
    private final CourseImportService importer;

    public AdminImportService(CourseDataSourceFactory factory, CourseImportService importer) {
        this.factory = factory;
        this.importer = importer;
    }

    public ImportReport importCsv(Reader csv, Semester semester, String academicYear, String studentIdNumber) {
        return importer.importFrom(factory.createCsv(csv), semester, academicYear, studentIdNumber);
    }
}
