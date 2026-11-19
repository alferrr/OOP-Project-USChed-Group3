-- CreateTable
CREATE TABLE `saved_schedules` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id_number` VARCHAR(64) NOT NULL,
    `schedule_key` VARCHAR(255) NOT NULL,
    `semester` VARCHAR(6) NOT NULL,
    `academic_year` VARCHAR(9) NOT NULL,
    `payload` MEDIUMTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_saved_schedule`(`student_id_number`, `schedule_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
