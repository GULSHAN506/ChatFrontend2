const formatTime = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function VoiceRecorder({ time, onCancel, onStop, darkMode = false }) {
  const bars = [10,18,12,24,16,29,14,22,11,27,18,31,15,25,12,20,28,16,23,11,26,17,30,14,21,12,25,18,28,15,22,11,27,16,24,13,29,18,23,12];
  return (
    <div className={`mx-auto flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 ${darkMode ? "border-white/10 bg-[#0d1b31]" : "border-[var(--accent)]/20 bg-white"}`}>
      <button type="button" onClick={onCancel} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-500" aria-label="Cancel recording"><span className="text-lg leading-none">×</span></button>
      <div className="flex shrink-0 items-center gap-2 text-xs font-semibold"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"/> {formatTime(time)}</div>
      <div className="relative flex h-10 min-w-0 flex-1 items-center overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/90 to-transparent dark:from-[#0d1b31]"/>
        <div className="flex h-full min-w-max items-center gap-[3px] animate-[voiceflow_2.2s_linear_infinite]">
          {[...bars, ...bars].map((height, i) => <span key={i} className="w-[3px] shrink-0 rounded-full bg-[var(--accent)] opacity-80" style={{height: `${height}px`}}/>) }
        </div>
      </div>
      <button type="button" onClick={onStop} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow" aria-label="Stop recording"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button>
    </div>
  );
}
