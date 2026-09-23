package com.uched.persistence.repository;

import com.uched.persistence.entity.InstructorEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface InstructorRepository extends JpaRepository<InstructorEntity, Long> {
    Optional<InstructorEntity> findByName(String name);
}
