-- Add role column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Update existing users to have 'user' role if they don't have one
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Create admin user (password will be 'admin123')
INSERT INTO users (full_name, username, email, password_hash, role, created_at) 
VALUES (
  'Admin User', 
  'admin', 
  'admin@example.com', 
  '$2b$10$8K3zYqQY1aQ0rZXzqC2.5.oHqnqFqw3XLTV5Yy0cC8nQoYzrQ9vum', -- bcrypt hash of 'admin123'
  'admin',
  NOW()
) 
ON CONFLICT (email) DO UPDATE SET 
  role = 'admin',
  full_name = 'Admin User',
  username = 'admin';

-- Verify the admin user was created
SELECT id, full_name, username, email, role FROM users WHERE role = 'admin';
