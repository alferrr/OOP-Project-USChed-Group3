package com.uched.service;

import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.exception.ResourceNotFoundException;
import com.uched.domain.exception.USChedException;
import com.uched.domain.model.Course;
import com.uched.domain.model.Section;
import com.uched.domain.value.Semester;
import com.uched.persistence.entity.CourseEntity;
import com.uched.persistence.entity.SectionEntity;
import com.uched.persistence.mapper.EntityMapper;
import com.uched.persistence.repository.CourseRepository;
import com.uched.persistence.repository.SectionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/** Every method is scoped to one student's own catalog by their ISMIS ID number; nothing here is shared. */
@Service
@Transactional(readOnly = true)
public class CourseService {
    private final CourseRepository courses;
    private final SectionRepository sections;
    private final EntityMapper mapper;

    public CourseService(CourseRepository courses, SectionRepository sections, EntityMapper mapper) {
        this.courses = courses;
        this.sections = sections;
        this.mapper = mapper;
    }

    public PageResult<Course> search(String studentIdNumber, String q, String department, Semester semester,
                                     String academicYear, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new InvalidCourseDataException("page must be >= 0 and size between 1 and 100");
        }
        Page<CourseEntity> result = courses.search(studentIdNumber, q == null ? "" : q.trim(),
                department == null ? "" : department.trim(), semester, academicYear, PageRequest.of(page, size));
        List<Course> items = result.getContent().stream().map(c -> mapper.toDomain(c, List.of())).toList();
        return new PageResult<>(items, page, size, result.getTotalElements());
    }

    public Course get(String studentIdNumber, long id) {
        CourseEntity c = courses.findByIdAndStudentIdNumber(id, studentIdNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Course " + id + " not found"));
        return mapper.toDomain(c, List.of());
    }

    public List<Section> sections(String studentIdNumber, long courseId, Semester semester, String academicYear) {
        if (courses.findByIdAndStudentIdNumber(courseId, studentIdNumber).isEmpty()) {
            throw new ResourceNotFoundException("Course " + courseId + " not found");
        }
        return toDomain(sections.findForCourses(studentIdNumber, List.of(courseId), semester, academicYear));
    }

    public List<String> departments(String studentIdNumber) {
        return courses.departments(studentIdNumber);
    }

    public List<String> academicYears(String studentIdNumber) {
        return sections.academicYears(studentIdNumber);
    }

    /** Empties this student's own private catalog (everything fetched from ISMIS so far). Nobody else's is touched. */
    @Transactional
    public void clearCatalog(String studentIdNumber) {
        sections.deleteByStudentIdNumber(studentIdNumber);
        courses.deleteByStudentIdNumber(studentIdNumber);
    }

    List<Section> toDomain(List<SectionEntity> entities) {
        List<Section> out = new ArrayList<>();
        for (SectionEntity e : entities) {
            try {
                out.add(mapper.toDomain(e));
            } catch (USChedException ignored) {
                // A stored section that no longer validates is unusable for planning; leave it out.
            }
        }
        return out;
    }
}
