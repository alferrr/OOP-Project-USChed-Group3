-- CreateTable
CREATE TABLE `announcement_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_student_id_number` VARCHAR(64) NOT NULL,
    `message` VARCHAR(280) NOT NULL,
    `tone` VARCHAR(10) NOT NULL,
    `active` BOOLEAN NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_announcement_log_created`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
