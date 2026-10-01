const Icon = ({ type, size = 19 }) => {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "search") return <svg {...p}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></svg>;
  if (type === "menu") return <svg {...p}><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>;
  if (type === "close") return <svg {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  return null;
};

export default function ChatHeader({ room, members, memberCount, darkMode, showSearch, searchText, searchInputRef, onSearchChange, onSearch, onMenu }) {
  return (
    <header className={`relative z-40 flex min-h-[72px] shrink-0 items-center justify-between gap-3 px-4 py-2.5 shadow-sm ${darkMode ? "bg-[#071F49] text-white" : "bg-[#978B21] text-white"}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-lg font-bold ring-1 ring-white/30">{room?.charAt(0)?.toUpperCase() || "G"}</div>
        <div className="min-w-0">
          <span className="block text-[9px] font-bold tracking-[.22em] text-white/70">GROUP</span>
          <h2 className="max-w-[320px] truncate text-[15px] font-bold">{room}</h2>
          <p className="max-w-[420px] truncate text-[11px] text-white/75">{members.length ? members.join(", ") : `${memberCount} members`}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {showSearch && <div className="flex h-9 w-[190px] items-center gap-2 rounded-full border border-white/45 bg-white/10 px-3 sm:w-[280px]">
          <span className="text-white"><Icon type="search" size={17}/></span>
          <input ref={searchInputRef} value={searchText} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search messages..." className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/60"/>
          {searchText && <button type="button" onClick={() => onSearchChange("")} className="text-white"><Icon type="close" size={16}/></button>}
        </div>}
        <button type="button" onClick={onSearch} title="Search" className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"><Icon type="search"/></button>
        <button type="button" onClick={onMenu} title="Menu" className="flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/10"><Icon type="menu"/></button>
      </div>
    </header>
  );
}
