'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { runGPUStressTest } from '../benchmark/gpu';
import { supabase } from '../utils/supabase';

type AppState = 'IDLE' | 'CPU_TEST' | 'GPU_TEST' | 'RESULTS' | 'LEADERBOARD';

interface ScoreRecord {
  id: string;
  username: string;
  cpu_score: number;
  gpu_score: number;
  overall_score: number;
}

function AnimatedCounter({ target, duration = 1800 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return <>{display.toLocaleString()}</>;
}

function ScoreRing({
  score,
  max = 100000,
  color,
  label,
  size = 120,
}: {
  score: number;
  max?: number;
  color: string;
  label: string;
  size?: number;
}) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / max, 1);
  const [offset, setOffset] = useState(circ);
  useEffect(() => {
    const timer = setTimeout(() => setOffset(circ * (1 - pct)), 80);
    return () => clearTimeout(timer);
  }, [pct, circ]);
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="text-center -mt-1">
        <div className="text-xs font-medium tracking-wide" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>
        <div className="text-xl font-semibold tabular-nums" style={{ color }}>
          <AnimatedCounter target={score} />
        </div>
      </div>
    </div>
  );
}

function LiveWaveform({ active, color }: { active: boolean; color: string }) {
  const bars = 28;
  return (
    <div className="flex items-end gap-[3px] h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3, borderRadius: 2, backgroundColor: color,
            opacity: active ? 0.7 : 0.15,
            height: active ? undefined : 4, minHeight: 4,
            animation: active ? `wave ${0.6 + (i % 5) * 0.12}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${(i * 0.04).toFixed(2)}s`,
          }}
        />
      ))}
      <style>{`@keyframes wave { from { height: 4px; } to { height: ${Math.floor(Math.random() * 16 + 8)}px; } }`}</style>
    </div>
  );
}

function ProgressArc({ progress, color }: { progress: number; color: string }) {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress / 100);
  return (
    <svg width={176} height={176} viewBox="0 0 176 176">
      <circle cx={88} cy={88} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
      <circle
        cx={88} cy={88} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '88px 88px', transition: 'stroke-dashoffset 0.25s ease-out' }}
      />
      <text x={88} y={84} textAnchor="middle" fill="white" fontSize={28} fontWeight={600} fontFamily="system-ui, -apple-system, sans-serif">{progress}%</text>
      <text x={88} y={105} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={11} fontFamily="system-ui, -apple-system, sans-serif" letterSpacing={2}>COMPLETE</text>
    </svg>
  );
}

export default function NanoBenchDashboard() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [progress, setProgress] = useState(0);
  const [scores, setScores] = useState({ cpu: 0, gpu: 0, overall: 0 });
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreRecord[]>([]);
  const [aiReport, setAiReport] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => { workerRef.current?.terminate(); }, []);

  const startBenchmark = useCallback(() => {
    setAppState('CPU_TEST');
    setProgress(0);
    setScores({ cpu: 0, gpu: 0, overall: 0 });
    setAiReport('');
    workerRef.current = new Worker(new URL('./workers/cpu.worker.ts', import.meta.url));
    workerRef.current.onmessage = async (e) => {
      if (e.data.type === 'PROGRESS') setProgress(e.data.payload);
      if (e.data.type === 'COMPLETE') {
        const cpuScore = e.data.payload.score;
        workerRef.current?.terminate();
        setAppState('GPU_TEST');
        setProgress(0);
        try {
          const gpuScore = await runGPUStressTest((p: number) => setProgress(p));
          const overall = Math.floor((cpuScore * 0.5) + (gpuScore * 0.5));
          setScores({ cpu: cpuScore, gpu: gpuScore, overall });
          setAppState('RESULTS');
        } catch {
          setScores({ cpu: cpuScore, gpu: 0, overall: cpuScore });
          setAppState('RESULTS');
        }
      }
    };
    workerRef.current.postMessage({ type: 'START_CPU_TEST' });
  }, []);

  const generateAIReport = useCallback(async () => {
    setIsAnalyzing(true);
    setAiReport('Connecting to analysis engine…');
    try {
      const res = await fetch('/api/analyst', { method: 'POST', body: JSON.stringify(scores) });
      const data = await res.json();
      setAiReport(data.analysis || 'Analysis unavailable.');
    } catch {
      setAiReport('Connection failed. Please try again.');
    }
    setIsAnalyzing(false);
  }, [scores]);

  const submitScore = useCallback(async () => {
    if (!username.trim()) return alert('Please enter a username.');
    setIsSubmitting(true);
    const { error } = await supabase.from('leaderboard').insert([
      { username: username.trim(), cpu_score: scores.cpu, gpu_score: scores.gpu, overall_score: scores.overall }
    ]);
    if (error) { alert('Failed to save score: ' + error.message); setIsSubmitting(false); return; }
    fetchLeaderboard();
  }, [username, scores]);

  const fetchLeaderboard = useCallback(async () => {
    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('leaderboard').select('*').order('overall_score', { ascending: false }).limit(10);
    if (error) alert('Failed to load leaderboard: ' + error.message);
    else { setLeaderboard(data || []); setAppState('LEADERBOARD'); }
    setIsSubmitting(false);
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    setAppState('IDLE');
    setProgress(0);
    setUsername('');
    setAiReport('');
  }, []);

  const isCPU = appState === 'CPU_TEST';
  const accentColor = isCPU ? '#76b900' : '#a78bfa';

  return (
    <main
      className="min-h-screen text-white flex flex-col relative overflow-hidden"
      style={{ background: '#080808', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}
    >
      {/* Atmosphere */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '80vw', height: '60vh', background: 'radial-gradient(ellipse at 50% 0%, rgba(118,185,0,0.07) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '20%', width: '50vw', height: '40vh', background: 'radial-gradient(ellipse at 80% 100%, rgba(167,139,250,0.05) 0%, transparent 60%)' }} />
      </div>

      {/* Nav */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5"
        style={{ background: 'rgba(8,8,8,0.6)', backdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <button onClick={reset} className="flex items-center gap-2.5" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#76b900', boxShadow: '0 0 6px rgba(118,185,0,0.6)' }} />
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.3px', color: 'white' }}>NanoBench</span>
        </button>
        <nav className="flex items-center gap-6">
          <button
            onClick={fetchLeaderboard}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit' }}
          >
            Leaderboard
          </button>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#76b900', display: 'inline-block' }} />
            Network Online
          </span>
        </nav>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6" style={{ paddingTop: 80, paddingBottom: 60 }}>

        {/* IDLE */}
        {appState === 'IDLE' && (
          <div className="flex flex-col items-center text-center" style={{ gap: 48, maxWidth: 640, animation: 'fadeUp 0.7s ease both' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', color: '#76b900', textTransform: 'uppercase' }}>
              Silicon Performance Suite
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(52px, 9vw, 88px)', fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.04em', margin: 0, background: 'linear-gradient(160deg, #fff 40%, rgba(255,255,255,0.4))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Know Your<br />Machine
              </h1>
              <p style={{ marginTop: 20, fontSize: 17, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, fontWeight: 400, letterSpacing: '-0.01em' }}>
                A precision benchmark for CPU and GPU workloads.<br />See where your hardware stands globally.
              </p>
            </div>
            <button
              onClick={startBenchmark}
              style={{ padding: '15px 44px', borderRadius: 14, border: '1px solid rgba(118,185,0,0.3)', background: 'linear-gradient(135deg, rgba(118,185,0,0.15), rgba(118,185,0,0.06))', color: '#76b900', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', cursor: 'pointer', transition: 'all 0.25s ease', backdropFilter: 'blur(12px)', fontFamily: 'inherit' }}
            >
              Start Benchmark
            </button>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Multi-thread CPU', 'WebGPU Shader', 'Global Ranking'].map(label => (
                <span key={label} style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{label}</span>
              ))}
            </div>
          </div>
        )}

        {/* RUNNING */}
        {(appState === 'CPU_TEST' || appState === 'GPU_TEST') && (
          <div style={{ width: '100%', maxWidth: 560, background: 'rgba(255,255,255,0.026)', backdropFilter: 'blur(40px)', borderRadius: 28, border: '1px solid rgba(255,255,255,0.07)', padding: '52px 48px', animation: 'fadeUp 0.5s ease both' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: accentColor, marginBottom: 36 }}>
              {isCPU ? 'Phase 1 of 2 — CPU' : 'Phase 2 of 2 — GPU'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
              <ProgressArc progress={progress} color={accentColor} />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
              {isCPU ? 'Multi-thread stress test' : 'GPU shader compute'}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: '0 0 32px', lineHeight: 1.5 }}>
              {isCPU ? 'Running parallel matrix operations across all available threads.' : 'Executing trigonometric kernel allocations on the GPU.'}
            </p>
            <div style={{ marginBottom: 32 }}>
              <LiveWaveform active={true} color={accentColor} />
            </div>
            <button onClick={reset} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              Cancel test
            </button>
          </div>
        )}

        {/* RESULTS */}
        {appState === 'RESULTS' && (
          <div style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeUp 0.6s ease both' }}>
            <div style={{ background: 'rgba(255,255,255,0.026)', backdropFilter: 'blur(40px)', borderRadius: 28, border: '1px solid rgba(255,255,255,0.07)', padding: '48px 40px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>Overall Score</p>
              <div style={{ fontSize: 'clamp(64px, 12vw, 96px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, background: 'linear-gradient(135deg, #fff 50%, rgba(255,255,255,0.5))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedCounter target={scores.overall} />
              </div>
              <p style={{ marginTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>Combined CPU + GPU performance index</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[{ label: 'CPU Score', score: scores.cpu, color: '#76b900' }, { label: 'GPU Score', score: scores.gpu, color: '#a78bfa' }].map(({ label, score, color }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.026)', backdropFilter: 'blur(40px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.07)', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{label}</p>
                  <ScoreRing score={score} color={color} label="" size={130} />
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(118,185,0,0.04)', backdropFilter: 'blur(40px)', borderRadius: 24, border: '1px solid rgba(118,185,0,0.12)', padding: '28px 32px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(118,185,0,0.7)', margin: '0 0 16px' }}>AI Analysis</p>
              {aiReport ? (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: 0 }}>{aiReport}</p>
              ) : (
                <button onClick={generateAIReport} disabled={isAnalyzing} style={{ width: '100%', padding: '13px 24px', borderRadius: 12, border: '1px solid rgba(118,185,0,0.2)', background: 'rgba(118,185,0,0.07)', color: isAnalyzing ? 'rgba(118,185,0,0.4)' : '#76b900', fontSize: 14, fontWeight: 600, cursor: isAnalyzing ? 'default' : 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit' }}>
                  {isAnalyzing ? 'Analyzing hardware profile…' : 'Get AI Performance Report'}
                </button>
              )}
            </div>

            <div style={{ background: 'rgba(255,255,255,0.026)', backdropFilter: 'blur(40px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.07)', padding: '28px 32px' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: '0 0 16px' }}>Submit to Leaderboard</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <input type="text" maxLength={15} placeholder="Your username" value={username} onChange={e => setUsername(e.target.value)}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'inherit' }}
                />
                <button onClick={submitScore} disabled={isSubmitting} style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: isSubmitting ? 'rgba(255,255,255,0.1)' : 'white', color: isSubmitting ? 'rgba(0,0,0,0.4)' : '#080808', fontSize: 14, fontWeight: 600, cursor: isSubmitting ? 'default' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {isSubmitting ? 'Saving…' : 'Submit'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button onClick={reset} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Run again</button>
            </div>
          </div>
        )}

        {/* LEADERBOARD */}
        {appState === 'LEADERBOARD' && (
          <div style={{ width: '100%', maxWidth: 700, animation: 'fadeUp 0.5s ease both' }}>
            <div style={{ marginBottom: 40, textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#76b900', margin: '0 0 10px' }}>Global Rankings</p>
              <h2 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', margin: 0, background: 'linear-gradient(160deg, #fff 40%, rgba(255,255,255,0.4))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Top performers
              </h2>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.026)', backdropFilter: 'blur(40px)', borderRadius: 24, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 120px 120px', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                {['Rank', 'Username', 'CPU / GPU', 'Score'].map((h, i) => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</span>
                ))}
              </div>
              <div style={{ maxHeight: 440, overflowY: 'auto' }}>
                {leaderboard.length === 0 ? (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>No results recorded yet.</div>
                ) : leaderboard.map((record, index) => {
                  const isFirst = index === 0;
                  return (
                    <div key={record.id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 120px 120px', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center', background: isFirst ? 'rgba(118,185,0,0.05)' : 'transparent' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isFirst ? '#76b900' : 'rgba(255,255,255,0.2)' }}>#{index + 1}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: isFirst ? 'white' : 'rgba(255,255,255,0.7)', letterSpacing: '-0.01em' }}>{record.username}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, color: '#76b900', display: 'block' }}>{record.cpu_score.toLocaleString()}</span>
                        <span style={{ fontSize: 11, color: '#a78bfa', display: 'block' }}>{record.gpu_score.toLocaleString()}</span>
                      </div>
                      <span style={{ textAlign: 'right', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: isFirst ? 'white' : 'rgba(255,255,255,0.6)' }}>
                        {record.overall_score.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <button onClick={reset} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Back to benchmark</button>
            </div>
          </div>
        )}
      </div>

      <footer className="relative z-10 flex justify-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '20px 0 32px' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>NanoBench · Precision hardware intelligence</span>
      </footer>

      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        ::placeholder { color: rgba(255,255,255,0.2); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        * { box-sizing: border-box; }
      `}</style>
    </main>
  );
}
