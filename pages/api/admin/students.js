import { supabase } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const today = new Date().toISOString().split('T')[0];

  const { data: students, error } = await supabase
    .from('students')
    .select('id, name, email, track, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // For each student, get today's completion count
  const enriched = await Promise.all(
    (students || []).map(async s => {
      const { data: tasks } = await supabase
        .from('student_tasks')
        .select('id')
        .eq('student_id', s.id);

      const { data: logs } = await supabase
        .from('daily_logs')
        .select('status')
        .eq('student_id', s.id)
        .eq('log_date', today);

      const totalTasks = (tasks || []).length;
      const done = (logs || []).filter(l => l.status === 'done' || l.status === 'skipped').length;
      return { ...s, todayDone: done, totalTasks };
    })
  );

  return res.status(200).json({ students: enriched });
}

export default requireAdmin(handler);
