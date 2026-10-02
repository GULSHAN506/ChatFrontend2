const Icon = ({ type }) => {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const body = {
    document:<><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    image:<><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5 17 4-4 3 3 2-2 5 4"/></>,
    video:<><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></>,
  };
  return <svg {...p}>{body[type]}</svg>;
};

export default function AttachmentMenu({ onDocument, onPhoto, onVideo, darkMode = false }) {
  const item = `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${darkMode ? "text-white hover:bg-[#3B82F6]/15" : "text-[#071F49] hover:bg-[var(--accent)]/15"}`;
  return (
    <div data-floating-menu className={`absolute bottom-[76px] left-3 z-[120] w-56 overflow-hidden rounded-2xl border p-2 shadow-[0_18px_50px_rgba(7,31,73,.2)] ${darkMode ? "border-white/10 bg-[#0b1629]" : "border-[var(--accent)]/20 bg-white"}`}>
      <button type="button" onClick={onDocument} className={item}><span className="text-[var(--accent)]"><Icon type="document"/></span>Document</button>
      <button type="button" onClick={onPhoto} className={item}><span className="text-[var(--accent)]"><Icon type="image"/></span>Photos</button>
      <button type="button" onClick={onVideo} className={item}><span className="text-[var(--accent)]"><Icon type="video"/></span>Videos</button>
    </div>
  );
}
