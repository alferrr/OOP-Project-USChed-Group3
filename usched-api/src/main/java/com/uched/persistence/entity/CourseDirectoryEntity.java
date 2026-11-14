package com.uched.persistence.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** Shared reference data: a course code and title, with nothing that identifies a student. */
@Entity
@Table(name = "course_directory")
@Getter
@Setter
@NoArgsConstructor
public class CourseDirectoryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String code;
    @Column(nullable = false)
    private String name;
    @Column(precision = 3, scale = 1)
    private BigDecimal units;
    private String department;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();
}
