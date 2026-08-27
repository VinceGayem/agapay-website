-- Run this in Supabase SQL Editor to fix table permissions
GRANT ALL ON profiles TO anon;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON posts TO anon;
GRANT ALL ON posts TO authenticated;
GRANT ALL ON comments TO anon;
GRANT ALL ON comments TO authenticated;
GRANT ALL ON tasks TO anon;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON task_answers TO anon;
GRANT ALL ON task_answers TO authenticated;
GRANT ALL ON feedback TO anon;
GRANT ALL ON feedback TO authenticated;
GRANT ALL ON sessions TO anon;
GRANT ALL ON sessions TO authenticated;
