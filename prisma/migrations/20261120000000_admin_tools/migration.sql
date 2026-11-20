-- CreateTable
CREATE TABLE `admin_audit_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_student_id_number` VARCHAR(64) NOT NULL,
    `action` VARCHAR(40) NOT NULL,
    `target` VARCHAR(255) NOT NULL DEFAULT '',
    `detail` VARCHAR(255) NOT NULL DEFAULT '',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_audit_created`(`created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ismis_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(30) NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_ismis_event_time`(`occurred_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `announcements` (
    `id` INTEGER NOT NULL,
    `message` VARCHAR(280) NOT NULL DEFAULT '',
    `tone` VARCHAR(10) NOT NULL DEFAULT 'info',
    `active` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usage_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(20) NOT NULL,
    `detail` VARCHAR(160) NOT NULL DEFAULT '',
    `count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_usage_kind_time`(`kind`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
