-- Add resolution_message column to help_issues table
ALTER TABLE help_issues 
ADD COLUMN resolution_message TEXT NULL AFTER resolved_by;
