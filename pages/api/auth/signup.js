import bcrypt from 'bcryptjs';
import { supabase } from '../../../lib/supabase';
import { signToken } from '../../../lib/auth';
import { DEFAULT_TASKS } from '../../../lib/defaults';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, password, track } = req.body;
  if (!name || !email || !password || !track) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Check duplicate email
  const { data: existing } = await supabase
    .from('students')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existing) return res.status(409).json({ error: 'Email already registered.' });

  const password_hash = await bcrypt.hash(password, 10);

  // Create student
  const { data: student, error } = await supabase
    .from('students')
    .insert({ name, email: email.toLowerCase(), password_hash, track })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Seed default tasks for chosen track
  const tasks = (DEFAULT_TASKS[track] || DEFAULT_TASKS['8H']).map(t => ({
    ...t,
    student_id: student.id,
  }));

  await supabase.from('student_tasks').insert(tasks);

  const token = signToken({ id: student.id, name: student.name, email: student.email, role: 'student' });
  return res.status(201).json({ token, user: { id: student.id, name: student.name, email: student.email, track } });
}
