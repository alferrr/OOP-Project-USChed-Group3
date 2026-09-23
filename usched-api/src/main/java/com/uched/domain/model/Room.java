package com.uched.domain.model;

import com.uched.domain.exception.InvalidCourseDataException;

public record Room(String building, String roomCode, String campus) {
    public Room {
        if (roomCode == null || roomCode.isBlank()) {
            throw new InvalidCourseDataException("Room code is required");
        }
    }

    public String label() {
        return building == null || building.isBlank() ? roomCode : building + " " + roomCode;
    }
}
