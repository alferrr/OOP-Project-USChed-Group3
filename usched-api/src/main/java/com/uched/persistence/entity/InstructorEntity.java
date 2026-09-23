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
@Table(name = "instructors")
@Getter
@Setter
@NoArgsConstructor
public class InstructorEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;
}
