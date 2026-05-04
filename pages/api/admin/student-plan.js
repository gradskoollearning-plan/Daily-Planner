import { supabase } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

async function handler(req, res) {
  const { studentId } = req.query;
  if (!studentId) return res.status(400).json({ error: 'studentId required.' });

  if (req.method === 'GET') {
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

    // 14-day history with full detail including skip_reason and task name
    const from = new Date();
    from.setDate(from.getDate() - 14);
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('log_date, status, skip_reason, task_id')
      .eq('student_id', studentId)
      .gte('log_date', from.toISOString().split('T')[0])
      .order('log_date', { ascending: false });

    // Check if today is unlocked for this student
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];

    const { data: yesterdayLogs } = await supabase
      .from('daily_logs')
      .select('task_id, status, skip_reason')
      .eq('student_id', studentId)
      .eq('log_date', yesterdayKey);

    const taskIds = (tasks || []).map(t => t.id);
    const studentCreatedDate = student?.created_at
      ? new Date(student.created_at).toISOString().split('T')[0]
      : today;
    const isNewUser = studentCreatedDate >= today;

    const todayUnlocked =
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
      todayUnlocked,
      yesterdayKey,
    });
  }

  if (req.method === 'PUT') {
    const { track, tasks } = req.body;

    if (track) {
      await supabase.from('students').update({ track }).eq('id', studentId);
    }

    if (tasks) {
      await supabase.from('student_tasks').delete().eq('student_id', studentId);
      const toInsert = tasks.map((t, i) => ({
        student_id: studentId,
        task_order: i + 1,
        time_slot: t.time_slot,
        task_name: t.task_name,
        tag: t.tag,
        is_required: t.is_required !== false,
      }));
      await supabase.from('student_tasks').insert(toInsert);
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

export default requireAdmin(handler);
