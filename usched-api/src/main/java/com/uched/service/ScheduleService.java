package com.uched.service;

import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.exception.ResourceNotFoundException;
import com.uched.domain.exception.USChedException;
import com.uched.domain.model.Course;
import com.uched.domain.model.RankedSchedule;
import com.uched.domain.model.Schedule;
import com.uched.domain.model.Section;
import com.uched.domain.value.Semester;
import com.uched.engine.constraint.ConstraintFactory;
import com.uched.engine.generator.ScheduleGenerator;
import com.uched.engine.preference.SchedulePreference;
import com.uched.engine.scoring.ScheduleScorer;
import com.uched.engine.validator.ScheduleValidator;
import com.uched.persistence.entity.CourseEntity;
import com.uched.persistence.entity.SectionEntity;
import com.uched.persistence.mapper.EntityMapper;
import com.uched.persistence.repository.CourseRepository;
import com.uched.persistence.repository.SectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Every method is scoped to one student's own catalog by their ISMIS ID number. */
@Service
@Transactional(readOnly = true)
public class ScheduleService {
    public record GenerationResult(double totalUnits, int generatedCount, List<RankedSchedule> ranked) {
    }

    private final CourseRepository courses;
    private final SectionRepository sections;
    private final EntityMapper mapper;
    private final ScheduleGenerator generator;
    private final ScheduleScorer scorer;
    private final UChedProperties props;

    public ScheduleService(CourseRepository courses, SectionRepository sections, EntityMapper mapper,
                           ScheduleGenerator generator, ScheduleScorer scorer, UChedProperties props) {
        this.courses = courses;
        this.sections = sections;
        this.mapper = mapper;
        this.generator = generator;
        this.scorer = scorer;
        this.props = props;
    }

    public GenerationResult generate(String studentIdNumber, List<Long> courseIds, Semester semester,
                                     String academicYear, Integer limit, SchedulePreference prefs,
                                     List<Long> likeSectionIds) {
        if (courseIds == null || courseIds.isEmpty()) {
            throw new InvalidCourseDataException("Select at least one course.");
        }
        List<Long> ids = courseIds.stream().distinct().toList();
        List<CourseEntity> entities = courses.findByIdInAndStudentIdNumber(ids, studentIdNumber);
        if (entities.size() != ids.size()) {
            Set<Long> found = new HashSet<>();
            entities.forEach(e -> found.add(e.getId()));
            throw new ResourceNotFoundException("Unknown course id(s): "
                    + ids.stream().filter(i -> !found.contains(i)).toList());
        }
        Map<Long, List<Section>> byCourse = new LinkedHashMap<>();
        for (SectionEntity s : sections.findForCourses(studentIdNumber, ids, semester, academicYear)) {
            try {
                byCourse.computeIfAbsent(s.getCourse().getId(), k -> new ArrayList<>()).add(mapper.toDomain(s));
            } catch (USChedException ignored) {
                // Sections without usable meeting data cannot be planned.
            }
        }
        List<Course> domain = new ArrayList<>();
        double units = 0;
        for (CourseEntity e : entities) {
            domain.add(mapper.toDomain(e, byCourse.getOrDefault(e.getId(), List.of())));
            units += e.getUnits().doubleValue();
        }

        ScheduleValidator validator = new ScheduleValidator(ConstraintFactory.from(prefs));
        List<Schedule> generated = generator.generate(domain, validator, props.getGeneration().getCap());
        int top = limit == null ? props.getGeneration().getDefaultLimit() : Math.max(1, Math.min(limit, 100));
        List<RankedSchedule> ranked = likeSectionIds == null || likeSectionIds.isEmpty()
                ? scorer.rank(generated, prefs, top)
                : scorer.rankBySimilarity(generated, prefs, Set.copyOf(likeSectionIds), top);
        return new GenerationResult(units, generated.size(), ranked);
    }

    /** Metrics for 2-4 schedules, each given as a list of section ids. Always computed server-side. */
    public List<RankedSchedule> compare(String studentIdNumber, List<List<Long>> sectionIdGroups, SchedulePreference prefs) {
        if (sectionIdGroups == null || sectionIdGroups.size() < 2 || sectionIdGroups.size() > 4) {
            throw new InvalidCourseDataException("Compare 2 to 4 schedules.");
        }
        Set<Long> all = new HashSet<>();
        sectionIdGroups.forEach(all::addAll);
        Map<Long, Section> byId = new LinkedHashMap<>();
        for (SectionEntity e : sections.findWithMeetingsByIdIn(studentIdNumber, all)) {
            byId.put(e.getId(), mapper.toDomain(e));
        }
        List<RankedSchedule> out = new ArrayList<>();
        for (List<Long> group : sectionIdGroups) {
            List<Section> picked = new ArrayList<>();
            for (Long id : group) {
                Section s = byId.get(id);
                if (s == null) {
                    throw new ResourceNotFoundException("Unknown section id " + id);
                }
                picked.add(s);
            }
            out.add(scorer.score(Schedule.of(picked), prefs));
        }
        return out;
    }
}
