package com.uched.persistence.repository;

import com.uched.persistence.entity.CourseDirectoryEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CourseDirectoryRepository extends JpaRepository<CourseDirectoryEntity, Long> {
    /** Codes must be passed upper-cased; matching ignores case so "cis 2105" and "CIS 2105" are one course. */
    @Query("select d from CourseDirectoryEntity d where upper(d.code) in :codes")
    List<CourseDirectoryEntity> findByUpperCodeIn(@Param("codes") Collection<String> codes);

    /** Code matches first (prefix before substring), then title matches, each alphabetical. */
    @Query("""
            select d from CourseDirectoryEntity d
            where lower(d.code) like lower(concat('%', :q, '%')) or lower(d.name) like lower(concat('%', :q, '%'))
            order by case when lower(d.code) like lower(concat(:q, '%')) then 0
                          when lower(d.code) like lower(concat('%', :q, '%')) then 1 else 2 end,
                     d.code
            """)
    List<CourseDirectoryEntity> search(@Param("q") String q, Pageable pageable);
}
