package com.uched.persistence.entity;

import com.uched.domain.value.Semester;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class SemesterConverter implements AttributeConverter<Semester, String> {
    @Override
    public String convertToDatabaseColumn(Semester s) {
        return s == null ? null : s.code();
    }

    @Override
    public Semester convertToEntityAttribute(String v) {
        return v == null ? null : Semester.fromCode(v);
    }
}
