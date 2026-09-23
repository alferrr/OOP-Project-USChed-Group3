package com.uched.datasource.ismis;

import java.util.Arrays;

/**
 * Transient ISMIS credentials. Not Serializable, redacted in toString, zeroed on close.
 * Only code in this package can read the values. Always use in try-with-resources.
 */
public final class IsmisCredentials implements AutoCloseable {
    private final char[] username;
    private final char[] password;
    private boolean closed;

    /** Takes ownership of both arrays (no defensive copy) so there is exactly one copy to zero. */
    public IsmisCredentials(char[] username, char[] password) {
        if (username == null || username.length == 0 || password == null || password.length == 0) {
            throw new IllegalArgumentException("Username and password are required");
        }
        this.username = username;
        this.password = password;
    }

    String username() {
        ensureOpen();
        return new String(username);
    }

    char[] password() {
        ensureOpen();
        return password;
    }

    boolean isClosed() {
        return closed;
    }

    private void ensureOpen() {
        if (closed) {
            throw new IllegalStateException("Credentials have been destroyed");
        }
    }

    @Override
    public void close() {
        closed = true;
        Arrays.fill(username, '\0');
        Arrays.fill(password, '\0');
    }

    @Override
    public String toString() {
        return "IsmisCredentials[REDACTED]";
    }
}
