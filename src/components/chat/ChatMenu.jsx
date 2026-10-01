const Icon = ({ type }) => {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    moon: <><path d="M20.5 14.7A8.5 8.5 0 0 1 9.3 3.5 8.5 8.5 0 1 0 20.5 14.7Z"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/></>,
    select: <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/></>,
    timer: <><circle cx="12" cy="13" r="7"/><path d="M12 9v4l2.5 1.5M9 3h6"/></>,
    heart: <path d="M20.8 8.7c0 5-8.8 10.1-8.8 10.1S3.2 13.7 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z"/>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14.5a4.5 4.5 0 0 1 3.5 4.5"/></>,
    clear: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"/><path d="M10 11v5M14 11v5"/></>,
    leave: <><path d="M10 17l5-5-5-5M15 12H3M13 4h5v16h-5"/></>,
  };
  return <svg {...p}>{paths[type]}</svg>;
};

export default function ChatMenu({ darkMode, onDarkMode, onLightMode, onSearch, onSelectMessages, disappearingMessages, onDisappearing, onFavorite, onClear, onGroupInfo, onLeave }) {
  const item = "flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[var(--accent)]/12";
  const icon = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--accent)]";
  return (
    <div data-floating-menu className={`absolute right-3 top-[58px] z-[120] w-64 overflow-hidden rounded-2xl border p-2 shadow-[0_18px_50px_rgba(7,31,73,.25)] ${darkMode ? "border-white/10 bg-[#0b1629] text-white" : "border-[var(--accent)]/20 bg-white text-[#071F49]"}`}>
      <button className={item} onClick={onDarkMode}><span className={icon}><Icon type="moon"/></span>Dark Mode</button>
      <button className={item} onClick={onLightMode}><span className={icon}><Icon type="sun"/></span>Light Mode</button>
      <button className={item} onClick={onSearch}><span className={icon}><Icon type="search"/></span>Search</button>
      <button className={item} onClick={onSelectMessages}><span className={icon}><Icon type="select"/></span>Select Messages</button>
      <button className={item} onClick={onDisappearing}><span className={icon}><Icon type="timer"/></span><span className="flex-1">Disappearing Messages</span>{disappearingMessages && <span className="text-xs font-bold text-[var(--accent)]">ON</span>}</button>
      <button className={item} onClick={onFavorite}><span className={icon}><Icon type="heart"/></span>Add Favourites</button>
      <button className={item} onClick={onGroupInfo}><span className={icon}><Icon type="users"/></span>Group Info</button>
      <div className={`my-1 border-t ${darkMode ? "border-white/10" : "border-[var(--accent)]/20"}`} />
      <button className={`${item} text-red-500`} onClick={onClear}><span className="flex h-8 w-8 items-center justify-center rounded-full"><Icon type="clear"/></span>Clear Chat</button>
      <button className={`${item} text-red-500`} onClick={onLeave}><span className="flex h-8 w-8 items-center justify-center rounded-full"><Icon type="leave"/></span>Leave Group</button>
    </div>
  );
}
