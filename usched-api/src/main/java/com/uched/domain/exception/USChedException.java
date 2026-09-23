package com.uched.domain.exception;

/** Root of the USChed exception hierarchy. Mapped to HTTP status/code by the API layer. */
public class USChedException extends RuntimeException {
    public USChedException(String message) {
        super(message);
    }

    public USChedException(String message, Throwable cause) {
        super(message, cause);
    }
}
