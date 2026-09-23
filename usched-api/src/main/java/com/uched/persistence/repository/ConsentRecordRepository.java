package com.uched.persistence.repository;

import com.uched.persistence.entity.ConsentRecordEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsentRecordRepository extends JpaRepository<ConsentRecordEntity, Long> {
}
