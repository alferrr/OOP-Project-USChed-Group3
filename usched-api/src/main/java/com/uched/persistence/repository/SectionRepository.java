package com.uched.persistence.repository;

import com.uched.domain.value.Semester;
import com.uched.persistence.entity.SectionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** Every query is scoped to one student's own catalog; a course/section id from another student never resolves. */
public interface SectionRepository extends JpaRepository<SectionEntity, Long> {
    Optional<SectionEntity> findByCourseIdAndSectionCodeAndSemesterAndAcademicYear(
            Long courseId, String sectionCode, Semester semester, String academicYear);

    @Query("""
            select distinct s from SectionEntity s
            join fetch s.course left join fetch s.instructor
            left join fetch s.meetings m left join fetch m.room
            where s.studentIdNumber = :studentId and s.course.id in :courseIds and s.semester = :sem and s.academicYear = :year
            order by s.sectionCode
            """)
    List<SectionEntity> findForCourses(@Param("studentId") String studentId, @Param("courseIds") Collection<Long> courseIds,
                                       @Param("sem") Semester sem, @Param("year") String year);

    @Query("""
            select distinct s from SectionEntity s
            join fetch s.course left join fetch s.instructor
            left join fetch s.meetings m left join fetch m.room
            where s.studentIdNumber = :studentId and s.id in :ids
            """)
    List<SectionEntity> findWithMeetingsByIdIn(@Param("studentId") String studentId, @Param("ids") Collection<Long> ids);

    @Query("select distinct s.academicYear from SectionEntity s where s.studentIdNumber = :studentId order by s.academicYear desc")
    List<String> academicYears(@Param("studentId") String studentId);

    long countByStudentIdNumberAndSemesterAndAcademicYear(String studentIdNumber, Semester semester, String academicYear);

    /** Deletes every section fetched into this student's own catalog. Their meetings cascade with them. */
    void deleteByStudentIdNumber(String studentIdNumber);
}
