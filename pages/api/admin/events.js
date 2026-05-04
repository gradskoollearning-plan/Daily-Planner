import { supabase } from '../../../lib/supabase';
import { requireAdmin } from '../../../lib/auth';

async function handler(req, res) {

  // GET — list all events with attempt counts
  if (req.method === 'GET') {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('launch_date', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Attach attempt counts per event
    const enriched = await Promise.all((events || []).map(async ev => {
      const { count } = await supabase
        .from('event_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', ev.id);
      return { ...ev, attemptCount: count || 0 };
    }));

    return res.status(200).json({ events: enriched });
  }

  // POST — create event
  if (req.method === 'POST') {
    const { type, name, launch_date, link } = req.body;
    if (!type || !name || !launch_date) {
      return res.status(400).json({ error: 'type, name and launch_date are required.' });
    }
    const { data, error } = await supabase
      .from('events')
      .insert({ type, name, launch_date, link: link || null })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ event: data });
  }

  // PUT — update event
  if (req.method === 'PUT') {
    const { id, type, name, launch_date, link } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required.' });
    const { data, error } = await supabase
      .from('events')
      .update({ type, name, launch_date, link: link || null })
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ event: data });
  }

  // DELETE — delete event
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id is required.' });
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}

export default requireAdmin(handler);
