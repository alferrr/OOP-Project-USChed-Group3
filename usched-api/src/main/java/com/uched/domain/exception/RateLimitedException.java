package com.uched.domain.exception;

public class RateLimitedException extends USChedException {
    public RateLimitedException(String message) {
        super(message);
    }
}
