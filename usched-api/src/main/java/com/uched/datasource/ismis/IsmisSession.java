package com.uched.datasource.ismis;

import com.uched.domain.exception.IsmisChallengeException;
import com.uched.domain.exception.IsmisUnavailableException;
import com.uched.domain.exception.ScraperException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Owns the HTTP client and cookies for one scrape. Strictly read-only: every request is a GET
 * to an allowlisted path, except the single login POST. Redirects are followed manually and are
 * held to the same rules. Nothing here logs URLs, bodies or cookies.
 */
public final class IsmisSession implements AutoCloseable {
    private static final int MAX_REDIRECTS = 5;

    private final IsmisConfig config;
    private final URI base;
    private final HttpClient client;
    private long lastRequestAt;

    IsmisSession(IsmisConfig config) {
        this.config = config;
        this.base = URI.create(config.getBaseUrl());
        this.client = HttpClient.newBuilder()
                .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
                .followRedirects(HttpClient.Redirect.NEVER)
                .connectTimeout(Duration.ofSeconds(config.getRequestTimeoutSeconds()))
                .build();
    }

    /** The one write-like call permitted: posting the sign-in form to the login path. */
    String postLogin(Map<String, String> form) {
        String body = form.entrySet().stream()
                .map(e -> enc(e.getKey()) + "=" + enc(e.getValue()))
                .collect(Collectors.joining("&"));
        return request("POST", config.getLoginPath(), body).body();
    }

    /**
     * The second permitted POST: the read-only term search. Only the configured search path is accepted,
     * whatever the page's form claims as its action.
     */
    String postSearch(String actionPathAndQuery, Map<String, String> form) {
        String body = form.entrySet().stream()
                .map(e -> enc(e.getKey()) + "=" + enc(e.getValue()))
                .collect(Collectors.joining("&"));
        return request("POST", actionPathAndQuery, body).body();
    }

    String get(String pathAndQuery) {
        return get(pathAndQuery, false);
    }

    /** GET as the page's own JavaScript would (X-Requested-With), used for partials the page loads by AJAX. */
    String getAjax(String pathAndQuery) {
        return get(pathAndQuery, true);
    }

    private String get(String pathAndQuery, boolean ajax) {
        String path = pathAndQuery;
        for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
            HttpResponse<String> res = request("GET", path, null, ajax);
            if (res.statusCode() >= 300 && res.statusCode() < 400) {
                String location = res.headers().firstValue("Location").orElse(null);
                if (location == null) {
                    throw new IsmisUnavailableException("ISMIS sent an invalid redirect.");
                }
                path = toLocalPath(base.resolve(URI.create(path)).resolve(location));
                continue;
            }
            return res.body();
        }
        throw new IsmisUnavailableException("ISMIS redirected too many times.");
    }

    /** Visible to tests: all traffic funnels through here so the read-only rules are enforced once. */
    HttpResponse<String> request(String method, String pathAndQuery, String body) {
        return request(method, pathAndQuery, body, false);
    }

    private HttpResponse<String> request(String method, String pathAndQuery, String body, boolean ajax) {
        URI uri = base.resolve(pathAndQuery);
        if (!sameHost(uri)) {
            throw new ScraperException("Blocked: request leaves the configured ISMIS host.");
        }
        String path = uri.getPath() == null ? "" : uri.getPath();
        boolean isLoginPost = "POST".equals(method) && path.equalsIgnoreCase(config.getLoginPath());
        boolean isSearchPost = "POST".equals(method) && !config.getSearchPath().isBlank()
                && path.equalsIgnoreCase(config.getSearchPath());
        if (!("GET".equals(method) || isLoginPost || isSearchPost)) {
            throw new ScraperException("Blocked: only GET, the login POST and the term search POST are permitted.");
        }
        if (!isAllowedPath(path)) {
            throw new ScraperException("Blocked: path is not on the read-only allowlist.");
        }
        pause();
        HttpRequest.Builder b = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(config.getRequestTimeoutSeconds()))
                .header("User-Agent", config.getUserAgent());
        if (isLoginPost || isSearchPost) {
            b.header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body));
        } else {
            b.GET();
        }
        if (isSearchPost || ajax) {
            b.header("X-Requested-With", "XMLHttpRequest");
        }
        try {
            HttpResponse<String> res = client.send(b.build(), HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 500) {
                throw new IsmisUnavailableException("ISMIS is not responding correctly.");
            }
            rejectChallenge(res.body());
            return res;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IsmisUnavailableException("The ISMIS request was interrupted.");
        } catch (IOException e) {
            throw new IsmisUnavailableException("Could not reach ISMIS.");
        }
    }

    private boolean isAllowedPath(String path) {
        String p = path.toLowerCase(Locale.ROOT);
        if (p.equals(config.getLoginPath().toLowerCase(Locale.ROOT))
                || p.startsWith(config.getOfferedCoursesPath().toLowerCase(Locale.ROOT))
                || (!config.getSearchPath().isBlank() && p.equals(config.getSearchPath().toLowerCase(Locale.ROOT)))) {
            return true;
        }
        if (!config.getLogoutPath().isBlank() && p.equals(config.getLogoutPath().toLowerCase(Locale.ROOT))) {
            return true;
        }
        if (!config.getProspectusPath().isBlank() && p.equals(config.getProspectusPath().toLowerCase(Locale.ROOT))) {
            return true;
        }
        return config.getAllowedPathPrefixes().stream().anyMatch(a -> p.startsWith(a.toLowerCase(Locale.ROOT)));
    }

    private boolean sameHost(URI uri) {
        return uri.getHost() != null && uri.getHost().equalsIgnoreCase(base.getHost())
                && uri.getPort() == base.getPort();
    }

    private String toLocalPath(URI target) {
        if (!sameHost(target)) {
            throw new ScraperException("Blocked: redirect leaves the configured ISMIS host.");
        }
        return target.getRawPath() + (target.getRawQuery() == null ? "" : "?" + target.getRawQuery());
    }

    /** Stop, never solve: a CAPTCHA or one-time-code page ends the scrape. */
    static void rejectChallenge(String html) {
        if (html == null || html.isEmpty()) {
            return;
        }
        Document doc = Jsoup.parse(html);
        boolean challenge = !doc.select(".g-recaptcha, .h-captcha, [data-sitekey], iframe[src*=captcha], "
                + "input[name~=(?i)(captcha|^otp|totp|verification[_-]?code|two[_-]?factor)]").isEmpty()
                || doc.text().toLowerCase().contains("verification code");
        if (challenge) {
            throw new IsmisChallengeException("ISMIS asked for a CAPTCHA or verification code.");
        }
    }

    private void pause() {
        long wait = config.getMinDelayMs() - (System.currentTimeMillis() - lastRequestAt);
        if (lastRequestAt != 0 && wait > 0) {
            try {
                Thread.sleep(wait);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IsmisUnavailableException("The ISMIS request was interrupted.");
            }
        }
        lastRequestAt = System.currentTimeMillis();
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    @Override
    public void close() {
        client.close();
    }
}
