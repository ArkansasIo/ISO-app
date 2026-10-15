CREATE TABLE IF NOT EXISTS auth_sessions(
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  github_access_token_enc TEXT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  INDEX idx_auth_sessions_user(user_id),
  INDEX idx_auth_sessions_expiry(expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS device_auth_requests(
  id CHAR(36) PRIMARY KEY,
  device_code_hash CHAR(64) NOT NULL UNIQUE,
  user_code VARCHAR(32) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  interval_seconds INT NOT NULL DEFAULT 5,
  status ENUM('pending','complete','expired','denied') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_auth_expiry(expires_at)
);
