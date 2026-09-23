package com.uched.service;

import com.uched.datasource.CourseDataSourceFactory;
import com.uched.datasource.ismis.IsmisConnection;
import com.uched.datasource.ismis.IsmisCredentials;
import com.uched.domain.exception.IsmisSessionExpiredException;
import com.uched.domain.exception.RateLimitedException;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Holds signed-in ISMIS connections in memory so a student signs in once and then runs several searches.
 * Each session is identified by the student's own ISMIS ID number (their username) and by a separate,
 * unguessable session id that the browser holds and presents on every later call; that id alone is proof
 * enough of who is asking, the same way any bearer session token is. The password is used only inside
 * {@link #login} and destroyed there; only the session cookies and the ID number live on, in memory, never on
 * disk or in the database. A session ends when the student signs out, after an idle timeout, after a maximum
 * lifetime, or when the server restarts.
 */
@Service
public class IsmisSessionService {
    public record Opened(String sessionId, Instant expiresAt) {
    }

    /** A leased session: hold it while a search runs so the reaper leaves it alone. */
    public static final class Lease implements AutoCloseable {
        private final Entry entry;
        private final IsmisSessionService owner;

        private Lease(Entry entry, IsmisSessionService owner) {
            this.entry = entry;
            this.owner = owner;
        }

        public IsmisConnection connection() {
            return entry.connection;
        }

        public String sessionId() {
            return entry.id;
        }

        public String studentIdNumber() {
            return entry.studentIdNumber;
        }

        /** The session is unusable (e.g. ISMIS dropped it): remove it so the student is asked to sign in again. */
        public void destroy() {
            owner.remove(entry);
        }

        @Override
        public void close() {
            entry.lastUsed = Instant.now();
            entry.busy = false;
        }
    }

    private static final class Entry {
        final String id;
        final String studentIdNumber;
        final IsmisConnection connection;
        final Instant createdAt = Instant.now();
        volatile Instant lastUsed = Instant.now();
        volatile boolean busy;

        Entry(String id, String studentIdNumber, IsmisConnection connection) {
            this.id = id;
            this.studentIdNumber = studentIdNumber;
            this.connection = connection;
        }
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    private final CourseDataSourceFactory factory;
    private final UChedProperties props;
    private final Map<String, Entry> sessions = new ConcurrentHashMap<>();
    private final ScheduledExecutorService reaper = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "ismis-session-reaper");
        t.setDaemon(true);
        return t;
    });

    public IsmisSessionService(CourseDataSourceFactory factory, UChedProperties props) {
        this.factory = factory;
        this.props = props;
        reaper.scheduleWithFixedDelay(this::reapExpired, 15, 15, TimeUnit.SECONDS);
    }

    /**
     * Signs in to ISMIS. idNumber is the student's own ISMIS username, exactly as they typed it; ISMIS accepting
     * the login alongside it is what establishes that it really is theirs. The password array is zeroed before
     * this returns, whether or not sign-in succeeds.
     */
    public Opened login(String idNumber, char[] password) {
        if (sessions.size() >= props.getIsmisSession().getMaxSessions()) {
            throw new RateLimitedException("USChed has too many signed-in students right now. Try again shortly.");
        }
        IsmisConnection connection;
        try (IsmisCredentials credentials = new IsmisCredentials(idNumber.toCharArray(), password)) {
            connection = factory.signIn(credentials);
        }
        // One session per student: signing in again replaces the previous one.
        sessions.values().stream().filter(e -> e.studentIdNumber.equals(idNumber)).toList().forEach(this::remove);
        Entry entry = new Entry(newId(), idNumber, connection);
        sessions.put(entry.id, entry);
        return new Opened(entry.id, expiresAt(entry));
    }

    /** Leases the session for one search run; throws if it is missing or expired. */
    public Lease lease(String sessionId) {
        Entry e = sessionId == null ? null : sessions.get(sessionId);
        if (e == null || isExpired(e)) {
            throw new IsmisSessionExpiredException("Your ISMIS session has ended. Please sign in again.");
        }
        synchronized (e) {
            if (e.busy) {
                throw new RateLimitedException("A search is already running for your ISMIS session.");
            }
            e.busy = true;
        }
        e.lastUsed = Instant.now();
        return new Lease(e, this);
    }

    /**
     * Who a live session belongs to, for endpoints that only need to know the student's identity (browsing their
     * own catalog) without holding the ISMIS connection itself. Refreshes the idle timer the same as a lease would.
     */
    public String identify(String sessionId) {
        Entry e = sessionId == null ? null : sessions.get(sessionId);
        if (e == null || isExpired(e)) {
            throw new IsmisSessionExpiredException("Your ISMIS session has ended. Please sign in again.");
        }
        e.lastUsed = Instant.now();
        return e.studentIdNumber;
    }

    /** Signs out: ends the session immediately. An unknown id is ignored. */
    public void logout(String sessionId) {
        Entry e = sessionId == null ? null : sessions.get(sessionId);
        if (e != null) {
            remove(e);
        }
    }

    public int activeSessions() {
        return sessions.size();
    }

    /**
     * Registers a session for studentIdNumber without contacting ISMIS at all. Only ever called from tests
     * that need a signed-in identity but are not themselves testing the ISMIS connection; the connection
     * stored is null; a leased test session must not be used to run a real search.
     */
    public String seedTestSession(String studentIdNumber) {
        Entry entry = new Entry(newId(), studentIdNumber, null);
        sessions.put(entry.id, entry);
        return entry.id;
    }

    Instant expiresAt(Entry e) {
        Instant idle = e.lastUsed.plus(Duration.ofMinutes(props.getIsmisSession().getIdleMinutes()));
        Instant max = e.createdAt.plus(Duration.ofMinutes(props.getIsmisSession().getMaxMinutes()));
        return idle.isBefore(max) ? idle : max;
    }

    private boolean isExpired(Entry e) {
        return !expiresAt(e).isAfter(Instant.now());
    }

    void reapExpired() {
        for (Entry e : sessions.values()) {
            if (!e.busy && isExpired(e)) {
                remove(e);
            }
        }
    }

    private void remove(Entry e) {
        if (sessions.remove(e.id, e)) {
            e.connection.close();
        }
    }

    private static String newId() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    @PreDestroy
    void shutdown() {
        reaper.shutdownNow();
        sessions.values().forEach(this::remove);
    }
}
