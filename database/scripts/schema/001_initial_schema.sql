CREATE TABLE branches (
    id INT IDENTITY(1,1) PRIMARY KEY,
    branch_code NVARCHAR(20) NOT NULL UNIQUE,
    branch_name NVARCHAR(120) NOT NULL,
    location NVARCHAR(200) NULL,
    is_active BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(120) NOT NULL,
    email NVARCHAR(200) NOT NULL UNIQUE,
    password_hash NVARCHAR(300) NOT NULL,
    role_name NVARCHAR(30) NOT NULL,
    branch_id INT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
);
GO

CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_code NVARCHAR(50) NOT NULL UNIQUE,
    product_name NVARCHAR(200) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1
);
GO

CREATE TABLE stock_transfers (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    transfer_no NVARCHAR(30) NOT NULL UNIQUE,
    source_branch_id INT NOT NULL,
    destination_branch_id INT NOT NULL,
    transfer_date DATE NOT NULL,
    status_name NVARCHAR(30) NOT NULL DEFAULT 'Submitted',
    created_by_user_id INT NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_stock_transfers_source_branch FOREIGN KEY (source_branch_id) REFERENCES branches(id),
    CONSTRAINT FK_stock_transfers_destination_branch FOREIGN KEY (destination_branch_id) REFERENCES branches(id),
    CONSTRAINT FK_stock_transfers_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    CONSTRAINT CK_stock_transfers_status CHECK (status_name IN ('Submitted', 'Inprogress', 'Completed')),
    CONSTRAINT CK_stock_transfers_branch_mismatch CHECK (source_branch_id <> destination_branch_id)
);
GO

CREATE TABLE stock_transfer_items (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    transfer_id UNIQUEIDENTIFIER NOT NULL,
    product_id INT NULL,
    product_code NVARCHAR(50) NOT NULL,
    product_name NVARCHAR(200) NOT NULL,
    quantity DECIMAL(18,2) NOT NULL,
    CONSTRAINT FK_stock_transfer_items_transfer FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id),
    CONSTRAINT FK_stock_transfer_items_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT CK_stock_transfer_items_quantity CHECK (quantity > 0)
);
GO

CREATE TABLE stock_transfer_status_history (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    transfer_id UNIQUEIDENTIFIER NOT NULL,
    old_status NVARCHAR(30) NULL,
    new_status NVARCHAR(30) NOT NULL,
    changed_by_user_id INT NOT NULL,
    changed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    remarks NVARCHAR(300) NULL,
    CONSTRAINT FK_status_history_transfer FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id),
    CONSTRAINT FK_status_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
);
GO
