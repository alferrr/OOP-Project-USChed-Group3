# USChed

A class-schedule planner for University of San Carlos students.

Sign in with your ISMIS account, pull the courses you need for the term, tell USChed what you care about (no Saturday classes, a particular teacher, a lunch break), and it builds conflict-free schedules, ranks them, and shows each one on a weekly calendar. USChed only reads from ISMIS. It never enrolls, drops or changes anything, so you always enroll yourself in the official ISMIS.

## What it does

- **Finds your courses.** Type course codes or add a whole term from your prospectus, and USChed fetches the sections offered this term from ISMIS.
- **Generates and ranks schedules.** Every conflict-free combination is scored, with plain-language notes on the trade-offs. Classes on different campuses need at least 45 minutes between them.
- **Understands preferences.** Rules a schedule must follow (days to avoid, earliest start, minimum break, teachers to avoid) and wishes that only affect ranking (mornings, fewer gaps, preferred teachers).
- **Lets you build your own.** Pick a section for each course and watch the week fill in, with clashes flagged.
- **Saves and shares.** Name and save schedules to your account, compare up to four, copy a link, download a PNG, or print.
- **Helps you get started.** A first-sign-in tour and a help octopus that answers questions about the app.
- **Has an admin dashboard** for the student IDs listed in `UCHED_ADMIN_IDS`.

## How it gets its data

USChed does **not** have access to an ISMIS API, and it is not connected to ISMIS in any official way. Instead, when a student signs in, an automated program running on USChed's server logs in to ISMIS on the student's behalf, with the credentials they entered, and reads the course listings and the student's prospectus from the same pages they would see in a browser.

- It is **read-only.** The code only allows the sign-in request and the read-only course search (`src/server/ismis/session.ts`). It never enrolls, drops or changes anything.
- The password is used once to sign in and is never stored. The sign-in session is kept in server memory only, and ends on sign-out, after 20 minutes idle, or after 60 minutes.
- If ISMIS asks for a CAPTCHA or a verification code, it stops instead of trying to get around it.
- It depends on how ISMIS's pages are laid out, so a change on ISMIS's side can break it until it is updated.

Students accept this in the Terms of Use and Privacy Notice (`src/server/terms.ts`, shown on the login page) before signing in.

## Built with

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma · MySQL

## Run locally

You need **Node.js 20.9 or newer** and a **MySQL 8** (or MariaDB 10.6+) database.

**1. Install dependencies**

```bash
npm install
```

**2. Create a database**

Use a MySQL you already have:

```bash
mysql -uroot -e "CREATE DATABASE uched CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
```

or start one with Docker:

```bash
docker run -d --name usched-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=uched -p 3306:3306 mysql:8.4
```

**3. Configure the environment**

```bash
cp .env.example .env
```

Open `.env` and set `DATABASE_URL` to match your database, for example:

```
DATABASE_URL="mysql://root:root@localhost:3306/uched"
```

Nothing else is required to run locally. `.env.example` lists the optional settings.

**4. Create the tables**

```bash
npm run db:migrate
```

**5. Start the app**

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with your ISMIS student ID number and password. Your password is used once to sign in to ISMIS and is never stored.

If you change the database schema or pull new migrations, run `npm run db:migrate` again and restart `npm run dev`.

### Tests and checks

```bash
npm test             # UI and server tests (no database needed)
npm run typecheck
npm run lint
```

Some API tests need a database of their own, and they wipe it:

```bash
mysql -uroot -e "CREATE DATABASE uched_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
DATABASE_URL=mysql://root:root@localhost:3306/uched_test npm run db:migrate
TEST_DATABASE_URL=mysql://root:root@localhost:3306/uched_test npm test
```
