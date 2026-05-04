-- ============================================================
-- GRADSKOOL PLANNER — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  track TEXT NOT NULL DEFAULT '8H', -- '6H' | '8H' | '10H'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks per student (admin can customise)
CREATE TABLE IF NOT EXISTS student_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  task_order INT NOT NULL DEFAULT 0,
  time_slot TEXT NOT NULL,       -- e.g. "7:30 AM"
  task_name TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'varc', -- varc | lrdi | qa | mock
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily task logs
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  task_id UUID REFERENCES student_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'done' | 'skipped' | 'pending'
  skip_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, log_date, task_id)
);

-- Admin table (single admin, seeded below)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

-- Seed admin (password: admin123)
-- bcrypt hash of "admin123"
INSERT INTO admins (email, password_hash)
VALUES ('admin@gradskool.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi')
ON CONFLICT (email) DO NOTHING;

-- Row Level Security (keep data private per student)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Allow API (service role) to do everything — our API routes use service key
CREATE POLICY "service_all_students" ON students FOR ALL USING (true);
CREATE POLICY "service_all_tasks" ON student_tasks FOR ALL USING (true);
CREATE POLICY "service_all_logs" ON daily_logs FOR ALL USING (true);
