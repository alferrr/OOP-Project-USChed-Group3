package com.uched.domain.exception;

/** The server has no ISMIS connection settings yet (recon not done). Not a network failure. */
public class IsmisNotConfiguredException extends IsmisUnavailableException {
    public IsmisNotConfiguredException(String message) {
        super(message);
    }
}
