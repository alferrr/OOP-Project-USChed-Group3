package com.uched.domain.value;

import com.uched.domain.exception.InvalidCourseDataException;

public enum Semester {
    FIRST("1ST"),
    SECOND("2ND"),
    SUMMER("SUMMER");

    private final String code;

    Semester(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }

    public static Semester fromCode(String code) {
        for (Semester s : values()) {
            if (s.code.equalsIgnoreCase(code == null ? "" : code.trim())) {
                return s;
            }
        }
        throw new InvalidCourseDataException("Unknown semester: " + code);
    }
}
