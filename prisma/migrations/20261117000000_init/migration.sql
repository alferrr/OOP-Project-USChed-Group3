-- CreateTable
CREATE TABLE `instructors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,

    UNIQUE INDEX `uq_instructor_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `building` VARCHAR(50) NOT NULL DEFAULT '',
    `room_code` VARCHAR(30) NOT NULL,
    `campus` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `uq_room`(`campus`, `building`, `room_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id_number` VARCHAR(64) NOT NULL,
    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `units` DECIMAL(3, 1) NOT NULL,
    `department` VARCHAR(50) NULL,
    `prerequisites` VARCHAR(255) NULL,

    INDEX `idx_course_student`(`student_id_number`),
    INDEX `idx_course_name`(`name`),
    UNIQUE INDEX `uq_course_code`(`student_id_number`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sections` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id_number` VARCHAR(64) NOT NULL,
    `course_id` INTEGER NOT NULL,
    `instructor_id` INTEGER NULL,
    `section_code` VARCHAR(20) NOT NULL,
    `semester` VARCHAR(6) NOT NULL,
    `academic_year` VARCHAR(9) NOT NULL,
    `available_slots` INTEGER NULL,

    INDEX `idx_section_term`(`semester`, `academic_year`),
    INDEX `idx_section_student`(`student_id_number`),
    INDEX `idx_section_instructor`(`instructor_id`),
    UNIQUE INDEX `uq_section`(`course_id`, `section_code`, `semester`, `academic_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meetings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `section_id` INTEGER NOT NULL,
    `room_id` INTEGER NULL,
    `meeting_type` VARCHAR(7) NOT NULL DEFAULT 'LECTURE',
    `day_of_week` VARCHAR(3) NOT NULL,
    `start_minute` INTEGER NOT NULL,
    `end_minute` INTEGER NOT NULL,

    INDEX `idx_meeting_section`(`section_id`),
    INDEX `idx_meeting_room`(`room_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `catalog_snapshots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id_number` VARCHAR(64) NOT NULL,
    `source` VARCHAR(5) NOT NULL,
    `semester` VARCHAR(6) NOT NULL,
    `academic_year` VARCHAR(9) NOT NULL,
    `course_count` INTEGER NOT NULL,
    `section_count` INTEGER NOT NULL,
    `skipped_count` INTEGER NOT NULL DEFAULT 0,
    `scraped_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_snapshot_student`(`student_id_number`, `semester`, `academic_year`, `scraped_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `consent_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` CHAR(36) NOT NULL,
    `terms_version` VARCHAR(20) NOT NULL,
    `agreed_terms` BOOLEAN NOT NULL,
    `agreed_credential_use` BOOLEAN NOT NULL,
    `ip_hash` CHAR(64) NOT NULL,
    `user_agent` VARCHAR(255) NULL,
    `accepted_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_consent_session`(`session_id`, `terms_version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sections` ADD CONSTRAINT `sections_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sections` ADD CONSTRAINT `sections_instructor_id_fkey` FOREIGN KEY (`instructor_id`) REFERENCES `instructors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meetings` ADD CONSTRAINT `meetings_section_id_fkey` FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `meetings` ADD CONSTRAINT `meetings_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

