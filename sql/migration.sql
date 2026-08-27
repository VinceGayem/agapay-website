-- ===== AGAPAY MENTORSHIP DATABASE SCHEMA =====
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/rvqyqymeidraplaereaw/sql/new)

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'mentee' CHECK (role IN ('mentee', 'admin')),
  picture TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. POSTS TABLE
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'announcement' CHECK (tag IN ('announcement', 'update', 'important')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  user_id UUID,
  role TEXT NOT NULL DEFAULT 'mentee' CHECK (role IN ('admin', 'mentee')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TASKS TABLE
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TASK ANSWERS TABLE
CREATE TABLE IF NOT EXISTS task_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_name TEXT NOT NULL,
  message TEXT NOT NULL,
  reply TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied')),
  deleted_by_mentee BOOLEAN DEFAULT false,
  deleted_by_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'done')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anon users (simple setup)
CREATE POLICY "Allow all on profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on posts" ON posts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on comments" ON comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on task_answers" ON task_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on feedback" ON feedback FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- ===== REALTIME =====
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
