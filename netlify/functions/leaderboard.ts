import { getStore } from '@netlify/blobs';

interface ScoreRecord {
  id: string;
  username: string;
  cpu_score: number;
  gpu_score: number;
  overall_score: number;
}

export default async (req: Request) => {
  const store = getStore('leaderboard');

  if (req.method === 'POST') {
    const body = await req.json();
    const { username, cpu_score, gpu_score, overall_score } = body;
    if (!username || cpu_score == null || gpu_score == null || overall_score == null) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }
    const id = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record: ScoreRecord = { id, username: username.trim(), cpu_score, gpu_score, overall_score };
    await store.set(id, JSON.stringify(record));
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  if (req.method === 'GET') {
    const entries: ScoreRecord[] = [];
    const { blobs } = await store.list();
    for (const blob of blobs) {
      const raw = await store.get(blob.key);
      if (raw) entries.push(JSON.parse(raw));
    }
    entries.sort((a, b) => b.overall_score - a.overall_score);
    return new Response(JSON.stringify(entries.slice(0, 10)), { status: 200 });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
};
