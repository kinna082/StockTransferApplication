INSERT INTO branches (branch_code, branch_name, location)
VALUES
('BR001', 'Main Branch', 'City Center'),
('BR002', 'North Branch', 'North Zone'),
('BR003', 'South Branch', 'South Zone');
GO

INSERT INTO products (product_code, product_name)
VALUES
('P1001', 'Product A'),
('P1002', 'Product B'),
('P1003', 'Product C');
GO

INSERT INTO users (full_name, email, password_hash, role_name, branch_id)
VALUES
('System Admin', 'admin@store.com', 'Admin@123', 'ADMIN', NULL),
('North Manager', 'manager@store.com', 'Manager@123', 'STORE_MANAGER', 2);
GO

-- On API startup, seeded plaintext passwords are auto-migrated once to BCrypt hashes.
