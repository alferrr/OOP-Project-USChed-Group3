CREATE TABLE instructors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  UNIQUE KEY uq_instructor_name (name)
);

CREATE TABLE rooms (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  building VARCHAR(50) NOT NULL DEFAULT '',
  room_code VARCHAR(30) NOT NULL,
  campus VARCHAR(50) NOT NULL,
  UNIQUE KEY uq_room (campus, building, room_code)
);

CREATE TABLE courses (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  units DECIMAL(3,1) NOT NULL,
  department VARCHAR(50),
  prerequisites VARCHAR(255),
  UNIQUE KEY uq_course_code (code),
  KEY idx_course_name (name)
);

CREATE TABLE sections (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  course_id BIGINT NOT NULL,
  instructor_id BIGINT NULL,
  section_code VARCHAR(20) NOT NULL,
  semester ENUM('1ST','2ND','SUMMER') NOT NULL,
  academic_year VARCHAR(9) NOT NULL,
  available_slots INT NULL,
  UNIQUE KEY uq_section (course_id, section_code, semester, academic_year),
  KEY idx_section_term (semester, academic_year),
  CONSTRAINT fk_section_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  CONSTRAINT fk_section_instructor FOREIGN KEY (instructor_id) REFERENCES instructors(id)
);

CREATE TABLE meetings (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  section_id BIGINT NOT NULL,
  room_id BIGINT NULL,
  meeting_type ENUM('LECTURE','LAB') NOT NULL DEFAULT 'LECTURE',
  day_of_week ENUM('MON','TUE','WED','THU','FRI','SAT') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CONSTRAINT chk_meeting_time CHECK (start_time < end_time),
  KEY idx_meeting_section (section_id),
  CONSTRAINT fk_meeting_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_meeting_room FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE catalog_snapshots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  source ENUM('ISMIS','CSV','MOCK') NOT NULL,
  semester ENUM('1ST','2ND','SUMMER') NOT NULL,
  academic_year VARCHAR(9) NOT NULL,
  course_count INT NOT NULL,
  section_count INT NOT NULL,
  skipped_count INT NOT NULL DEFAULT 0,
  scraped_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_snapshot_term (semester, academic_year, scraped_at)
);

-- Consent evidence: no credentials, no names.
CREATE TABLE consent_records (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36) NOT NULL,
  terms_version VARCHAR(20) NOT NULL,
  agreed_terms BOOLEAN NOT NULL,
  agreed_credential_use BOOLEAN NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(255),
  accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_consent_session (session_id, terms_version)
);

-- Nice-to-have saved schedules. Tables only; identity design is deferred (no USChed login in the MVP).
CREATE TABLE students (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL,
  UNIQUE KEY uq_student_email (email)
);

CREATE TABLE saved_schedules (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  semester ENUM('1ST','2ND','SUMMER') NOT NULL,
  academic_year VARCHAR(9) NOT NULL,
  score DECIMAL(5,2),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_saved_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE saved_schedule_sections (
  saved_schedule_id BIGINT NOT NULL,
  section_id BIGINT NOT NULL,
  PRIMARY KEY (saved_schedule_id, section_id),
  CONSTRAINT fk_sss_schedule FOREIGN KEY (saved_schedule_id) REFERENCES saved_schedules(id) ON DELETE CASCADE,
  CONSTRAINT fk_sss_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);
