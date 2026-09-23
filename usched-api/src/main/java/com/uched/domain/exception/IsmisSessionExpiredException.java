package com.uched.domain.exception;

/** The ISMIS sign-in session held by USChed has ended (idle, timed out, signed out, or ISMIS dropped it). */
public class IsmisSessionExpiredException extends IsmisAuthenticationException {
    public IsmisSessionExpiredException(String message) {
        super(message);
    }
}
