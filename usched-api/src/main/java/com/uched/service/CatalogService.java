package com.uched.service;

import com.uched.domain.value.Semester;
import com.uched.persistence.repository.CatalogSnapshotRepository;
import com.uched.persistence.repository.CourseRepository;
import com.uched.persistence.repository.SectionRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/** Each student has their own catalog and their own freshness snapshot; nothing here is shared. */
@Service
public class CatalogService {
    private final CatalogSnapshotRepository snapshots;
    private final CourseRepository courses;
    private final SectionRepository sections;
    private final UChedProperties props;

    public CatalogService(CatalogSnapshotRepository snapshots, CourseRepository courses, SectionRepository sections,
                          UChedProperties props) {
        this.snapshots = snapshots;
        this.courses = courses;
        this.sections = sections;
        this.props = props;
    }

    public CatalogStatus status(String studentIdNumber, Semester semester, String academicYear) {
        return snapshots.findFirstByStudentIdNumberAndSemesterAndAcademicYearOrderByScrapedAtDesc(
                        studentIdNumber, semester, academicYear)
                .map(s -> new CatalogStatus(true, s.getSource(), s.getScrapedAt(),
                        (int) courses.countOfferedCourses(studentIdNumber, semester, academicYear),
                        (int) sections.countByStudentIdNumberAndSemesterAndAcademicYear(studentIdNumber, semester, academicYear),
                        Duration.between(s.getScrapedAt(), Instant.now()).toHours() < props.getCatalog().getTtlHours()))
                .orElse(CatalogStatus.none());
    }
}
