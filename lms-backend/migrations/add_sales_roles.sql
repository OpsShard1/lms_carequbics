-- Add sales_head and sales roles to the roles table
INSERT INTO roles (name) VALUES ('sales_head'), ('sales')
ON DUPLICATE KEY UPDATE name = name;

-- Note: Run this SQL script in your database to add the new roles
-- The user_assignments table already supports school assignments, so no schema changes needed
