package com.uched.support;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** A local stand-in for ISMIS serving fixture HTML. Automated tests never touch the real ISMIS. */
public class FakeIsmis implements AutoCloseable {
    public enum Mode { NORMAL, CAPTCHA, LAYOUT_CHANGED, DOWN, SLOW, EVIL_ACTION, FILTER_VIA_AJAX }

    private static final String CAPTCHA = "<div class=\"g-recaptcha\" data-sitekey=\"x\"></div>";
    private final HttpServer server;
    private final List<String> hits = Collections.synchronizedList(new ArrayList<>());
    private final List<String> bodies = Collections.synchronizedList(new ArrayList<>());
    public volatile String acceptedPassword = "correct-horse";
    public volatile Mode mode = Mode.NORMAL;
    private volatile int epoch = 1;

    /** Invalidates every signed-in session, like ISMIS timing users out. */
    public void expireSessions() {
        epoch++;
    }

    public long loginPosts() {
        return hits().stream().filter("POST /login"::equals).count();
    }

    public FakeIsmis() {
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
        server.createContext("/", this::handle);
        server.start();
    }

    public String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    public List<String> hits() {
        return List.copyOf(hits);
    }

    public List<String> bodies() {
        return List.copyOf(bodies);
    }

    private void handle(HttpExchange ex) throws IOException {
        String path = ex.getRequestURI().getPath();
        String rawQuery = ex.getRequestURI().getRawQuery();
        hits.add(ex.getRequestMethod() + " " + path + (rawQuery == null || rawQuery.isEmpty() ? "" : "?" + rawQuery));
        String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        if (!body.isEmpty()) {
            bodies.add(body);
        }
        if (mode == Mode.DOWN) {
            send(ex, 503, "down");
            return;
        }
        switch (path) {
            case "/login" -> login(ex, body);
            case "/offered" -> offered(ex);
            case "/search" -> search(ex, paramsOf(ex, body));
            case "/CourseSchedule/OfferedCoursesFilter" -> filterPartial(ex);
            case "/prospectus" -> prospectus(ex);
            case "/logout" -> send(ex, 200, "bye");
            case "/home" -> send(ex, 200, "<html><body>home</body></html>");
            default -> send(ex, 404, "not found");
        }
    }

    private void login(HttpExchange ex, String body) throws IOException {
        if ("POST".equals(ex.getRequestMethod())) {
            Map<String, String> form = parse(body);
            if (mode != Mode.CAPTCHA && acceptedPassword.equals(form.get("pass")) && "tok-123".equals(form.get("__RequestVerificationToken"))) {
                ex.getResponseHeaders().add("Set-Cookie", "sid=ok-" + epoch + "; Path=/");
                ex.getResponseHeaders().add("Location", "/home");
                send(ex, 302, "");
                return;
            }
        }
        send(ex, 200, loginPage());
    }

    private boolean loggedIn(HttpExchange ex) {
        String cookie = ex.getRequestHeaders().getFirst("Cookie");
        if (cookie == null) {
            return false;
        }
        for (String part : cookie.split(";")) {
            if (part.trim().equals("sid=ok-" + epoch)) {
                return true;
            }
        }
        return false;
    }

    /** The search page: the real form (fixture) with a fresh token. */
    private void offered(HttpExchange ex) throws IOException {
        if (!loggedIn(ex)) {
            ex.getResponseHeaders().add("Location", "/login");
            send(ex, 302, "");
            return;
        }
        if (mode == Mode.SLOW) {
            try {
                Thread.sleep(4000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
        if (mode == Mode.LAYOUT_CHANGED) {
            send(ex, 200, "<html><body><div>We redesigned everything</div></body></html>");
            return;
        }
        if (mode == Mode.FILTER_VIA_AJAX) {
            send(ex, 200, "<html><body><a class=\"rs-ajax green\" data-ajax-targetid=\"OfferedCourseFilter\" "
                    + "href=\"/CourseSchedule/OfferedCoursesFilter\">set term</a><div id=\"OfferedCourseFilter\"></div></body></html>");
            return;
        }
        String html = searchFormHtml();
        send(ex, 200, html);
    }

    private String searchFormHtml() throws IOException {
        String html = Files.readString(Path.of("src/test/resources/fixtures/search-form.html"))
                .replace("SANITIZED-TOKEN", "srch-456");
        return html.replace("/CourseSchedule/CourseScheduleOffered?Length=14",
                mode == Mode.EVIL_ACTION ? "/enroll" : "/search?Length=14");
    }

    /** The filter partial the real page loads by AJAX: only returned when asked the way its own script asks. */
    private void filterPartial(HttpExchange ex) throws IOException {
        boolean ajax = "XMLHttpRequest".equals(ex.getRequestHeaders().getFirst("X-Requested-With"));
        send(ex, 200, loggedIn(ex) && ajax ? searchFormHtml() : "<html><body>full page, no form</body></html>");
    }

    /**
     * The term search. Page 1 needs the session, the anti-forgery token, and the right term values; page 2+
     * (a GET, since that is how ISMIS's own pagination links work) is checked the same way except the token,
     * which real ISMIS pagination links do not carry either.
     */
    private void search(HttpExchange ex, Map<String, String> form) throws IOException {
        boolean isPost = "POST".equals(ex.getRequestMethod());
        boolean tokenOk = !isPost || "srch-456".equals(form.get("__RequestVerificationToken"));
        boolean ok = loggedIn(ex) && tokenOk
                && "FIRST_SEMESTER".equals(form.get("AcademicPeriod"))
                && "2026".equals(form.get("AcademicYear"));
        if (!ok) {
            send(ex, 200, "<div>No results</div>");
            return;
        }
        String query = form.getOrDefault("Courses", "").toLowerCase();
        String page = form.getOrDefault("page", "1");

        if (query.equals("ge-fel")) {
            // Confirms real elective offerings under GE-FEL collapse into one course with several sections.
            send(ex, 200, Files.readString(Path.of("src/test/resources/fixtures/offered-gefel.html")));
            return;
        }
        if (query.equals("many")) {
            // A real multi-page search: three distinct pages, aggregated by the caller.
            String file = switch (page) {
                case "2" -> "offered-paged-p2.html";
                case "3" -> "offered-paged-p3.html";
                default -> "offered-paged-p1.html";
            };
            send(ex, 200, Files.readString(Path.of("src/test/resources/fixtures/" + file)));
            return;
        }

        // "shortnomatch" mimics the real ISMIS shape for a genuinely empty search: a short ajax fragment with
        // no table at all (see IsmisPageParser.NO_TABLE_MEANS_EMPTY_UNDER_CHARS), as opposed to "nomatch"
        // below, the other real shape: a full results table with a header and no data rows.
        if (query.equals("shortnomatch")) {
            send(ex, 200, "<div class=\"row\" id=\"CourseScheduleOfferedList\"></div>");
            return;
        }
        String results = Files.readString(Path.of("src/test/resources/fixtures/offered.html"));
        if (query.equals("nomatch")) {
            results = results.replaceAll("(?s)<tbody>.*?</tbody>", "<tbody><tr><td colspan=\"100\"></td></tr></tbody>");
        }
        send(ex, 200, results);
    }

    /** The student's degree-program curriculum: a fixed page, same for every request once signed in. */
    private void prospectus(HttpExchange ex) throws IOException {
        if (!loggedIn(ex)) {
            ex.getResponseHeaders().add("Location", "/login");
            send(ex, 302, "");
            return;
        }
        if (mode == Mode.LAYOUT_CHANGED) {
            send(ex, 200, "<html><body><div>We redesigned everything</div></body></html>");
            return;
        }
        send(ex, 200, Files.readString(Path.of("src/test/resources/fixtures/prospectus.html")));
    }

    /** GET requests (pagination) carry their params in the query string; POST requests carry them in the body. */
    private static Map<String, String> paramsOf(HttpExchange ex, String body) {
        return "GET".equals(ex.getRequestMethod()) ? parse(ex.getRequestURI().getRawQuery()) : parse(body);
    }

    private String loginPage() {
        return "<html><body><form method=\"post\" action=\"/login\">"
                + "<input type=\"hidden\" name=\"__RequestVerificationToken\" value=\"tok-123\"/>"
                + "<input name=\"user\"/><input type=\"password\" name=\"pass\"/></form>"
                + (mode == Mode.CAPTCHA ? CAPTCHA : "") + "</body></html>";
    }

    private static void send(HttpExchange ex, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "text/html; charset=utf-8");
        ex.sendResponseHeaders(status, status == 302 ? -1 : bytes.length);
        if (status != 302) {
            ex.getResponseBody().write(bytes);
        }
        ex.close();
    }

    private static Map<String, String> parse(String body) {
        Map<String, String> m = new HashMap<>();
        if (body == null || body.isEmpty()) {
            return m;
        }
        for (String pair : body.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                m.put(URLDecoder.decode(kv[0], StandardCharsets.UTF_8), URLDecoder.decode(kv[1], StandardCharsets.UTF_8));
            }
        }
        return m;
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
