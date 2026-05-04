import { supabase } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { studentId } = req.query;

  const from = new Date();
  from.setDate(from.getDate() - 14);
  const fromDate = from.toISOString().split('T')[0];

  let query = supabase
    .from('daily_logs')
    .select('student_id, log_date, status, task_id, skip_reason')
    .gte('log_date', fromDate)
    .order('log_date', { ascending: false });

  if (studentId) query = query.eq('student_id', studentId);

  const { data: logs } = await query;
  return res.status(200).json({ logs: logs || [] });
}

export default requireAdmin(handler);
