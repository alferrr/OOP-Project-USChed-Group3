package com.uched.persistence.repository;

import com.uched.persistence.entity.RoomEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoomRepository extends JpaRepository<RoomEntity, Long> {
    Optional<RoomEntity> findByCampusAndBuildingAndRoomCode(String campus, String building, String roomCode);
}
