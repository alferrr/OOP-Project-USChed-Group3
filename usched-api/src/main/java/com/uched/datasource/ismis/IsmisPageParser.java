package com.uched.datasource.ismis;

import com.uched.domain.exception.IsmisLayoutChangedException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pure functions: HTML in, data out. No network.
 * Written against the real "Course Schedule Offered" page (table.table-forum) and its search form.
 */
@Component
public class IsmisPageParser {
    private static final Map<String, String> HEADERS = new HashMap<>();
    private static final Pattern PAGE_OF = Pattern.compile("Page\\s+(\\d+)\\s+of\\s+(\\d+)", Pattern.CASE_INSENSITIVE);

    static {
        alias("code", "coursecode", "code", "subjectcode", "subject");
        alias("title", "coursedescription", "coursetitle", "coursename", "title", "description");
        alias("status", "coursestatus", "status");
        alias("teachers", "teachers", "teacher", "instructor", "instructors", "faculty");
        alias("schedule", "schedule", "daystime", "daytime", "time");
        alias("enrolled", "enrolledstudents", "enrolled", "slots");
    }

    private static void alias(String key, String... names) {
        for (String n : names) {
            HEADERS.put(n, key);
        }
    }

    private static String normalise(String header) {
        return header.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    /**
     * A real, empty search result from ISMIS isn't an empty table — it's a short snippet with no table in it
     * at all (an ajax fragment like "no records found"), well under a real results page's size. Anything that
     * short with no table is treated as "nothing matched", not a layout change; anything bigger with no table
     * genuinely means the page no longer looks like what USChed expects.
     */
    private static final int NO_TABLE_MEANS_EMPTY_UNDER_CHARS = 500;

    /** Rows of the results table; empty if the table is present but the search matched nothing, or ISMIS's
     * whole response was a short "no results" snippet with no table at all. */
    public List<IsmisRawCourse> parse(String html) {
        Document doc = Jsoup.parse(html == null ? "" : html);
        for (Element table : doc.select("table")) {
            Map<String, Integer> cols = mapHeader(table);
            if (cols.containsKey("code") && cols.containsKey("schedule")) {
                return readRows(table, cols); // may be empty: the search simply matched nothing
            }
        }
        if (html == null || html.trim().length() < NO_TABLE_MEANS_EMPTY_UNDER_CHARS) {
            return List.of();
        }
        throw new IsmisLayoutChangedException("Could not find the offered-courses table.");
    }

    public record Prospectus(String programName, String effectiveYear, List<ProspectusCourse> courses) {
    }

    private static final java.util.regex.Pattern PROSPECTUS_HEADER =
            java.util.regex.Pattern.compile("(?i)(.+?)\\s*Year Level:\\s*(\\d+)\\s*$");

    /**
     * The student's degree-program curriculum: one h4 header ("1ST Semester / Year Level: 1", or
     * "Summer / Year Level: 1") followed by its table, repeated for the whole program.
     */
    public Prospectus parseProspectus(String html) {
        Document doc = Jsoup.parse(html == null ? "" : html);
        String programName = text(doc.selectFirst("h3"));
        String effectiveYear = null;
        java.util.regex.Matcher ey = java.util.regex.Pattern.compile("(?i)Effective Year:\\s*(\\S+)").matcher(doc.text());
        if (ey.find()) {
            effectiveYear = ey.group(1);
        }

        List<ProspectusCourse> courses = new ArrayList<>();
        for (Element h4 : doc.select("h4")) {
            java.util.regex.Matcher m = PROSPECTUS_HEADER.matcher(h4.text().trim());
            if (!m.matches()) {
                continue;
            }
            com.uched.domain.value.Semester sem = parseProspectusSemester(m.group(1).trim());
            int yearLevel = Integer.parseInt(m.group(2));
            if (sem == null) {
                continue;
            }
            Element table = h4.parent() == null ? null : h4.parent().nextElementSibling();
            if (table == null || !"table".equalsIgnoreCase(table.tagName())) {
                continue;
            }
            for (Element tr : table.select("tbody tr")) {
                Elements tds = tr.select("td");
                if (tds.size() < 3) {
                    continue;
                }
                String code = tds.get(0).text().trim();
                String title = tds.get(1).text().trim();
                String unitsText = tds.get(2).text().trim();
                if (code.isEmpty() || !unitsText.matches("\\d+(\\.\\d+)?")) {
                    continue;
                }
                String requisite = tds.size() > 4 ? requisiteNote(tds.get(4)) : "";
                courses.add(new ProspectusCourse(yearLevel, sem, code, title, Double.parseDouble(unitsText), requisite));
            }
        }
        if (courses.isEmpty()) {
            throw new IsmisLayoutChangedException("No prospectus entries were found on the ISMIS page ("
                    + describeStructure(html) + ").");
        }
        return new Prospectus(programName, effectiveYear, courses);
    }

    private static com.uched.domain.value.Semester parseProspectusSemester(String label) {
        String l = label.toUpperCase(Locale.ROOT);
        if (l.startsWith("SUMMER")) {
            return com.uched.domain.value.Semester.SUMMER;
        }
        if (l.contains("1ST")) {
            return com.uched.domain.value.Semester.FIRST;
        }
        if (l.contains("2ND")) {
            return com.uched.domain.value.Semester.SECOND;
        }
        return null;
    }

    /** Joins the requisite cell's spans, dropping blank ones, into one readable line (e.g. "PREREQUISITE CIS 1204"). */
    private static String requisiteNote(Element cell) {
        List<String> parts = new ArrayList<>();
        for (Element span : cell.select("span")) {
            String t = span.text().replace('\u00a0', ' ').trim().replaceAll(",$", "");
            if (!t.isEmpty()) {
                parts.add(t);
            }
        }
        return String.join(" ", parts);
    }

    private static String text(Element e) {
        return e == null ? "" : e.text().trim();
    }

    /** Href of the first element matching the selector, or null. */
    public String linkHref(String html, String cssSelector) {
        Element a = Jsoup.parse(html == null ? "" : html).selectFirst(cssSelector);
        return a == null || a.attr("href").isBlank() ? null : a.attr("href");
    }

    /**
     * A structure-only summary for error messages (form ids, table column headings, sign-in form present).
     * Never includes cell contents, values, or page text, so it is safe to show and log.
     */
    public String describeStructure(String html) {
        Document doc = Jsoup.parse(html == null ? "" : html);
        List<String> forms = new ArrayList<>();
        for (Element f : doc.select("form")) {
            forms.add(f.id().isBlank() ? "(no id)" : f.id());
        }
        List<String> tables = new ArrayList<>();
        for (Element t : doc.select("table")) {
            Element head = t.selectFirst("tr");
            List<String> cols = new ArrayList<>();
            if (head != null) {
                head.select("th, td").stream().limit(12).forEach(c -> cols.add(c.text().replaceAll("\\s+", " ").trim()));
            }
            tables.add(cols.toString());
            if (tables.size() >= 3) {
                break;
            }
        }
        boolean signIn = !doc.select("input[type=password]").isEmpty();
        return "page has " + (html == null ? 0 : html.length()) + " chars; forms=" + forms + "; tables=" + tables
                + "; signInForm=" + signIn;
    }

    /** {current, total} from "Page 1 of 3"; {1, 1} when the text is absent. */
    public int[] pageInfo(String html) {
        Matcher m = PAGE_OF.matcher(Jsoup.parse(html == null ? "" : html).text());
        return m.find() ? new int[]{Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2))} : new int[]{1, 1};
    }

    /**
     * Hidden inputs (e.g. ASP.NET's __RequestVerificationToken) of the sign-in form, i.e. the form that
     * contains the password field. They must be echoed back with the login POST.
     */
    public Map<String, String> loginFormHiddenFields(String html, String passwordField) {
        Map<String, String> fields = new LinkedHashMap<>();
        Element form = Jsoup.parse(html == null ? "" : html).selectFirst("form:has(input[name=" + passwordField + "])");
        if (form != null) {
            for (Element input : form.select("input[type=hidden][name]")) {
                fields.put(input.attr("name"), input.attr("value"));
            }
        }
        return fields;
    }

    /** Every named field of a form with its current value (hidden inputs, text inputs, selects). */
    public Map<String, String> formFields(String html, String formSelector) {
        Map<String, String> fields = new LinkedHashMap<>();
        Element form = Jsoup.parse(html == null ? "" : html).selectFirst(formSelector);
        if (form == null) {
            return fields;
        }
        for (Element e : form.select("input[name], select[name], textarea[name]")) {
            String type = e.attr("type").toLowerCase(Locale.ROOT);
            if (e.tagName().equals("select")) {
                Element chosen = e.selectFirst("option[selected]");
                if (chosen == null) {
                    chosen = e.selectFirst("option");
                }
                fields.put(e.attr("name"), chosen == null ? "" : chosen.attr("value"));
            } else if (type.equals("checkbox") || type.equals("radio")) {
                if (e.hasAttr("checked")) {
                    fields.put(e.attr("name"), e.hasAttr("value") ? e.attr("value") : "on");
                }
            } else if (!type.equals("submit") && !type.equals("button")) {
                fields.put(e.attr("name"), e.attr("value"));
            }
        }
        return fields;
    }

    /** The form's action (path and query), or null if the form is missing. */
    public String formAction(String html, String formSelector) {
        Element form = Jsoup.parse(html == null ? "" : html).selectFirst(formSelector);
        return form == null || form.attr("action").isBlank() ? null : form.attr("action");
    }

    private Map<String, Integer> mapHeader(Element table) {
        Map<String, Integer> cols = new HashMap<>();
        Element headerRow = table.selectFirst("tr");
        if (headerRow == null) {
            return cols;
        }
        Elements cells = headerRow.select("th, td");
        for (int i = 0; i < cells.size(); i++) {
            String key = HEADERS.get(normalise(cells.get(i).text()));
            if (key != null) {
                cols.putIfAbsent(key, i);
            }
        }
        return cols;
    }

    private List<IsmisRawCourse> readRows(Element table, Map<String, Integer> cols) {
        List<IsmisRawCourse> rows = new ArrayList<>();
        Elements trs = table.select("tbody tr, tr");
        int n = 0;
        for (Element tr : trs) {
            n++;
            Elements tds = tr.children().select("td");
            if (tds.size() < 2 || tds.stream().allMatch(td -> td.text().isBlank()) || tds.size() == 1) {
                continue;
            }
            if (tr.parent() != null && tr.parent().tagName().equals("tfoot")) {
                continue;
            }
            rows.add(new IsmisRawCourse(n, text(tds, cols, "code"), text(tds, cols, "title"),
                    text(tds, cols, "status"), lines(tds, cols, "teachers", false),
                    lines(tds, cols, "schedule", true), text(tds, cols, "enrolled")));
        }
        return rows;
    }

    private String text(Elements tds, Map<String, Integer> cols, String key) {
        Integer i = cols.get(key);
        return i == null || i >= tds.size() ? null : tds.get(i).text().trim().replaceAll("\\s+", " ");
    }

    /** Cell content split into lines: one per <span> (schedule) or per <br> (teachers). */
    private List<String> lines(Elements tds, Map<String, Integer> cols, String key, boolean bySpan) {
        Integer i = cols.get(key);
        if (i == null || i >= tds.size()) {
            return List.of();
        }
        Element cell = tds.get(i).clone();
        List<String> out = new ArrayList<>();
        if (bySpan && !cell.select("span").isEmpty()) {
            for (Element span : cell.select("span")) {
                addLine(out, span.text());
            }
            return out;
        }
        for (Element br : cell.select("br")) {
            br.replaceWith(new TextNode("\n"));
        }
        for (String line : cell.wholeText().split("\n")) {
            addLine(out, line);
        }
        return out;
    }

    private static void addLine(List<String> out, String raw) {
        String line = raw.replace(' ', ' ').trim().replaceAll("\\s+", " ");
        if (!line.isEmpty()) {
            out.add(line);
        }
    }
}
