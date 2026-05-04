import { supabase } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'DELETE') return res.status(405).end();

  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ error: 'studentId required.' });

  // CASCADE deletes student_tasks and daily_logs via FK
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

export default requireAdmin(handler);
