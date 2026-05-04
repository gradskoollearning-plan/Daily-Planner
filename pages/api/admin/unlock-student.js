import { supabase } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { studentId, reason } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId required.' });
  if (!reason?.trim()) return res.status(400).json({ error: 'A reason is required to unlock a student.' });

  // Figure out yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  // Get all tasks for this student
  const { data: tasks } = await supabase
    .from('student_tasks')
    .select('id')
    .eq('student_id', studentId);

  if (!tasks || tasks.length === 0) {
    return res.status(200).json({ success: true, resolved: 0 });
  }

  // Find tasks that are NOT yet resolved for yesterday
  const { data: existingLogs } = await supabase
    .from('daily_logs')
    .select('task_id, status, skip_reason')
    .eq('student_id', studentId)
    .eq('log_date', yesterdayKey);

  const resolvedIds = new Set(
    (existingLogs || [])
      .filter(l => l.status === 'done' || (l.status === 'skipped' && l.skip_reason?.trim()))
      .map(l => l.task_id)
  );

  const pendingTasks = tasks.filter(t => !resolvedIds.has(t.id));

  if (pendingTasks.length === 0) {
    return res.status(200).json({ success: true, resolved: 0 });
  }

  // Upsert skipped + admin reason for all pending tasks
  const upserts = pendingTasks.map(t => ({
    student_id: studentId,
    log_date: yesterdayKey,
    task_id: t.id,
    status: 'skipped',
    skip_reason: `[Admin unlock] ${reason.trim()}`,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('daily_logs')
    .upsert(upserts, { onConflict: 'student_id,log_date,task_id' });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true, resolved: pendingTasks.length });
}

export default requireAdmin(handler);
