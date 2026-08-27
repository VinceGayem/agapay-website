-- Nuclear fix: drop and recreate everything
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/rvqyqymeidraplaereaw/sql/new

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all on profiles" ON profiles;
DROP POLICY IF EXISTS "Allow all on posts" ON posts;
DROP POLICY IF EXISTS "Allow all on comments" ON comments;
DROP POLICY IF EXISTS "Allow all on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all on task_answers" ON task_answers;
DROP POLICY IF EXISTS "Allow all on feedback" ON feedback;
DROP POLICY IF EXISTS "Allow all on sessions" ON sessions;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Recreate permissive policies
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on posts" ON posts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comments" ON comments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_answers" ON task_answers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on feedback" ON feedback FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
