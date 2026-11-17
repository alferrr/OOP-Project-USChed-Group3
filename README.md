# USChed

Course-enrollment **schedule planner** for University of San Carlos students. It never enrolls, drops or changes anything in ISMIS.

One **Next.js 15** app (App Router, TypeScript, Tailwind 4) that serves both the UI and the API, backed by **MySQL** through Prisma. Full design notes: [PRODUCT.md](PRODUCT.md).

> The previous Spring Boot + Vite implementation is kept on the `java-backend` branch.

## What is where

| Path | What |
|---|---|
| `src/app` | Next.js routes: pages (`login`, `courses`, `schedules`, `terms`, `shared`) and the API (`app/api/**/route.ts`) |
| `src/views`, `src/components` | The screens and their parts (client components) |
| `src/store`, `src/api`, `src/lib` | zustand stores, fetch client + React Query hooks, pure helpers |
| `src/server/domain`, `src/server/engine` | Framework-free scheduling core: models, hard constraints, scoring, backtracking generator (a test enforces the layering) |
| `src/server/ismis` | The read-only ISMIS scraper: HTTP session, page parser, row mapper, connection |
| `src/server/services` | Sessions, consent, catalog import, queries, schedule generation, background search jobs |
| `src/server/http` | The request guards (HTTPS, consent, student session, admin token), validation, DTOs, error mapping |
| `prisma/` | Schema and SQL migrations |
| `tests/` | Server tests (engine, scraper against a fake ISMIS, API against MySQL) |

## Run locally

Needs Node 20.9+ and a MySQL 8 (or MariaDB 10.6+) you can create a database in.

```bash
npm install                          # also generates the Prisma client
cp .env.example .env                 # then set DATABASE_URL
mysql -uroot -e "CREATE DATABASE uched CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
npm run db:migrate                   # applies prisma/migrations
npm run dev                          # http://localhost:3000
```

Tests and checks:

```bash
npm test                             # UI + server tests (no database needed)
npm run typecheck && npm run lint

# The API tests need a *_test database; they wipe it:
mysql -uroot -e "CREATE DATABASE uched_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
DATABASE_URL=mysql://root@localhost:3306/uched_test npm run db:migrate
TEST_DATABASE_URL=mysql://root@localhost:3306/uched_test npm test
```

## Configuration (environment variables)

See [.env.example](.env.example) for the full list.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string, e.g. `mysql://user:pass@host:3306/uched` |
| `UCHED_CONSENT_SECRET`, `UCHED_IP_SALT` | **Required when `UCHED_REQUIRE_HTTPS=true`** (the server refuses to start with the dev defaults). HMAC key for consent tokens; salt for the IP hashes kept as consent evidence |
| `UCHED_REQUIRE_HTTPS` | `true` rejects plain HTTP on `/api/ismis/**` (honours `X-Forwarded-Proto`) and sends HSTS |
| `UCHED_ADMIN_TOKEN` | Enables `POST /api/admin/import` (CSV) via the `X-Admin-Token` header; blank = disabled |
| `UCHED_ISMIS_*` | Base URL, paths, form-field names and user agent for the live scrape |

The UI and API share one origin, so there is no CORS setup.

## Deploying (Node server + PM2)

USChed holds ISMIS sign-in sessions and running search jobs **in server memory**, so it must run as **one long-lived Node process**. It does not work as serverless functions or PM2 cluster mode.

```bash
git clone <repo> && cd USChed
npm ci
cp .env.example .env && nano .env      # DATABASE_URL, secrets, UCHED_REQUIRE_HTTPS=true behind HTTPS
npm run db:migrate                     # create the tables
npm run build
pm2 start ecosystem.config.cjs && pm2 save
```

Update later with `git pull && npm ci && npm run db:migrate && npm run build && pm2 restart usched`.
Restarting signs everyone out of ISMIS (their sessions live in memory) but loses no saved data.
Put a reverse proxy (nginx/Apache) with HTTPS in front of port 3000 and make sure it sets `X-Forwarded-Proto`.

## Private per-student catalog

Course data is **private to each student**, keyed by their ISMIS ID number (the username they sign in with), not a shared institution-wide catalog. A student's fetched courses, sections, generated schedules and catalog status are invisible to every other student. Instructors and rooms are the one exception: shared reference facts (who teaches, which room).

- **Identity** is established once, at ISMIS sign-in: ISMIS accepting the login is what proves the ID number is theirs. The `X-Ismis-Session` header (an unguessable random id, not the ID number) then carries that identity; the `student` guard in `src/server/http/api.ts` resolves it for `/api/courses`, `/api/schedules`, `/api/meta/{departments,academic-years}` and `/api/catalog`.
- **Passwords** are used only for the sign-in request and never stored, logged or echoed; a test signs in with a sentinel password and proves it appears in no response, log line or database row. (JavaScript strings cannot be wiped from memory, unlike the Java version's `char[]`; what is guaranteed is that nothing retains it.)
- **Admin CSV import** (`POST /api/admin/import`, multipart: `file`, `semester`, `academicYear`, `studentIdNumber`) imports into that student's private catalog.

## Prospectus-based course picking

On the Courses page, "Use my prospectus" reads the student's own degree-program curriculum from ISMIS
(`/prospectus/StudentProspectus` by default, `UCHED_ISMIS_PROSPECTUS_PATH` to override), fetched once per
ISMIS session and cached. Pick a year level; it is matched against the semester already selected above, and its
course codes (with real units, from a page that actually has them) can be added straight to the search list.
This is a *plan*, not what is currently offered: the codes still go through the normal per-code ISMIS search
before anything is imported. Requisite text (e.g. "PREREQUISITE CIS 1204") is shown as-is.

Prospectus placeholders such as `GE-FEL 2` are resolved to the real searchable family code, and an elective "slot"
with no exact match offers whatever ISMIS has under that family.

## Live ISMIS sync (sign in once, fetch several courses)

1. On the Login page the **Terms are shown every time** before ISMIS sign-in; both boxes must be ticked. Consent is kept in memory only.
2. Sign in once. The password is used for that one sign-in and never stored; USChed keeps only the ISMIS **session cookies**, in server memory,
   for up to 20 minutes idle / 60 minutes total, or until you sign out. Nothing is written to disk or the database.
3. Enter several course codes (type them or paste a list). USChed searches ISMIS **one by one** with per-code progress, imports each
   result, and adds the matching courses to your selection. A code with no match or too many matches does not stop the others.

Behind it: sign in at `/Account/Login` (anti-forgery token echoed back), open `/courseschedule/CourseScheduleOfferedIndex`, submit its
term search (a read-only POST to `/CourseSchedule/CourseScheduleOffered`) and parse the `table-forum` results.
Only GETs, the login POST and that one search POST are ever allowed; every other request is blocked in code
(`src/server/ismis/session.ts`), and a CAPTCHA or one-time-code page stops the scrape rather than being solved.

> Design change from the overview: "credentials used once, single scrape" became "password used once, session kept in memory".
> The Terms (v2026-9-2) say so explicitly.

### Searching by department

ISMIS has no separate department filter; a department is really just a course-code prefix. Typing a department
code (e.g. "CIS", "AC") in the course-codes box searches it the same way as a full code, and pages through
every page of results (built from USChed's own request, up to `UCHED_ISMIS_MAX_PAGES`, default 50). If a department
has more pages than the cap, USChed imports what it fetched and notes that the results are partial.

> Unverified: the real multi-page example I was given was an *unfiltered* "show everything" listing (204 pages),
> so I don't yet know for certain whether ISMIS's own pagination preserves a course-code search term across pages.
> USChed builds each page's URL itself (its own academic period, year and search text, plus `page=N`) rather than
> trusting a scraped link, which should keep the filter intact, but this needs confirming against a real,
> filtered, multi-page department search.

Known gaps (not yet verified against the live site; automated tests only use a local fake ISMIS):
- The results table has **no units column**: new courses get 3 units, but a searched course that appears in your prospectus takes its real units from there. An ISMIS refresh never overwrites units you already have (e.g. from a CSV); courses not in your prospectus (e.g. electives) stay at 3.
- Assumed: Academic Year `2026-2027` is submitted as `2026`, and `Enrolled Students` reads `enrolled/capacity`.
- Whole-term download is not built: ISMIS lists ~204 pages.

Get written permission from USC/ISMIS administrators and a legal review of the Terms (`src/server/terms.ts`, a draft) before any public launch.

## Keep in sync

`src/lib/insights.ts` duplicates the campus-travel rule (45 minutes between classes on different campuses, campus inferred from the room suffix `TC`/`MC`). Change it together with `TRAVEL_MINUTES` in `src/server/engine/constraints.ts`.
