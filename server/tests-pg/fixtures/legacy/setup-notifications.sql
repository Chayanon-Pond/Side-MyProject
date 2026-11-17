-- Add missing columns to existing notifications table
DO $$ 
BEGIN
    -- Add is_read column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'updated_at') THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add data column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'data') THEN
        ALTER TABLE notifications ADD COLUMN data JSON;
    END IF;
END $$;

-- Drop existing constraint if it exists and add new one
DO $$ 
BEGIN
    -- Drop existing type constraint
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'notifications' AND constraint_name = 'notifications_type_check') THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;

    -- Add new type constraint with all needed types
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
        CHECK (type IN ('comment', 'like', 'article_published', 'mention', 'system'));
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Create indexes only if columns exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'notifications' AND column_name = 'type') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
    END IF;
END $$;

-- Create trigger for updating updated_at (only if function exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
        CREATE TRIGGER update_notifications_updated_at 
            BEFORE UPDATE ON notifications 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Clear existing sample data and insert new ones
DELETE FROM notifications WHERE message LIKE '%Jacob Lash%' OR message LIKE '%Welcome to%';

-- Insert sample notifications for testing
INSERT INTO notifications (user_id, type, title, message, data) VALUES 
(3, 'comment', 'New Comment', 'Jacob Lash commented on your article: The Fascinating World of Cats: Why We Love Our Furry Friends', '{"article_id": 1, "comment": "I loved this article! It really explains why my cat is so independent yet loving. The purring section was super interesting.", "commenter": "Jacob Lash"}'),
(3, 'like', 'Article Liked', 'Jacob Lash liked your article: The Fascinating World of Cats: Why We Love Our Furry Friends', '{"article_id": 1, "liker": "Jacob Lash"}'),
(3, 'article_published', 'Article Published', 'Your article "The Fascinating World of Cats" has been published successfully', '{"article_id": 1}'),
(3, 'system', 'Welcome', 'Welcome to the admin panel! You can now manage your articles and view analytics.', '{}');
