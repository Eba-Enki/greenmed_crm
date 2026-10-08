-- Green Med CRM — MySQL / MariaDB schema
-- Import once via cPanel → phpMyAdmin → (select database) → Import.

SET NAMES utf8mb4;

-- One row per record. `collection` is the app's storage key (e.g. ops_sq, off_cust, gm_users),
-- `data` holds the full record as JSON, `sort_order` keeps the order the app lists them in,
-- `version` goes up on every save (a save based on an older version is rejected as a conflict).
CREATE TABLE IF NOT EXISTS `records` (
  `collection`  VARCHAR(32)  NOT NULL,
  `id`          VARCHAR(64)  NOT NULL,
  `data`        LONGTEXT     NOT NULL,
  `sort_order`  INT          NOT NULL DEFAULT 0,
  `version`     INT          NOT NULL DEFAULT 1,
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
  `version`     INT          NOT NULL DEFAULT 1,
  `updated_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_by`  VARCHAR(64)  NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every create / update / delete of app data (not user accounts): `data` is the new record,
-- or the last version for a delete. Records use `record_id`; settings use the key as `collection`.
CREATE TABLE IF NOT EXISTS `record_history` (
  `hid`         BIGINT       NOT NULL AUTO_INCREMENT,
  `collection`  VARCHAR(32)  NOT NULL,
  `record_id`   VARCHAR(64)  NOT NULL,
  `version`     INT          NOT NULL,
  `action`      VARCHAR(8)   NOT NULL,
  `data`        LONGTEXT     NULL,
  `changed_by`  VARCHAR(64)  NULL,
  `changed_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`hid`),
  KEY `idx_record` (`collection`, `record_id`),
  KEY `idx_changed_at` (`changed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Schema version (the API upgrades older databases automatically on first request).
INSERT INTO `settings` (`setting_key`, `value`, `is_raw`, `updated_by`) VALUES ('__schema', '2', 1, 'system')
  ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
