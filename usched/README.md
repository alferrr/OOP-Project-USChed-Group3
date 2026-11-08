# USChed frontend

React 19 + TypeScript + Vite + Tailwind 4 UI for USChed. The API lives in `../usched-api`; see the root
`README.md` for running the whole stack and the environment variables.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :5173 (proxies `/api` to the backend) |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run lint` | oxlint (React hooks, a11y, no-console, no-explicit-any) |
| `npm test` | Vitest + Testing Library (jsdom) |

## Layout

- `src/pages` - Login, Terms, CourseSelection, Schedules
- `src/components` - course, schedule, preferences, compare, consent, ismis, layout
- `src/store` - zustand stores; `clearStudentData()` in `resetAll.ts` wipes all per-student state
- `src/api` - fetch client, React Query hooks, shared types
- `src/lib` - pure helpers (insights, calendar layout, course grouping, time, search)

## Keep in sync with the backend

`lib/insights.ts` duplicates the campus-travel rule (45 minutes between campuses, campus inferred from the room
suffix `TC`/`MC`). Change it together with `CampusTravelConstraint` in `usched-api`.
