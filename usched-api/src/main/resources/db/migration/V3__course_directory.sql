-- A shared, student-independent directory of course codes and titles, used only to suggest codes while a
-- student types. It holds reference facts (code, title, units, department), never anything tied to a
-- student: no ID number, sections, or times. Filled from ISMIS searches/prospectus reads and an admin CSV.
CREATE TABLE course_directory (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  units DECIMAL(3,1),
  department VARCHAR(50),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_directory_code (code),
  KEY idx_directory_name (name)
);
