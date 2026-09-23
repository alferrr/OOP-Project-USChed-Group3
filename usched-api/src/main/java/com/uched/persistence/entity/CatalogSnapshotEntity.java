package com.uched.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import com.uched.domain.model.MeetingType;
import com.uched.domain.value.Semester;
import com.uched.datasource.SourceType;
import java.time.DayOfWeek;

@Entity
@Table(name = "catalog_snapshots")
@Getter
@Setter
@NoArgsConstructor
public class CatalogSnapshotEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id_number", nullable = false)
    private String studentIdNumber;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SourceType source;
    @Convert(converter = SemesterConverter.class)
    @Column(nullable = false)
    private Semester semester;
    @Column(name = "academic_year", nullable = false)
    private String academicYear;
    @Column(name = "course_count", nullable = false)
    private int courseCount;
    @Column(name = "section_count", nullable = false)
    private int sectionCount;
    @Column(name = "skipped_count", nullable = false)
    private int skippedCount;
    @Column(name = "scraped_at", nullable = false)
    private Instant scrapedAt;
}
