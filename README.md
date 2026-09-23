# USChed

Course-enrollment **schedule planner** for University of San Carlos students. It never enrolls, drops or changes anything in ISMIS. Full design: [USChed-overview.md](USChed-overview.md).

| Folder | What |
|---|---|
| `usched-api/` | Java 21, Spring Boot 3, Maven, MySQL (Flyway). Framework-free `domain/` and `engine/` (ArchUnit-enforced). |
| `usched/` | React + TypeScript + Vite + Tailwind (green / gold / white theme). |

## Run locally

```bash
# 1. Database: your local MySQL (root, no password) works; the "uched" database is created for you.
#    (Or use Docker instead: docker compose up -d mysql, then use port 3307 below.)

# 2. API on :8080 (starts with an empty catalog; courses arrive from your ISMIS searches)
export JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=$JAVA_HOME/bin:$PATH
cd usched-api
DB_URL='jdbc:mysql://localhost:3306/uched?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC' \
DB_USER=root DB_PASSWORD= \
mvn spring-boot:run
#   Swagger UI: http://localhost:8080/swagger-ui.html

# Easiest: ./start-uched.command does steps 1-3 for you.

# 3. Frontend on :5173 (proxies /api to :8080; override with VITE_API_PROXY)
cd ../usched && npm install && npm run dev
```

Tests: `cd usched-api && mvn test` and `cd usched && npm test`.

## Configuration (environment variables)

| Variable | Purpose |
|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | MySQL connection |
| `UCHED_CONSENT_SECRET`, `UCHED_IP_SALT` | **Set both outside local dev.** HMAC key for consent tokens; salt for IP hashes |
| `UCHED_ADMIN_TOKEN` | Enables `POST /api/admin/import` (CSV) via `X-Admin-Token`; blank = disabled |
| `UCHED_CORS_ORIGINS` | Allowed browser origins (default `http://localhost:5173`) |
| `UCHED_REQUIRE_HTTPS` | `true` rejects plain HTTP on `/api/ismis/**` |
| `UCHED_ISMIS_*` | Base URL, paths and form-field names for the live scrape (see below) |

## Private per-student catalog

Course data is **private to each student**, keyed by their ISMIS ID number (the username they sign in with) —
not a shared, institution-wide catalog. A student's fetched courses, sections, generated schedules and catalog
status are all invisible to every other student. Instructors and rooms are the one exception: shared reference
facts (who teaches, which room), not treated as anyone's private data.

- **Identity:** established once, at ISMIS sign-in — ISMIS accepting the login is what proves the ID number is
  genuinely theirs. The `X-Ismis-Session` header (an unguessable random id, not the ID number itself) then
  carries that identity on every request; `StudentCatalogFilter` resolves it for `/api/courses/**`,
  `/api/schedules/**`, `/api/meta/**` and `/api/catalog/**`.
- **Admin CSV import** (`/api/admin/import`) now also takes a `studentIdNumber` parameter, since it has to know
  whose private catalog to import into.
- **Migration:** `V2__student_scoped_catalog.sql` adds `student_id_number` to `courses`, `sections` and
  `catalog_snapshots`. It clears those tables first, since pre-existing rows predate the ownership model and
  cannot be attributed to a student.

## Prospectus-based course picking

On the Courses page, "Use my prospectus" reads the student's own degree-program curriculum from ISMIS
(`/prospectus/StudentProspectus` by default, `UCHED_ISMIS_PROSPECTUS_PATH` to override) — fetched once per
ISMIS session and cached. Pick a year level; it's matched against the semester already selected above, and its
course codes (with real units, from a page that actually has them) can be added straight to the search list.
This is a *plan*, not what's currently offered — the codes still go through the normal per-code ISMIS search
before anything is imported. Requisite text (e.g. "PREREQUISITE CIS 1204") is shown as-is; USChed does not
enforce it.

## Live ISMIS sync (sign in once, fetch several courses)

1. On the Courses page the **Terms are shown every time** before ISMIS sign-in; both boxes must be ticked. Consent is kept in memory only.
2. Sign in once. The password is used for that one sign-in and destroyed; USChed keeps only the ISMIS **session cookies**, in server memory,
   for up to 20 minutes idle / 60 minutes total, or until you sign out. Nothing is written to disk or the database.
3. Enter several course codes (type them or paste a list). USChed searches ISMIS **one by one** with per-code progress, imports each
   result, and adds the matching courses to your selection. A code with no match or too many matches does not stop the others.

Behind it: sign in at `/Account/Login` (anti-forgery token echoed back), open `/courseschedule/CourseScheduleOfferedIndex`, submit its
term search (a read-only POST to `/CourseSchedule/CourseScheduleOffered`) and parse the `table-forum` results.
Only GETs, the login POST and that one search POST are ever allowed; every other request is blocked in code.

> Design change from the overview: "credentials used once, single scrape" became "password used once, session kept in memory".
> The Terms (v2026-9-2) say so explicitly.

### Searching by department

ISMIS has no separate department filter; a department is really just a course-code prefix. Typing a department
code (e.g. "CIS", "AC") in the course-codes box searches it the same way as a full code, and now pages through
every page of results (built from USChed's own request, up to `uched.ismis.max-pages`, default 50) instead of
refusing a broad search. If a department has more pages than the cap, USChed imports what it fetched and notes
that the results are partial.

> Unverified: the real multi-page example I was given was an *unfiltered* "show everything" listing (204 pages),
> so I don't yet know for certain whether ISMIS's own pagination preserves a course-code search term across pages.
> USChed builds each page's URL itself (its own academic period, year and search text, plus `page=N`) rather than
> trusting a scraped link, which should keep the filter intact — but this needs confirming against a real,
> filtered, multi-page department search once you can test it.

Known gaps (not yet verified against the live site; automated tests only use a local fake ISMIS):
- The results table has **no units column**: new courses get 3 units and an ISMIS refresh never overwrites units you already have (e.g. from a CSV).
- Assumed: Academic Year `2026-2027` is submitted as `2026`, and `Enrolled Students` reads `enrolled/capacity`.
- A search matching several result pages needs plain-href page links; otherwise USChed asks for a more specific search instead of importing part of it. (Whole-term download is not built: ISMIS lists ~204 pages.)

Get written permission from USC/ISMIS administrators and a legal review of the Terms (`usched-api/src/main/resources/terms.md`, a draft) before any public launch.
