import bcrypt from 'bcryptjs';
import { supabase } from '../../../lib/supabase';
import { signToken } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });

  const lowerEmail = email.toLowerCase();

  // Check admin first
  const { data: admin } = await supabase
    .from('admins')
    .select('*')
    .eq('email', lowerEmail)
    .single();

  if (admin) {
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });
    const token = signToken({ id: admin.id, email: admin.email, role: 'admin' });
    return res.status(200).json({ token, role: 'admin' });
  }

  // Check student
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('email', lowerEmail)
    .single();

  if (!student) return res.status(401).json({ error: 'Invalid email or password.' });

  const valid = await bcrypt.compare(password, student.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

  const token = signToken({ id: student.id, name: student.name, email: student.email, role: 'student' });
  return res.status(200).json({
    token,
    role: 'student',
    user: { id: student.id, name: student.name, email: student.email, track: student.track },
  });
}
