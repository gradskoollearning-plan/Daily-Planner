import { supabase } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth';

async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const studentId = req.user.id;
  const { task_id, status, skip_reason, log_date } = req.body;

  if (!task_id || !status) return res.status(400).json({ error: 'task_id and status required.' });
  if (status === 'skipped' && !skip_reason?.trim()) {
    return res.status(400).json({ error: 'A reason is required when skipping a task.' });
  }

  const date = log_date || new Date().toISOString().split('T')[0];

  // Verify task belongs to student
  const { data: task } = await supabase
    .from('student_tasks')
    .select('id')
    .eq('id', task_id)
    .eq('student_id', studentId)
    .single();

  if (!task) return res.status(403).json({ error: 'Task not found.' });

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      {
        student_id: studentId,
        log_date: date,
        task_id,
        status,
        skip_reason: status === 'skipped' ? skip_reason : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,log_date,task_id' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ log: data });
}

export default requireAuth(handler);
