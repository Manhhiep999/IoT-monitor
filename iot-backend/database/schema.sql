-- Lược đồ CSDL theo Chương 4 của báo cáo (5 bảng).
-- Tên bảng dùng snake_case vì MySQL trên Windows tự chuyển tên bảng về chữ thường:
--   Users -> users, Sensors -> sensors, Devices -> devices,
--   SensorData -> sensor_data, ActionHistory -> action_history

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  username      VARCHAR(100) NOT NULL,
  hash_password VARCHAR(255) NOT NULL,
  full_name     VARCHAR(150) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sensors (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  -- Trùng tên trường trong payload iot/sensors/data: temperature, humidity, light, gas, dust, noise
  type       VARCHAR(30)  NOT NULL,
  unit       VARCHAR(20)  NOT NULL,
  -- Vượt ngưỡng -> cảnh báo (khớp ngưỡng nháy LED cảnh báo trên ESP32); NULL = không cảnh báo
  warn_above DECIMAL(10,2) NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sensors_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS devices (
  id             BIGINT       NOT NULL AUTO_INCREMENT,
  name           VARCHAR(120) NOT NULL,
  -- Mô tả ngắn hiển thị dưới tên thiết bị ở Actuator Control Panel (Frontend có dùng, báo cáo chưa liệt kê)
  description    VARCHAR(255) NULL,
  current_status ENUM('loading','on','off') NOT NULL DEFAULT 'off',
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sensor_data (
  id          BIGINT        NOT NULL AUTO_INCREMENT,
  sensor_id   BIGINT        NOT NULL,
  value       DECIMAL(10,2) NOT NULL,
  measured_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sensor_data_sensor_time (sensor_id, measured_at),
  KEY idx_sensor_data_measured_at (measured_at),
  CONSTRAINT fk_sensor_data_sensor FOREIGN KEY (sensor_id) REFERENCES sensors (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS action_history (
  id           BIGINT   NOT NULL AUTO_INCREMENT,
  user_id      BIGINT   NOT NULL,
  device_id    BIGINT   NOT NULL,
  -- action: ý định người dùng gửi đi; status: trạng thái ESP8266 đã xác nhận (4.7 — không được đồng nhất)
  action       ENUM('ON','OFF') NOT NULL,
  -- 'fail' = hết thời gian chờ mà ESP8266 không phản hồi (cơ chế timeout bổ sung ở giai đoạn triển khai)
  status       ENUM('loading','on','off','fail') NOT NULL DEFAULT 'loading',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_action_history_created_at (created_at),
  KEY idx_action_history_device_time (device_id, created_at),
  KEY idx_action_history_user_time (user_id, created_at),
  CONSTRAINT fk_action_history_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_action_history_device FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
