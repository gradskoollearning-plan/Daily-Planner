import { supabase } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth';

async function handler(req, res) {
  const studentId = req.user.id;

  // GET — list all events, mark which ones this student attempted
  if (req.method === 'GET') {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('launch_date', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const { data: attempts } = await supabase
      .from('event_attempts')
      .select('event_id')
      .eq('student_id', studentId);

    const attemptedIds = new Set((attempts || []).map(a => a.event_id));

    const enriched = (events || []).map(ev => ({
      ...ev,
      attempted: attemptedIds.has(ev.id),
    }));

    return res.status(200).json({ events: enriched });
  }

  // POST — mark event as attempted
  if (req.method === 'POST') {
    const { event_id } = req.body;
    if (!event_id) return res.status(400).json({ error: 'event_id is required.' });

    const { error } = await supabase
      .from('event_attempts')
      .upsert({ student_id: studentId, event_id }, { onConflict: 'student_id,event_id' });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

export default requireAuth(handler);
