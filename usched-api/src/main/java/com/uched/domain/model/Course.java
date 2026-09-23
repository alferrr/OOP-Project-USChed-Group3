package com.uched.domain.model;

import com.uched.domain.exception.InvalidCourseDataException;

import java.util.List;

public class Course {
    private final Long id;
    private final String code;
    private final String name;
    private final String description;
    private final double units;
    private final String department;
    private final String prerequisites;
    private final List<Section> sections;

    public Course(Long id, String code, String name, String description, double units,
                  String prerequisites, List<Section> sections) {
        this(id, code, name, description, units, null, prerequisites, sections);
    }

    public Course(Long id, String code, String name, String description, double units,
                  String department, String prerequisites, List<Section> sections) {
        if (code == null || code.isBlank()) {
            throw new InvalidCourseDataException("Course code is required");
        }
        if (name == null || name.isBlank()) {
            throw new InvalidCourseDataException("Course name is required for " + code);
        }
        if (units <= 0) {
            throw new InvalidCourseDataException("Units must be positive for " + code);
        }
        if (sections == null) {
            throw new InvalidCourseDataException("Sections list is required for " + code);
        }
        this.id = id;
        this.code = code.trim();
        this.name = name.trim();
        this.description = description;
        this.units = units;
        this.department = department;
        this.prerequisites = prerequisites;
        this.sections = List.copyOf(sections);
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public double getUnits() {
        return units;
    }

    public String getDepartment() {
        return department;
    }

    public String getPrerequisites() {
        return prerequisites;
    }

    public List<Section> getSections() {
        return sections;
    }
}
