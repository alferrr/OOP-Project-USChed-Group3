-- Course data becomes private per student (identified by their ISMIS ID number/username), not a shared
-- institution-wide catalog. Existing rows predate that model and cannot be attributed to a student, so they
-- are cleared rather than guessed at. Instructors and rooms stay shared: they are reference facts about
-- people and places, not a student's own data.

DELETE FROM meetings;
DELETE FROM sections;
DELETE FROM courses;
DELETE FROM catalog_snapshots;

ALTER TABLE courses
  DROP INDEX uq_course_code,
  ADD COLUMN student_id_number VARCHAR(20) NOT NULL AFTER id,
  ADD UNIQUE KEY uq_course_code (student_id_number, code),
  ADD KEY idx_course_student (student_id_number);

ALTER TABLE sections
  ADD COLUMN student_id_number VARCHAR(20) NOT NULL AFTER id,
  ADD KEY idx_section_student (student_id_number);

ALTER TABLE catalog_snapshots
  DROP INDEX idx_snapshot_term,
  ADD COLUMN student_id_number VARCHAR(20) NOT NULL AFTER id,
  ADD KEY idx_snapshot_student (student_id_number, semester, academic_year, scraped_at);
