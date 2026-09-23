package com.uched.datasource.ismis;

import com.uched.domain.exception.IsmisAuthenticationException;
import com.uched.domain.exception.IsmisLayoutChangedException;
import com.uched.domain.exception.IsmisNoResultsException;
import com.uched.domain.exception.IsmisNotConfiguredException;
import com.uched.domain.exception.IsmisSessionExpiredException;
import com.uched.domain.model.Course;
import com.uched.domain.value.Semester;
import org.jsoup.Jsoup;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * A signed-in ISMIS session that can run several read-only course searches. It holds cookies only:
 * the credentials are read once, during {@link #signIn}, and are never kept here. The caller decides how
 * long the connection lives and must close it (which also logs out, best effort).
 */
public final class IsmisConnection implements AutoCloseable {

    public record SearchResult(List<Course> courses, List<String> skipped) {
    }

    private final IsmisConfig config;
    private final IsmisPageParser parser;
    private final IsmisSession session;
    private boolean closed;
    private IsmisPageParser.Prospectus prospectus;

    private IsmisConnection(IsmisConfig config, IsmisPageParser parser, IsmisSession session) {
        this.config = config;
        this.parser = parser;
        this.session = session;
    }

    /**
     * Signs in and verifies the session works. The caller keeps ownership of (and closes) the credentials.
     */
    public static IsmisConnection signIn(IsmisConfig config, IsmisPageParser parser, IsmisCredentials credentials) {
        if (!config.isConfigured()) {
            throw new IsmisNotConfiguredException("Live ISMIS sync is not set up on this server yet.");
        }
        IsmisConnection c = new IsmisConnection(config, parser, new IsmisSession(config));
        try {
            c.login(credentials);
            c.openSearchPage(true); // proves the credentials worked before we report success
            return c;
        } catch (RuntimeException e) {
            c.close();
            throw e;
        }
    }

    /** ISMIS's offered-courses table has no units column, so callers must not trust the units in results. */
    public boolean providesUnits() {
        return false;
    }

    /**
     * The student's own degree-program curriculum (not what is offered this term). Fetched once per
     * connection and cached, since it does not change while the student is signed in.
     */
    public synchronized IsmisPageParser.Prospectus prospectus() {
        if (closed) {
            throw new IsmisSessionExpiredException("The ISMIS session has ended. Please sign in again.");
        }
        if (prospectus == null) {
            if (config.getProspectusPath().isBlank()) {
                throw new IsmisNotConfiguredException("The ISMIS prospectus page is not set up on this server yet.");
            }
            String html = session.get(config.getProspectusPath());
            if (showsSignInForm(html)) {
                throw new IsmisSessionExpiredException("Your ISMIS session has ended. Please sign in again.");
            }
            prospectus = parser.parseProspectus(html);
        }
        return prospectus;
    }

    /** Runs one term search (read-only) and returns the validated courses. */
    public synchronized SearchResult search(Semester semester, String academicYear, String query) {
        if (closed) {
            throw new IsmisSessionExpiredException("The ISMIS session has ended. Please sign in again.");
        }
        String index = openSearchPage(false);
        String formHtml = index;
        Map<String, String> form = parser.formFields(formHtml, config.getSearchFormSelector());
        if (form.isEmpty()) {
            // The page may load its filter form by AJAX; follow the link it uses, as its own script would.
            String filterLink = parser.linkHref(index, "a[href*=OfferedCoursesFilter]");
            if (filterLink != null) {
                formHtml = session.getAjax(filterLink);
                form = parser.formFields(formHtml, config.getSearchFormSelector());
            }
        }
        String action = parser.formAction(formHtml, config.getSearchFormSelector());
        if (form.isEmpty() || action == null) {
            throw new IsmisLayoutChangedException("The term search form was not found on the ISMIS page ("
                    + parser.describeStructure(formHtml) + ").");
        }
        form.put(config.getAcademicPeriodField(), academicPeriod(semester));
        form.put(config.getAcademicYearField(), startYear(academicYear));
        form.put(config.getCoursesField(), query);

        String html = session.postSearch(action, form);
        if (showsSignInForm(html)) {
            throw new IsmisSessionExpiredException("Your ISMIS session has ended. Please sign in again.");
        }
        List<IsmisRawCourse> all;
        try {
            all = new ArrayList<>(parser.parse(html));
        } catch (IsmisLayoutChangedException e) {
            throw new IsmisLayoutChangedException(e.getMessage() + " (" + parser.describeStructure(html) + ")");
        }
        if (all.isEmpty()) {
            throw new IsmisNoResultsException("ISMIS has no courses matching \"" + query + "\" for this term.");
        }

        List<String> notes = new ArrayList<>();
        int[] pages = parser.pageInfo(html);
        if (pages[1] > 1) {
            int fetchThrough = Math.min(pages[1], config.getMaxPages());
            for (int p = 2; p <= fetchThrough; p++) {
                all.addAll(parser.parse(session.get(pageUrl(semester, academicYear, query, p))));
            }
            if (fetchThrough < pages[1]) {
                notes.add("Only pages 1-" + fetchThrough + " of " + pages[1]
                        + " were fetched; results may be incomplete. Search a more specific code to see the rest.");
            }
        }

        IsmisCourseMapper.Result mapped = new IsmisCourseMapper()
                .map(all, semester, academicYear, config.getDefaultCampus(), config.getDefaultUnits());
        if (mapped.courses().isEmpty()) {
            throw new IsmisLayoutChangedException("No usable courses were found on the ISMIS page.");
        }
        List<String> skipped = new ArrayList<>(mapped.skipped());
        skipped.addAll(notes);
        return new SearchResult(mapped.courses(), skipped);
    }

    /**
     * Page 2+ of the same search, built from our own field names and values rather than a scraped href:
     * ISMIS's pagination widget only shows a window of nearby page numbers (plus first/last), so most pages
     * have no visible link to follow. The GET form of the same action recognises the same field names as the
     * search POST, per ASP.NET MVC model binding.
     */
    private String pageUrl(Semester semester, String academicYear, String query, int page) {
        return config.getSearchPath() + "?"
                + enc(config.getAcademicPeriodField()) + "=" + enc(academicPeriod(semester))
                + "&" + enc(config.getAcademicYearField()) + "=" + enc(startYear(academicYear))
                + "&" + enc(config.getCoursesField()) + "=" + enc(query)
                + "&page=" + page;
    }

    private static String enc(String s) {
        return java.net.URLEncoder.encode(s, java.nio.charset.StandardCharsets.UTF_8);
    }

    private void login(IsmisCredentials credentials) {
        // GET the sign-in page first: it sets the anti-forgery cookie and carries the matching hidden token.
        String loginPage = session.get(config.getLoginPath());
        Map<String, String> form = new LinkedHashMap<>(
                parser.loginFormHiddenFields(loginPage, config.getPasswordField()));
        form.put(config.getUsernameField(), credentials.username());
        form.put(config.getPasswordField(), new String(credentials.password()));
        session.postLogin(form);
        form.clear();
    }

    /** Opens the search page. A sign-in form here means: bad credentials (verifying) or an ended session. */
    private String openSearchPage(boolean verifying) {
        String index = session.get(config.getOfferedCoursesPath());
        if (showsSignInForm(index)) {
            if (verifying) {
                throw new IsmisAuthenticationException("ISMIS rejected the credentials.");
            }
            throw new IsmisSessionExpiredException("Your ISMIS session has ended. Please sign in again.");
        }
        return index;
    }

    private boolean showsSignInForm(String html) {
        return !Jsoup.parse(html == null ? "" : html).select("input[name=" + config.getPasswordField() + "]").isEmpty();
    }

    /** ISMIS's "Academic Period" option values. */
    static String academicPeriod(Semester semester) {
        return switch (semester) {
            case FIRST -> "FIRST_SEMESTER";
            case SECOND -> "SECOND_SEMESTER";
            case SUMMER -> "SUMMER";
        };
    }

    /** "2026-2027" is offered as the single year "2026". */
    static String startYear(String academicYear) {
        int dash = academicYear.indexOf('-');
        return dash < 0 ? academicYear : academicYear.substring(0, dash);
    }

    @Override
    public synchronized void close() {
        if (closed) {
            return;
        }
        closed = true;
        if (!config.getLogoutPath().isBlank()) {
            try {
                session.get(config.getLogoutPath());
            } catch (RuntimeException ignored) {
                // Best effort: the session is discarded either way.
            }
        }
        session.close();
    }
}
