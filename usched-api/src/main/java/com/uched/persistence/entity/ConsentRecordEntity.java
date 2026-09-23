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
@Table(name = "consent_records")
@Getter
@Setter
@NoArgsConstructor
public class ConsentRecordEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false, length = 36)
    private String sessionId;
    @Column(name = "terms_version", nullable = false)
    private String termsVersion;
    @Column(name = "agreed_terms", nullable = false)
    private boolean agreedTerms;
    @Column(name = "agreed_credential_use", nullable = false)
    private boolean agreedCredentialUse;
    @Column(name = "ip_hash", nullable = false, length = 64)
    private String ipHash;
    @Column(name = "user_agent")
    private String userAgent;
    @Column(name = "accepted_at", nullable = false)
    private Instant acceptedAt;
}
