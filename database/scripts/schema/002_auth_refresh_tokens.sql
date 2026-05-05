CREATE TABLE refresh_tokens (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash NVARCHAR(128) NOT NULL UNIQUE,
    expires_at DATETIME2 NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    revoked_at DATETIME2 NULL,
    replaced_by_token_hash NVARCHAR(128) NULL,
    CONSTRAINT FK_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);
GO

CREATE INDEX IX_refresh_tokens_user_id ON refresh_tokens(user_id);
GO
