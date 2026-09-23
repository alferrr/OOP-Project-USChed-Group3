package com.uched.domain.model;

import com.uched.domain.exception.InvalidCourseDataException;

public abstract class Person {
    private final Long id;
    private final String name;

    protected Person(Long id, String name) {
        if (name == null || name.isBlank()) {
            throw new InvalidCourseDataException("Name is required");
        }
        this.id = id;
        this.name = name.trim();
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    @Override
    public String toString() {
        return getClass().getSimpleName() + "[" + name + "]";
    }
}
