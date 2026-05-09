IF OBJECT_ID('dbo.status_master', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.status_master (
        id INT IDENTITY(1,1) PRIMARY KEY,
        status_name NVARCHAR(30) NOT NULL UNIQUE,
        is_active BIT NOT NULL DEFAULT 1
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.status_master WHERE status_name = 'Submitted')
BEGIN
    INSERT INTO dbo.status_master (status_name) VALUES ('Submitted');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.status_master WHERE status_name = 'Inprogress')
BEGIN
    INSERT INTO dbo.status_master (status_name) VALUES ('Inprogress');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.status_master WHERE status_name = 'Completed')
BEGIN
    INSERT INTO dbo.status_master (status_name) VALUES ('Completed');
END
GO
