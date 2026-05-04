import { supabase } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const studentId = req.user.id;
  const days = parseInt(req.query.days) || 14;

  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromDate = from.toISOString().split('T')[0];

  const { data: tasks } = await supabase
    .from('student_tasks')
    .select('id, task_name, tag')
    .eq('student_id', studentId);

  const { data: logs } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('student_id', studentId)
    .gte('log_date', fromDate)
    .order('log_date', { ascending: false });

  const totalTasks = (tasks || []).length;

  // Build a task name lookup
  const taskNameMap = {};
  (tasks || []).forEach(t => { taskNameMap[t.id] = t.task_name; });

  // Group by date, attach task names
  const byDate = {};
  (logs || []).forEach(l => {
    if (!byDate[l.log_date]) byDate[l.log_date] = { done: 0, skipped: 0, total: totalTasks, logs: [] };
    byDate[l.log_date].logs.push({
      ...l,
      task_name: taskNameMap[l.task_id] || null,
    });
    if (l.status === 'done') byDate[l.log_date].done++;
    if (l.status === 'skipped') byDate[l.log_date].skipped++;
  });

  return res.status(200).json({ history: byDate, totalTasks });
}

export default requireAuth(handler);
