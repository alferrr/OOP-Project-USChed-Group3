package com.uched.persistence.repository;

import com.uched.domain.value.Semester;
import com.uched.persistence.entity.CatalogSnapshotEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CatalogSnapshotRepository extends JpaRepository<CatalogSnapshotEntity, Long> {
    Optional<CatalogSnapshotEntity> findFirstByStudentIdNumberAndSemesterAndAcademicYearOrderByScrapedAtDesc(
            String studentIdNumber, Semester semester, String academicYear);
}
