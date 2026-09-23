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
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
public class RoomEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String building = "";
    @Column(name = "room_code", nullable = false)
    private String roomCode;
    @Column(nullable = false)
    private String campus;
}
