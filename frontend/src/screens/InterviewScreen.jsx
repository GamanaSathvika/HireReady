import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useTimer } from '../hooks/useTimer';

/* ─── helpers ────────────────────────────────────────────────── */
function formatMMSS(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function parseDurationToSeconds(duration) {
  if (!duration) return 600;
  const numeric = Number(duration.replace(/\D/g, ''));
  if (Number.isNaN(numeric) || numeric <= 0) return 600;
  return numeric * 60;
}

/* ─── sub-components ─────────────────────────────────────────── */

/** Minimal top bar */
function TopBar({ role, progressLabel, onExit }) {
  return (
    <div className="top-bar">
      <div className="top-bar-section top-bar-left">
        <span className="live-dot" aria-hidden="true" />
        <span className="live-label">LIVE</span>
      </div>

      <div className="top-bar-section top-bar-center">
        <span className="top-bar-role">{role ?? 'Interview'}</span>
      </div>

      <div className="top-bar-section top-bar-right">
        <span className="top-bar-timer" aria-label="Elapsed time">{progressLabel}</span>
        <button className="exit-btn" onClick={onExit} aria-label="Exit interview">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Exit
        </button>
      </div>
    </div>
  );
}

/** Status label */
function StatusLabel({ aiSpeaking, speaking, interviewEnded }) {
  let text = 'Listening…';
  let color = 'var(--text-muted)';

  if (interviewEnded) { 
    text = 'Session complete'; 
    color = 'var(--accent)'; 
  }
  else if (aiSpeaking) { 
    text = 'AI is speaking…'; 
    color = 'var(--text-secondary)'; 
  }
  else if (speaking) { 
    text = 'Listening to your response…'; 
    color = 'var(--text-secondary)'; 
  }

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={text}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25 }}
        className="status-label"
        style={{ color }}
      >
        {text}
      </motion.p>
    </AnimatePresence>
  );
}

/** Mic Orb Button */
function MicOrb({ active, aiSpeaking, onClick }) {
  return (
    <button
      className={`mic-orb ${active ? 'mic-orb--active' : ''} ${aiSpeaking ? 'mic-orb--ai' : ''}`}
      onClick={onClick}
      aria-label={active ? 'Stop recording' : 'Start recording'}
    >
      {active && (
        <>
          <span className="mic-ring mic-ring--1" aria-hidden="true" />
          <span className="mic-ring mic-ring--2" aria-hidden="true" />
        </>
      )}

      <span className="mic-core" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M19 11a7 7 0 0 1-14 0"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M12 18v3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </button>
  );
}

/** Waveform Visualizer */
function Waveform({ active }) {
  const bars = 28;
  return (
    <div className="waveform" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`waveform-bar ${active ? 'waveform-bar--active' : ''}`}
          style={{ animationDelay: `${(i * 0.04).toFixed(2)}s` }}
        />
      ))}
    </div>
  );
}

/** Ready Screen */
function ReadyScreen({ config, onStart }) {
  const items = [
    { icon: '🎤', title: 'Microphone enabled', sub: "We'll record your responses" },
    { icon: '🔇', title: 'Quiet environment', sub: 'Minimise background noise' },
    { icon: '⚡', title: 'Be clear & concise', sub: 'You can stop at any time' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="ready-screen"
    >
      <div className="ready-card">
        <header className="ready-card__header">
          <h2>Ready to begin?</h2>
          {config.role && <p>{config.role} Interview</p>}
        </header>

        <ul className="ready-card__list">
          {items.map(({ icon, title, sub }) => (
            <li key={title} className="ready-card__row">
              <span className="ready-card__icon">{icon}</span>
              <div>
                <p className="ready-card__item-title">{title}</p>
                <p className="ready-card__item-sub">{sub}</p>
              </div>
            </li>
          ))}
        </ul>

        <button className="start-btn" onClick={onStart}>
          Start Interview
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8 }}>
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export function InterviewScreen({ onAnswerCaptured, onExit, config = {} }) {
  const { status, error, blob, start, stop } = useMediaRecorder();
  const recording = status === 'recording';
  const stopped = status === 'stopped';

  const [started, setStarted] = useState(false);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const hasStoppedRef = useRef(false);

  const timer = useTimer({ running: started && !interviewEnded });

  const durationSeconds = useMemo(
    () => parseDurationToSeconds(config.duration),
    [config.duration]
  );

  const progressLabel = `${timer.mmss} / ${formatMMSS(durationSeconds)}`;

  /* Start Interview */
  const startInterview = async () => {
    setStarted(true);
    setAiSpeaking(true);
    setInterviewEnded(false);
    hasStoppedRef.current = false;
    await start();
    setTimeout(() => setAiSpeaking(false), 2500);
  };

  /* Pass recorded blob to parent */
  useEffect(() => {
    if (!blob || !stopped) return;
    onAnswerCaptured?.(blob);
  }, [blob, stopped, onAnswerCaptured]);

  /* Auto-stop when duration is reached */
  useEffect(() => {
    if (!started || interviewEnded) return;
    if (timer.seconds < durationSeconds) return;
    if (hasStoppedRef.current) return;

    hasStoppedRef.current = true;
    setInterviewEnded(true);
    stop();
  }, [durationSeconds, interviewEnded, started, stop, timer.seconds]);

  /* Update speaking state */
  useEffect(() => {
    setSpeaking(recording && !aiSpeaking);
  }, [recording, aiSpeaking]);

  function handleExit() {
    if (!hasStoppedRef.current && recording) {
      hasStoppedRef.current = true;
      stop();
    }
    onExit?.();
  }

  return (
    <div className="interview-shell">
      {/* Ambient background glow */}
      <div className="ambient-glow" aria-hidden="true" />

      <AnimatePresence mode="wait">
        {!started ? (
          <ReadyScreen key="ready" config={config} onStart={startInterview} />
        ) : (
          <motion.div
            key="live"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="live-layout"
          >
            <TopBar
              role={config.role}
              progressLabel={progressLabel}
              onExit={handleExit}
            />

            <main className="live-main">
              <StatusLabel
                aiSpeaking={aiSpeaking}
                speaking={speaking}
                interviewEnded={interviewEnded}
              />

              <MicOrb
                active={speaking}
                aiSpeaking={aiSpeaking}
                onClick={recording ? stop : start}
              />

              <Waveform active={speaking} />

              {!!error && (
                <p className="error-msg">
                  Microphone error — {String(error?.message ?? error)}
                </p>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}