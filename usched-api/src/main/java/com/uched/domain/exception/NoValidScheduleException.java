package com.uched.domain.exception;

import java.util.List;

/** No conflict-free schedule exists. Details explain what to change. */
public class NoValidScheduleException extends USChedException {
    private final List<String> details;

    public NoValidScheduleException(String message, List<String> details) {
        super(message);
        this.details = List.copyOf(details);
    }

    public List<String> getDetails() {
        return details;
    }
}
