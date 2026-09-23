package com.uched.persistence.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.DayOfWeek;

/** Stores days as MON..SAT to match the MySQL ENUM. */
@Converter
public class DayOfWeekConverter implements AttributeConverter<DayOfWeek, String> {
    @Override
    public String convertToDatabaseColumn(DayOfWeek d) {
        return d == null ? null : d.name().substring(0, 3);
    }

    @Override
    public DayOfWeek convertToEntityAttribute(String v) {
        if (v == null) {
            return null;
        }
        for (DayOfWeek d : DayOfWeek.values()) {
            if (d.name().startsWith(v)) {
                return d;
            }
        }
        throw new IllegalArgumentException("Unknown day " + v);
    }
}
