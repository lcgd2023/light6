CREATE TABLE password_reset_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);

CREATE INDEX idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX idx_password_reset_codes_expires_at ON password_reset_codes(expires_at); 