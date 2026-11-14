---
version: 1
slug: "src-pages-courseselectionpage-tsx"
primary_target: "src/pages/CourseSelectionPage.tsx"
related_targets: ["src/pages/SchedulesPage.tsx","src/components/layout/AppShell.tsx"]
---

# Surface brief: USChed app (whole product)

Scope: the whole web app (shell, login, terms, course selection, schedules). Visitor mode: Operate.

Audience and job: USC students at enrollment time choose courses, set preferences, get ranked conflict-free schedules, then enroll in ISMIS themselves. Constraints: green/gold/white identity, independent from USC, phone-width and print must work, trust/consent first.

Unresolved: none.

## Direction contract

THESIS: A friendly, smooth-edged planner where each screen has one obvious next step; it refuses the dense bordered-box dashboard and the heavy green header with the gold stripe.

OWN-WORLD: Everyday App Clarity (user-picked grounded direction). Soft sage ground #f5f7f4, white rounded cards (radius 20-28px), tall soft shadows, no hard borders. Deep green #0f6b3f carries primary actions and the plan summary; gold #f0c53d is only for selection, ticks and the single primary call to action. One humanist sans (Atkinson Hyperlegible Next) with tabular figures, weight carrying rank. Big circular add and tick buttons, pill chips.

STORY: A student understands where they are in three seconds, adds courses without hunting, sees their plan and units grow, generates, and reads why a schedule works in plain language.

FIRST VIEWPORT: Courses page. A slim rounded top bar (logo, Courses and Schedules as pill nav, session pill, sign out). Beneath it a title and one-line help, the code search box with debounced suggestions, rounded course cards with large round add and tick buttons, and a sticky green plan card at right showing total units, the selected list, and the gold Generate action. Preferences collapse below the search as a calm panel.

FORM: Everyday App Clarity, chosen by the user from the safer hand, seed:b3189a9a968df292.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
