package com.uched.service;

import com.uched.datasource.FetchedCourseDataSource;
import com.uched.datasource.SourceType;
import com.uched.datasource.ismis.IsmisConnection;
import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.exception.IsmisNoResultsException;
import com.uched.domain.exception.IsmisSessionExpiredException;
import com.uched.domain.exception.IsmisTooManyResultsException;
import com.uched.domain.exception.IsmisUnavailableException;
import com.uched.domain.exception.RateLimitedException;
import com.uched.domain.exception.ResourceNotFoundException;
import com.uched.domain.exception.USChedException;
import com.uched.domain.model.Course;
import com.uched.domain.value.Semester;
import com.uched.persistence.repository.CourseRepository;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Runs a student's list of course searches one by one over their signed-in ISMIS session, importing each
 * result into their own private catalog as it arrives. A code with no match or too many matches does not stop
 * the others. Progress is per code. Nothing here ever sees credentials: they were destroyed at sign-in.
 */
@Service
public class SearchJobService {
    private static final Logger log = LoggerFactory.getLogger(SearchJobService.class);
    static final int MAX_QUERIES = 15;

    public enum Status { QUEUED, RUNNING, DONE, FAILED }

    public enum ItemStatus { PENDING, RUNNING, DONE, NO_RESULTS, TOO_MANY, FAILED, SKIPPED }

    public record CourseRef(long id, String code, String name, double units) {
    }

    /**
     * suggestions: when the query had no exact match but looked like an elective "slot" code (e.g. a
     * prospectus placeholder like "GE-FEL 2"), the real options ISMIS actually offers under that family
     * (e.g. "GE-FEL"), already imported into the student's own catalog so they can be added directly.
     * searchedAs: what was actually sent to ISMIS, only set when it differs from query (an alias rewrite).
     */
    public record Item(String query, ItemStatus status, String message, int courses, int sections,
                       List<CourseRef> found, List<CourseRef> suggestions, String searchedAs) {
    }

    public record View(String jobId, Status status, String message, List<Item> items,
                       String errorCode, String errorMessage) {
    }

    private static final class Job {
        final String id = UUID.randomUUID().toString();
        final String studentIdNumber;
        final Instant createdAt = Instant.now();
        private final List<Item> items = new ArrayList<>();
        private Status status = Status.QUEUED;
        private String message = "Waiting to start…";
        private String errorCode;
        private String errorMessage;

        Job(String studentIdNumber, List<String> queries) {
            this.studentIdNumber = studentIdNumber;
            queries.forEach(q -> items.add(new Item(q, ItemStatus.PENDING, "", 0, 0, List.of(), List.of(), null)));
        }

        synchronized boolean terminal() {
            return status == Status.DONE || status == Status.FAILED;
        }

        synchronized void running(String msg) {
            if (!terminal()) {
                status = Status.RUNNING;
                message = msg;
            }
        }

        synchronized void item(int i, Item item) {
            items.set(i, item);
        }

        synchronized void skipRemaining(int from, String why) {
            for (int i = from; i < items.size(); i++) {
                Item it = items.get(i);
                if (it.status() == ItemStatus.PENDING || it.status() == ItemStatus.RUNNING) {
                    items.set(i, new Item(it.query(), ItemStatus.SKIPPED, why, 0, 0, List.of(), List.of(), null));
                }
            }
        }

        synchronized void finish() {
            if (!terminal()) {
                status = Status.DONE;
                message = "Finished.";
            }
        }

        synchronized void fail(String code, String msg) {
            if (!terminal()) {
                status = Status.FAILED;
                errorCode = code;
                errorMessage = msg;
                message = msg;
            }
        }

        synchronized View view() {
            return new View(id, status, message, List.copyOf(items), errorCode, errorMessage);
        }
    }

    private final IsmisSessionService sessions;
    private final CourseImportService importer;
    private final CourseRepository courses;
    private final UChedProperties props;
    private final ExecutorService workers;
    private final ScheduledExecutorService watchdog = Executors.newSingleThreadScheduledExecutor();
    private final Map<String, Job> jobs = new ConcurrentHashMap<>();
    private final Set<String> activeStudents = new HashSet<>();
    private int running;

    public SearchJobService(IsmisSessionService sessions, CourseImportService importer, CourseRepository courses,
                            UChedProperties props) {
        this.sessions = sessions;
        this.importer = importer;
        this.courses = courses;
        this.props = props;
        this.workers = Executors.newFixedThreadPool(Math.max(1, props.getScrape().getMaxConcurrent()));
    }

    /** Trims, collapses spaces, drops blanks and duplicates (ignoring case); enforces the size limits. */
    static List<String> normalise(List<String> raw) {
        List<String> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String r : raw == null ? List.<String>of() : raw) {
            String q = r == null ? "" : r.trim().replaceAll("\\s+", " ");
            if (q.isEmpty() || !seen.add(q.toLowerCase(Locale.ROOT))) {
                continue;
            }
            if (q.length() < 2 || q.length() > 100) {
                throw new InvalidCourseDataException("Each course code must be 2 to 100 characters: \"" + q + "\"");
            }
            out.add(q);
        }
        if (out.isEmpty()) {
            throw new InvalidCourseDataException("Enter at least one course code.");
        }
        if (out.size() > MAX_QUERIES) {
            throw new InvalidCourseDataException("Search at most " + MAX_QUERIES + " course codes at a time.");
        }
        return out;
    }

    /**
     * Starts a job over the student's own ISMIS session. Fails fast if the session is gone or busy.
     * jobId is an unguessable random id and is itself sufficient to poll the job's status; it does not carry
     * anything about who the student is beyond what the job needed to run (their ID number, for import scoping).
     */
    public String submit(String sessionId, Semester semester, String academicYear, List<String> rawQueries) {
        List<String> queries = normalise(rawQueries);
        IsmisSessionService.Lease lease = sessions.lease(sessionId);
        String studentIdNumber = lease.studentIdNumber();
        Job job = new Job(studentIdNumber, queries);
        try {
            synchronized (this) {
                if (running >= props.getScrape().getMaxConcurrent()) {
                    throw new RateLimitedException("USChed is busy reading ISMIS for other students. Try again shortly.");
                }
                if (activeStudents.contains(studentIdNumber)) {
                    throw new RateLimitedException("You already have a search in progress.");
                }
                running++;
                activeStudents.add(studentIdNumber);
            }
        } catch (RuntimeException e) {
            lease.close();
            throw e;
        }
        purgeOldJobs();
        jobs.put(job.id, job);

        Future<?> future = workers.submit(() -> run(job, lease, semester, academicYear, queries));
        long budget = Math.min(900, (long) props.getScrape().getTimeoutSeconds() * queries.size());
        watchdog.schedule(() -> {
            if (!job.terminal()) {
                job.fail("ISMIS_UNAVAILABLE", "The search timed out.");
                future.cancel(true);
            }
        }, budget, TimeUnit.SECONDS);
        return job.id;
    }

    public View view(String jobId) {
        Job j = jobs.get(jobId);
        if (j == null) {
            throw new ResourceNotFoundException("Unknown search.");
        }
        return j.view();
    }

    private void run(Job job, IsmisSessionService.Lease lease, Semester semester, String year, List<String> queries) {
        try {
            for (int i = 0; i < queries.size(); i++) {
                if (Thread.currentThread().isInterrupted() || job.terminal()) {
                    break;
                }
                String q = queries.get(i);
                String actual = resolveAlias(q);
                job.running("Searching " + (i + 1) + " of " + queries.size() + ": " + q);
                job.item(i, new Item(q, ItemStatus.RUNNING, "Searching…", 0, 0, List.of(), List.of(), null));
                try {
                    job.item(i, searchOne(lease.connection(), semester, year, q, actual, job.studentIdNumber));
                } catch (IsmisNoResultsException e) {
                    job.item(i, noResultsWithSuggestions(lease.connection(), semester, year, q, actual, job.studentIdNumber, e));
                } catch (IsmisTooManyResultsException e) {
                    job.item(i, new Item(q, ItemStatus.TOO_MANY, e.getMessage(), 0, 0, List.of(), List.of(), searchedAsOf(q, actual)));
                } catch (IsmisSessionExpiredException e) {
                    lease.destroy();
                    job.item(i, new Item(q, ItemStatus.FAILED, e.getMessage(), 0, 0, List.of(), List.of(), null));
                    job.skipRemaining(i + 1, "Your ISMIS session ended.");
                    job.fail("ISMIS_SESSION_EXPIRED", e.getMessage());
                    return;
                } catch (IsmisUnavailableException e) {
                    job.item(i, new Item(q, ItemStatus.FAILED, e.getMessage(), 0, 0, List.of(), List.of(), null));
                    job.skipRemaining(i + 1, "ISMIS could not be reached.");
                    job.fail(ErrorCodes.of(e).code(), e.getMessage());
                    return;
                } catch (USChedException e) {
                    log.info("Search job {} item failed: {}: {}", job.id, ErrorCodes.of(e).code(), e.getMessage());
                    job.item(i, new Item(q, ItemStatus.FAILED, e.getMessage(), 0, 0, List.of(), List.of(), null));
                }
            }
            job.finish();
            log.info("Search job {} finished: DONE", job.id);
        } catch (Exception e) {
            job.fail("INTERNAL_ERROR", "Something went wrong while searching.");
            log.warn("Search job {} finished: FAILED ({})", job.id, e.getClass().getSimpleName());
        } finally {
            lease.close();
            synchronized (this) {
                running--;
                activeStudents.remove(job.studentIdNumber);
            }
        }
    }

    /** query is what the student typed (shown back to them); actual is what is actually sent to ISMIS. */
    private Item searchOne(IsmisConnection connection, Semester semester, String year, String query, String actual,
                           String studentIdNumber) {
        IsmisConnection.SearchResult result = connection.search(semester, year, actual);
        ImportReport report = importer.importFrom(
                new FetchedCourseDataSource(SourceType.ISMIS, result.courses(), result.skipped(), connection.providesUnits()),
                semester, year, studentIdNumber);
        List<CourseRef> found = importedRefs(result.courses(), studentIdNumber);
        return new Item(query, ItemStatus.DONE, "", report.courses(), report.sections(), found, List.of(), searchedAsOf(query, actual));
    }

    private static String searchedAsOf(String query, String actual) {
        return query.equalsIgnoreCase(actual) ? null : actual;
    }

    private List<CourseRef> importedRefs(List<Course> imported, String studentIdNumber) {
        List<CourseRef> refs = new ArrayList<>();
        for (Course c : imported) {
            courses.findByStudentIdNumberAndCode(studentIdNumber, c.getCode()).ifPresent(e ->
                    refs.add(new CourseRef(e.getId(), e.getCode(), e.getName(), e.getUnits().doubleValue())));
        }
        return refs;
    }

    private static final int MAX_SUGGESTIONS = 10;
    /** "GE-FEL 2", "IT ELEC 3" -> "GE-FEL", "IT ELEC"; a plain "CIS 2105" -> not attempted (too broad, see below). */
    // The prefix group excludes digits entirely, including its own last character (course-code prefixes never
    // contain any): "\S" alone is not enough there, since a digit satisfies "non-whitespace" too, so a plain
    // ".*\S" or "[^0-9]*\S" can still peel off just the final digit of a multi-digit number ("ge-fel 12" would
    // wrongly split as "ge-fel 1" + "2", since a single trailing digit alone still satisfies "\d+" after it).
    private static final java.util.regex.Pattern TRAILING_NUMBER =
            java.util.regex.Pattern.compile("^([^0-9]*[^0-9\\s])\\s*\\d+[A-Za-z]?$");

    /**
     * When an exact search finds nothing, and the code looks like a numbered "slot" in a family (a prospectus
     * placeholder such as "GE-FEL 2" rather than a specific course), tries the family's own prefix ("GE-FEL")
     * and offers whatever ISMIS actually has under it. Only attempted for prefixes of 5+ characters: a short
     * one (like "CIS" or "NSTP") is a whole department, not a slot, and broadening automatically to it would
     * mean an unasked-for, much heavier scrape for little benefit. Failures here are swallowed: the original
     * "no results" stands either way.
     */
    private Item noResultsWithSuggestions(IsmisConnection connection, Semester semester, String year, String query,
                                          String actual, String studentIdNumber, IsmisNoResultsException original) {
        var m = TRAILING_NUMBER.matcher(actual);
        String prefix = m.matches() ? m.group(1).trim() : null;
        if (prefix == null || prefix.length() < 5 || prefix.equalsIgnoreCase(actual)) {
            return new Item(query, ItemStatus.NO_RESULTS, original.getMessage(), 0, 0, List.of(), List.of(), searchedAsOf(query, actual));
        }
        try {
            IsmisConnection.SearchResult result = connection.search(semester, year, prefix);
            ImportReport report = importer.importFrom(
                    new FetchedCourseDataSource(SourceType.ISMIS, result.courses(), result.skipped(), connection.providesUnits()),
                    semester, year, studentIdNumber);
            List<CourseRef> suggestions = importedRefs(result.courses(), studentIdNumber);
            if (suggestions.size() > MAX_SUGGESTIONS) {
                suggestions = List.copyOf(suggestions.subList(0, MAX_SUGGESTIONS));
            }
            String message = suggestions.isEmpty() ? original.getMessage()
                    : "No exact match for \"" + query + "\", but ISMIS offers " + report.courses()
                        + " \"" + prefix + "\" " + (report.courses() == 1 ? "course" : "courses") + " this term.";
            return new Item(query, ItemStatus.NO_RESULTS, message, 0, 0, List.of(), suggestions, searchedAsOf(query, actual));
        } catch (USChedException e) {
            // The fallback itself failing (e.g. also no results, or ISMIS hiccups) is not the student's problem;
            // the original "no exact match" message is enough on its own.
            return new Item(query, ItemStatus.NO_RESULTS, original.getMessage(), 0, 0, List.of(), List.of(), searchedAsOf(query, actual));
        }
    }

    /**
     * Known cases where a course's descriptive name is not its actual, searchable ISMIS code — confirmed
     * case by case, not guessed. "GE-FREELEC" / "GE Free Elective" is just the long-form name for "GE-FEL",
     * which is the real code and has no numbered variants at all: a trailing number (as in "GE-FREELEC 2")
     * is a slot number in the curriculum, not part of the searchable code, so it is dropped, not carried over.
     * Keys are normalised (letters/digits only, uppercased) so hyphen/space variants all match the same way.
     */
    private static final Map<String, String> FAMILY_ALIASES = Map.of(
            "GEFREELEC", "GE-FEL",
            "GEFREEELEC", "GE-FEL",
            // GE-FEL itself, typed directly with a number, still needs the number stripped for the same reason.
            "GEFEL", "GE-FEL");

    /** Resolves a known family alias (ignoring any trailing slot number) to what ISMIS actually searches by;
     * an unrecognised query is returned unchanged. */
    static String resolveAlias(String query) {
        String trimmed = query.trim();
        var m = TRAILING_NUMBER.matcher(trimmed);
        String family = m.matches() ? m.group(1).trim() : trimmed;
        String normalised = family.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        String alias = FAMILY_ALIASES.get(normalised);
        return alias != null ? alias : query;
    }

    private void purgeOldJobs() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(1));
        jobs.values().removeIf(j -> j.terminal() && j.createdAt.isBefore(cutoff));
    }

    @PreDestroy
    void shutdown() {
        workers.shutdownNow();
        watchdog.shutdownNow();
    }
}
