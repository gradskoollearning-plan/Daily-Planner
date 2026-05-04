import { supabase } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const studentId = req.user.id;
  const date = req.query.date || new Date().toISOString().split('T')[0];

  const { data: student } = await supabase
    .from('students')
    .select('id, name, email, track, created_at')
    .eq('id', studentId)
    .single();

  const { data: tasks } = await supabase
    .from('student_tasks')
    .select('*')
    .eq('student_id', studentId)
    .order('task_order');

  const { data: logs } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('student_id', studentId)
    .eq('log_date', date);

  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  const studentCreatedDate = student?.created_at
    ? new Date(student.created_at).toISOString().split('T')[0]
    : date;
  const isNewUser = studentCreatedDate >= date;

  const { data: yesterdayLogs } = isNewUser
    ? { data: [] }
    : await supabase
        .from('daily_logs')
        .select('task_id, status, skip_reason')
        .eq('student_id', studentId)
        .eq('log_date', yesterdayKey);

  const taskIds = (tasks || []).map(t => t.id);

  // Tightened: skipped only counts if skip_reason is non-empty
  const resolvedYesterday =
    isNewUser ||
    taskIds.length === 0 ||
    taskIds.every(tid => {
      const log = (yesterdayLogs || []).find(l => l.task_id === tid);
      if (!log) return false;
      if (log.status === 'done') return true;
      if (log.status === 'skipped' && log.skip_reason?.trim()) return true;
      return false;
    });

  return res.status(200).json({
    student,
    tasks: tasks || [],
    logs: logs || [],
    todayUnlocked: resolvedYesterday,
    yesterdayKey: resolvedYesterday ? null : yesterdayKey,
    // Return full task list + yesterday logs so dashboard can render the resolution panel
    yesterdayTasks: resolvedYesterday ? [] : (tasks || []),
    yesterdayLogs: resolvedYesterday ? [] : (yesterdayLogs || []),
  });
}

export default requireAuth(handler);
