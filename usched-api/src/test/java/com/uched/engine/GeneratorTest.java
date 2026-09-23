package com.uched.engine;

import com.uched.domain.exception.NoValidScheduleException;
import com.uched.domain.model.Course;
import com.uched.domain.model.Schedule;
import com.uched.engine.constraint.ConstraintFactory;
import com.uched.engine.generator.BacktrackingScheduleGenerator;
import com.uched.engine.generator.ScheduleGenerator;
import com.uched.engine.preference.SchedulePreference;
import com.uched.engine.validator.ScheduleValidator;
import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.util.List;

import static com.uched.engine.Fixtures.course;
import static com.uched.engine.Fixtures.courseWithSlots;
import static com.uched.engine.Fixtures.lecture;
import static com.uched.engine.Fixtures.section;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GeneratorTest {
    private final ScheduleGenerator generator = new BacktrackingScheduleGenerator();
    private final ScheduleValidator noRules = new ScheduleValidator(List.of());

    @Test
    void everyResultHasOneSectionPerCourseAndNoConflicts() {
        // 3 x 2 x 4 x 3 = 72 raw combinations on non-overlapping-per-course slots
        List<Course> courses = List.of(
                courseWithSlots("A 1", 3, 7),
                courseWithSlots("B 1", 2, 10),
                courseWithSlots("C 1", 4, 12),
                courseWithSlots("D 1", 3, 16));
        List<Schedule> result = generator.generate(courses, noRules, 500);
        assertThat(result).hasSize(72);
        assertThat(result).allSatisfy(s -> {
            assertThat(s.getSections()).hasSize(4);
            assertThat(s.hasConflict()).isFalse();
        });
    }

    @Test
    void conflictingBranchesArePruned() {
        Course a = course("A 1",
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:30")),
                section("A 1", "B", lecture(DayOfWeek.MONDAY, "10:30", "12:00")));
        Course b = course("B 1",
                section("B 1", "A", lecture(DayOfWeek.MONDAY, "09:00", "10:30")));
        // A-A conflicts with B-A; A-B is the only valid pairing.
        List<Schedule> result = generator.generate(List.of(a, b), noRules, 500);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSections()).extracting(x -> x.getCourseCode() + x.getSectionCode())
                .containsExactlyInAnyOrder("A 1B", "B 1A");
    }

    @Test
    void limitIsRespected() {
        List<Course> courses = List.of(courseWithSlots("A 1", 4, 7), courseWithSlots("B 1", 4, 12));
        assertThat(generator.generate(courses, noRules, 5)).hasSize(5);
    }

    @Test
    void impossibleCaseThrowsWithExplanation() {
        Course a = course("A 1", section("A 1", "A", lecture(DayOfWeek.MONDAY, "08:00", "09:30")));
        Course b = course("B 1", section("B 1", "A", lecture(DayOfWeek.MONDAY, "09:00", "10:30")));
        assertThatThrownBy(() -> generator.generate(List.of(a, b), noRules, 10))
                .isInstanceOf(NoValidScheduleException.class)
                .satisfies(e -> assertThat(((NoValidScheduleException) e).getDetails().get(0))
                        .contains("A 1").contains("B 1"));
    }

    @Test
    void hardConstraintsDiscardSchedules() {
        Course a = course("A 1",
                section("A 1", "A", lecture(DayOfWeek.MONDAY, "07:00", "08:00")),
                section("A 1", "B", lecture(DayOfWeek.MONDAY, "10:00", "11:00")));
        SchedulePreference prefs = SchedulePreference.builder().earliestStart(java.time.LocalTime.of(9, 0)).build();
        ScheduleValidator validator = new ScheduleValidator(ConstraintFactory.from(prefs));
        List<Schedule> result = generator.generate(List.of(a), validator, 10);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getSections().get(0).getSectionCode()).isEqualTo("B");
    }
}
