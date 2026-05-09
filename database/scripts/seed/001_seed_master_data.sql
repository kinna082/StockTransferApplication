/*
  Reference data (idempotent) — same logical content as database/scripts/data/01–03.
  Passwords: plaintext is hashed to BCrypt on first API startup.

  For modular scripts, use database/scripts/data/*.sql instead.
*/
SET NOCOUNT ON;

IF NOT EXISTS (SELECT 1 FROM dbo.branches WHERE branch_code = N'BR001')
    INSERT INTO dbo.branches (branch_code, branch_name, location)
    VALUES (N'BR001', N'Main Branch', N'City Center');

IF NOT EXISTS (SELECT 1 FROM dbo.branches WHERE branch_code = N'BR002')
    INSERT INTO dbo.branches (branch_code, branch_name, location)
    VALUES (N'BR002', N'North Branch', N'North Zone');

IF NOT EXISTS (SELECT 1 FROM dbo.branches WHERE branch_code = N'BR003')
    INSERT INTO dbo.branches (branch_code, branch_name, location)
    VALUES (N'BR003', N'South Branch', N'South Zone');

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE product_code = N'P1001')
    INSERT INTO dbo.products (product_code, product_name, is_active)
    VALUES (N'P1001', N'Product A', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE product_code = N'P1002')
    INSERT INTO dbo.products (product_code, product_name, is_active)
    VALUES (N'P1002', N'Product B', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.products WHERE product_code = N'P1003')
    INSERT INTO dbo.products (product_code, product_name, is_active)
    VALUES (N'P1003', N'Product C', 1);

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email = N'admin@store.com')
    INSERT INTO dbo.users (full_name, email, password_hash, role_name, branch_id)
    VALUES (N'System Admin', N'admin@store.com', N'Admin@123', N'ADMIN', NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE email = N'manager@store.com')
    INSERT INTO dbo.users (full_name, email, password_hash, role_name, branch_id)
    VALUES (
        N'North Manager',
        N'manager@store.com',
        N'Manager@123',
        N'STORE_MANAGER',
        (SELECT id FROM dbo.branches WHERE branch_code = N'BR002')
    );
GO
