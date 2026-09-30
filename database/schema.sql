-- Green Med CRM — MySQL / MariaDB schema
-- Import once via cPanel → phpMyAdmin → (select database) → Import.

SET NAMES utf8mb4;

-- One row per record. `collection` is the app's storage key (e.g. ops_sq, off_cust, gm_users),
-- `data` holds the full record as JSON, `sort_order` keeps the order the app lists them in.
CREATE TABLE IF NOT EXISTS `records` (
  `collection`  VARCHAR(32)  NOT NULL,
  `id`          VARCHAR(64)  NOT NULL,
  `data`        LONGTEXT     NOT NULL,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by`  VARCHAR(64)  NULL,
  PRIMARY KEY (`collection`, `id`),
  KEY `idx_collection_order` (`collection`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Single-value settings: company info, number counters, purchase prices, logo, signature.
-- `is_raw` = 1 means `value` is a plain string (base64 image), otherwise JSON.
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(32)  NOT NULL,
  `value`       LONGTEXT     NOT NULL,
  `is_raw`      TINYINT(1)   NOT NULL DEFAULT 0,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by`  VARCHAR(64)  NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
