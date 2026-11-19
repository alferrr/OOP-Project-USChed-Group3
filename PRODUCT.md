# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

University of San Carlos (USC) students, planning their next term's class schedule at enrollment time: in the window around ISMIS enrollment, usually on a laptop and sometimes on a phone. The job is to pick the courses they need, get conflict-free schedules they can compare, then enroll themselves in the official ISMIS.

## Product Purpose

USChed is a course-enrollment schedule planner. A student signs in to ISMIS once, searches the offered courses they need (by code, department, or from their own prospectus), sets preferences, and gets ranked, conflict-free schedules they can view on a weekly calendar, compare side by side, and print. Success is a student walking into enrollment already knowing which sections they want and why.

It never enrolls, drops, or changes anything in ISMIS.

## Positioning

It works from the student's own live ISMIS data, not a stale shared timetable, and it ranks schedules with real USC constraints in mind: the Main/Talamban commute (a hard 45-minute buffer between classes on different campuses), breaks, preferred and avoided days, and campus consistency. It explains each schedule's trade-offs in plain language.

## Operating Context

- Sign-in uses the student's ISMIS credentials once; the password is discarded immediately and only a session id is kept in memory.
- The catalog is private per student (keyed by student ID number); nothing is shared between students except instructors and rooms.
- A terms-of-use and consent step gates anything that talks to ISMIS.
- Sessions end after 20 minutes idle or 60 minutes total, so the flow must handle expiry gracefully.
- Schedules are meant to be printed or screenshotted for reference at enrollment.

## Capabilities and Constraints

- Search offered courses by code, department code, or description; add a year level's subjects from the student's prospectus.
- Hard preferences ("Must follow") and soft preferences (weighted scoring) for schedule generation.
- Ranked results with score, insights, "more like this", and a side-by-side comparison of up to 4 schedules.
- Weekly calendar in 30-minute rows; print-friendly output.
- One Next.js 15 app (App Router): React 19, TypeScript, Tailwind 4 for the UI; route handlers for the API; the scheduling engine and ISMIS scraper are plain TypeScript in `src/server`; MySQL via Prisma.
- Prerequisites and requisites from ISMIS are shown but not enforced.

## Brand Commitments

- Independent, student-built tool, not affiliated with or endorsed by USC or ISMIS. It must never look or read as official, and does not use USC's logo or seal.
- Binding identity: green, gold, and white.
- Name: USChed (the project and folders use "usched"/"uched" internally).

## Evidence on Hand

- A terms-of-use document at `src/server/terms.ts`.
- A login image at `public/login.jpg` and `favicon.svg`/`icons.svg`.
- No testimonials, user counts, press, or benchmarks exist. Future work must not fabricate any.

## Product Principles

1. Trust before convenience: be plain about what is stored (nothing sensitive), what is not done (no enrolling), and that the student enrolls in ISMIS themselves.
2. Explain, don't just rank: every score and schedule note should be readable by a student in seconds.
3. Respect real campus constraints (commute, breaks) as facts, not preferences to tune away.
4. Built for the enrollment crunch: fast, forgiving, and survivable on a phone or in print.
5. Honest about independence: never imply official status.

## Accessibility & Inclusion

Phone-width layouts and printable output are required, not optional. Keyboard operation and screen-reader labels are expected for all controls (the project already lints for jsx-a11y). Plain, jargon-light English, since users are students under time pressure.
