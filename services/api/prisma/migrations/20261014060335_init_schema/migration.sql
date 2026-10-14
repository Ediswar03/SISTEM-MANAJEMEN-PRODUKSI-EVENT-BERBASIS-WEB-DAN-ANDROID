-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'CREW') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `idx_users_role_active`(`role`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crew_profiles` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `skills` VARCHAR(512) NOT NULL,
    `notes` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `crew_profiles_user_id_key`(`user_id`),
    INDEX `idx_crew_profiles_active`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `client_name` VARCHAR(255) NULL,
    `location` VARCHAR(512) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Jakarta',
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `created_by_id` CHAR(36) NOT NULL,
    `responsible_user_id` CHAR(36) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `archived_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `events_code_key`(`code`),
    INDEX `idx_events_status_interval`(`status`, `start_at`, `end_at`),
    INDEX `idx_events_interval`(`start_at`, `end_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_status_history` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `from_status` ENUM('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NULL,
    `to_status` ENUM('DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED') NOT NULL,
    `changed_by_id` CHAR(36) NOT NULL,
    `reason` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_event_status_history_event`(`event_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipment_categories` (
    `id` CHAR(36) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `description` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `equipment_categories_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipment` (
    `id` CHAR(36) NOT NULL,
    `category_id` CHAR(36) NOT NULL,
    `code` VARCHAR(32) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `quantity_on_hand` INTEGER NOT NULL,
    `usable_quantity` INTEGER NOT NULL,
    `condition` ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNUSABLE') NOT NULL DEFAULT 'GOOD',
    `storage_location` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `equipment_code_key`(`code`),
    INDEX `idx_equipment_category_active`(`category_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipment_allocations` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `equipment_id` CHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `notes` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `cancelled_at` DATETIME(3) NULL,

    INDEX `idx_allocation_equipment_interval`(`equipment_id`, `status`, `start_at`, `end_at`),
    UNIQUE INDEX `uq_allocation_event_equipment`(`event_id`, `equipment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crew_assignments` (
    `id` CHAR(36) NOT NULL,
    `event_id` CHAR(36) NOT NULL,
    `crew_profile_id` CHAR(36) NOT NULL,
    `role_in_event` VARCHAR(128) NOT NULL,
    `job_status` ENUM('ASSIGNED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED') NOT NULL DEFAULT 'ASSIGNED',
    `status` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `start_at` DATETIME(3) NOT NULL,
    `end_at` DATETIME(3) NOT NULL,
    `notes` VARCHAR(512) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `cancelled_at` DATETIME(3) NULL,

    INDEX `idx_assignment_crew_interval`(`crew_profile_id`, `status`, `start_at`, `end_at`),
    UNIQUE INDEX `uq_assignment_event_crew`(`event_id`, `crew_profile_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `actor_id` CHAR(36) NULL,
    `action` VARCHAR(64) NOT NULL,
    `entity_type` VARCHAR(64) NOT NULL,
    `entity_id` CHAR(36) NULL,
    `result` ENUM('SUCCESS', 'FAILURE', 'DENIED') NOT NULL,
    `reason` VARCHAR(512) NULL,
    `metadata_json` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_audit_entity`(`entity_type`, `entity_id`, `created_at`),
    INDEX `idx_audit_actor`(`actor_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    INDEX `idx_refresh_tokens_user`(`user_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `idempotency_keys` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `request_hash` VARCHAR(64) NOT NULL,
    `response_code` INTEGER NOT NULL,
    `response_body` MEDIUMTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `idx_idempotency_expires`(`expires_at`),
    UNIQUE INDEX `uq_idempotency_user_key`(`user_id`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `crew_profiles` ADD CONSTRAINT `crew_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_responsible_user_id_fkey` FOREIGN KEY (`responsible_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_status_history` ADD CONSTRAINT `event_status_history_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_status_history` ADD CONSTRAINT `event_status_history_changed_by_id_fkey` FOREIGN KEY (`changed_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment` ADD CONSTRAINT `equipment_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `equipment_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment_allocations` ADD CONSTRAINT `equipment_allocations_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment_allocations` ADD CONSTRAINT `equipment_allocations_equipment_id_fkey` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crew_assignments` ADD CONSTRAINT `crew_assignments_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `crew_assignments` ADD CONSTRAINT `crew_assignments_crew_profile_id_fkey` FOREIGN KEY (`crew_profile_id`) REFERENCES `crew_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `idempotency_keys` ADD CONSTRAINT `idempotency_keys_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
