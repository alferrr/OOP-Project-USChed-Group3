package com.uched.persistence.repository;

import com.uched.domain.value.Semester;
import com.uched.persistence.entity.CourseEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Every query is scoped to one student's own catalog; nobody can read what another student has fetched. */
public interface CourseRepository extends JpaRepository<CourseEntity, Long> {
    Optional<CourseEntity> findByStudentIdNumberAndCode(String studentIdNumber, String code);

    Optional<CourseEntity> findByIdAndStudentIdNumber(Long id, String studentIdNumber);

    List<CourseEntity> findByIdInAndStudentIdNumber(List<Long> ids, String studentIdNumber);

    @Query("""
            select c from CourseEntity c
            where c.studentIdNumber = :studentId
              and (:q = '' or lower(c.code) like lower(concat('%', :q, '%')) or lower(c.name) like lower(concat('%', :q, '%')))
              and (:dept = '' or c.department = :dept)
              and exists (select 1 from SectionEntity s where s.course = c and s.semester = :sem and s.academicYear = :year)
            order by c.code
            """)
    Page<CourseEntity> search(@Param("studentId") String studentId, @Param("q") String q, @Param("dept") String dept,
                              @Param("sem") Semester sem, @Param("year") String year, Pageable pageable);

    @Query("""
            select count(distinct s.course.id) from SectionEntity s
            where s.studentIdNumber = :studentId and s.semester = :sem and s.academicYear = :year
            """)
    long countOfferedCourses(@Param("studentId") String studentId, @Param("sem") Semester sem, @Param("year") String year);

    @Query("""
            select distinct c.department from CourseEntity c
            where c.studentIdNumber = :studentId and c.department is not null order by c.department
            """)
    List<String> departments(@Param("studentId") String studentId);

    /** Deletes every course fetched into this student's own catalog. Callers must delete its sections first. */
    void deleteByStudentIdNumber(String studentIdNumber);
}
