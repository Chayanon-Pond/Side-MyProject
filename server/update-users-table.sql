-- Add missing columns to users table for profile functionality

-- Add bio column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Add profile_image_url column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);

-- Add updated_at column if not exists
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger for updating updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create uploads directory structure for profiles
-- Note: This needs to be done manually or via Node.js script
