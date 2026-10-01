import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const formatDuration = (seconds = 0) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60
  ).padStart(2, "0")}`;

const Icon = ({ type, size = 16 }) => {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const b = {
    reply: (
      <>
        <path d="M9 15 4 10l5-5" />
        <path d="M4 10h10a6 6 0 0 1 6 6v2" />
      </>
    ),

    copy: (
      <>
        <rect x="8" y="8" width="11" height="12" rx="2" />
        <path d="M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),

    pin: (
      <>
        <path d="m9 3 6 6M7 9l8 8M11 13l-7 7M14 6l4-3 3 3-3 4M17 10l4 3-3 3-4-3" />
      </>
    ),

    heart: (
      <path d="M20.8 8.7c0 5-8.8 10.1-8.8 10.1S3.2 13.7 3.2 8.7A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.5Z" />
    ),

    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),

    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),

    download: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
      </>
    ),

    play: <path d="m9 6 10 6-10 6z" />,

    pause: (
      <>
        <path d="M8 6v12M16 6v12" />
      </>
    ),

    mic: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
      </>
    ),
  };

  return <svg {...p}>{b[type]}</svg>;
};

/* =========================================================
   GLASS MESSAGE BUBBLE COLORS
   ========================================================= */

const LIGHT_OWN_BUBBLE =
  "bg-[var(--accent)]/40 border border-[var(--accent)]/60 backdrop-blur-xl shadow-[0_5px_24px_rgba(151,139,33,0.30),inset_0_1px_0_rgba(255,255,255,0.45)]";

const DARK_OWN_BUBBLE =
  "bg-[#123d78]/85 border border-[#3B82F6]/70 backdrop-blur-xl shadow-[0_5px_26px_rgba(0,0,0,0.35),0_0_18px_rgba(59,130,246,0.22),inset_0_1px_0_rgba(255,255,255,0.16)]";

const LIGHT_OTHER_BUBBLE =
  "bg-[#d9d6a8]/65 border border-[var(--accent)]/35 backdrop-blur-xl shadow-[0_5px_20px_rgba(151,139,33,0.18),inset_0_1px_0_rgba(255,255,255,0.55)]";

const DARK_OTHER_BUBBLE =
  "bg-[#18304f]/85 border border-[#3B82F6]/35 backdrop-blur-xl shadow-[0_5px_22px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]";

/* =========================================================
   VIEW ONCE
   ========================================================= */

function ViewOnce({
  opened,
  loading,
  onOpen,
  label = "Photo",
}) {
  if (opened) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-[var(--accent)]/15 px-3 py-2 text-xs">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--accent)]/40 text-[var(--accent)]">
          ✓
        </span>

        Viewed once
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-2 rounded-xl px-2 py-1 text-left text-xs font-semibold"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-current">
        1
      </span>

      <span>
        {loading ? "Opening..." : `1 ${label}`}
      </span>
    </button>
  );
}

export default function MessageBubble({
  message,
  index,
  isOwn,
  darkMode,
  selected,
  highlighted,
  selectionMode,
  checked,
  pinned,
  favorite,
  highlightText,
  onSelect,
  onToggleSelect,
  onDelete,
  onCopy,
  onReply,
  onPin,
  onFavorite,
  onInfo,
  onOpenFile,
  onDownload,
}) {
  const bubbleRef = useRef(null);
  const audioRef = useRef(null);
  const menuRef = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [viewedOnce, setViewedOnce] = useState(false);
  const [loadingOnce, setLoadingOnce] = useState(false);

  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const isImage = message.fileType?.startsWith("image/");
  const isVideo = message.fileType?.startsWith("video/");
  const isAudio =
    message.fileType?.startsWith("audio/") ||
    Boolean(message.voiceData);

  /* =========================================================
     SELECT CORRECT BUBBLE
     ========================================================= */

  const bubble = isOwn
    ? darkMode
      ? DARK_OWN_BUBBLE
      : LIGHT_OWN_BUBBLE
    : darkMode
      ? DARK_OTHER_BUBBLE
      : LIGHT_OTHER_BUBBLE;

  /* =========================================================
     AUDIO EVENTS
     ========================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const update = () => {
      setProgress(
        audio.duration
          ? (audio.currentTime / audio.duration) * 100
          : 0
      );
    };

    const end = () => {
      setPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", update);
    audio.addEventListener("ended", end);

    return () => {
      audio.removeEventListener("timeupdate", update);
      audio.removeEventListener("ended", end);
    };
  }, []);

  /* =========================================================
     MESSAGE SELECT
     ========================================================= */

  const select = () => {
    if (selectionMode) {
      return onToggleSelect?.();
    }

    onSelect?.();
  };

  /* =========================================================
     ACTION MENU POSITION
     ========================================================= */

  const updateMenuPosition = () => {
    if (!selected || selectionMode) return;

    const bubble = bubbleRef.current;
    if (!bubble) return;

    const rect = bubble.getBoundingClientRect();
    const menuWidth = 208;
    const gap = 8;
    const menuHeight = menuRef.current?.getBoundingClientRect().height || 250;
    const navbarSafeArea = 72;
    const viewportPadding = 10;

    // Keep the menu with the message: prefer above, otherwise below.
    let top = rect.top - menuHeight - gap;
    if (top < navbarSafeArea) {
      top = rect.bottom + gap;
    }

    if (top + menuHeight > window.innerHeight - viewportPadding) {
      top = Math.max(
        navbarSafeArea,
        Math.min(rect.top, window.innerHeight - menuHeight - viewportPadding)
      );
    }

    // Align to the same side as the message without crossing the viewport.
    let left = isOwn ? rect.right - menuWidth : rect.left;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - menuWidth - viewportPadding)
    );

    setMenuPosition({ top, left });
  };

  /*
    Menu render hone ke baad actual height calculate karo.
  */

  useLayoutEffect(() => {
    if (!selected || selectionMode) return;

    updateMenuPosition();

    const frame = requestAnimationFrame(() => {
      updateMenuPosition();
    });

    return () => cancelAnimationFrame(frame);
  }, [selected, selectionMode, darkMode]);

  /*
    Scroll + resize par menu ki position update.
  */

  useEffect(() => {
    if (!selected || selectionMode) return;

    const handlePositionUpdate = () => {
      updateMenuPosition();
    };

    window.addEventListener(
      "scroll",
      handlePositionUpdate,
      true
    );

    window.addEventListener(
      "resize",
      handlePositionUpdate
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handlePositionUpdate,
        true
      );

      window.removeEventListener(
        "resize",
        handlePositionUpdate
      );
    };
  }, [selected, selectionMode]);

  /* =========================================================
     AUDIO PLAY / PAUSE
     ========================================================= */

  const toggleAudio = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    audio.playbackRate = speed;

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  /* =========================================================
     AUDIO SPEED
     ========================================================= */

  const changeSpeed = () =>
    setSpeed((s) =>
      s === 1 ? 1.5 : s === 1.5 ? 2 : 1
    );

  /* =========================================================
     VIEW ONCE
     ========================================================= */

  const openOnce = () => {
    if (viewedOnce || loadingOnce) return;

    setLoadingOnce(true);

    window.setTimeout(() => {
      setLoadingOnce(false);
      setViewedOnce(true);
    }, 3000);
  };

  /* =========================================================
     ACTION MENU
     ========================================================= */

  const actionMenu =
    selected &&
    !selectionMode &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            data-floating-menu
            className="fixed z-[999999]"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: "208px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-full rounded-2xl border p-1.5 shadow-[0_16px_45px_rgba(0,0,0,0.38)] backdrop-blur-xl ${
                darkMode
                  ? "border-[var(--accent)]/50 bg-[#101b2b]/98 text-white"
                  : "border-[var(--accent)]/45 bg-[#f7f6d0]/98 text-[#071F49]"
              }`}
            >
              <button
                type="button"
                onClick={onReply}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--accent)]/20"
              >
                <Icon type="reply" />
                Reply
              </button>

              <button
                type="button"
                onClick={onCopy}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--accent)]/20"
              >
                <Icon type="copy" />
                Copy
              </button>

              <button
                type="button"
                onClick={onPin}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--accent)]/20"
              >
                <Icon type="pin" />
                {pinned ? "Unpin" : "Pin"}
              </button>

              <button
                type="button"
                onClick={onFavorite}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--accent)]/20"
              >
                <Icon type="heart" />
                {favorite
                  ? "Unfavorite"
                  : "Favorite"}
              </button>

              {isOwn && onInfo && (
                <button
                  type="button"
                  onClick={onInfo}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--accent)]/20"
                >
                  <Icon type="info" />
                  Message Info
                </button>
              )}

              <button
                type="button"
                onClick={onDelete}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-red-500 transition-colors hover:bg-red-50"
              >
                <Icon type="trash" />
                Delete
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        data-message-root
        ref={bubbleRef}
        style={{ "--accent": darkMode ? "#3B82F6" : "#978B21" }}
        className={`group relative flex w-full ${
          isOwn ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`relative flex max-w-[92%] items-end sm:max-w-[78%] ${
            isOwn ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {/* =====================================================
              SELECTION CHECKBOX
          ===================================================== */}

          {selectionMode && (
            <button
              type="button"
              onClick={onToggleSelect}
              className={`absolute ${
                isOwn ? "-left-7" : "-right-7"
              } top-1/2 z-[300] flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md border ${
                checked
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : darkMode
                    ? "border-white/30 bg-[#0b1629]"
                    : "border-[#071F49]/25 bg-white"
              }`}
            >
              {checked ? "✓" : ""}
            </button>
          )}

          {/* =====================================================
              MESSAGE BUBBLE
          ===================================================== */}

          <div
            className={`relative z-20 min-w-[100px] overflow-visible rounded-[16px] px-3 py-2 transition-all duration-300 ${
              bubble
            } ${
              isOwn
                ? "rounded-br-[5px]"
                : "rounded-bl-[5px]"
            } ${
              highlighted
                ? darkMode
                  ? "ring-2 ring-[#3B82F6] ring-offset-2 shadow-[0_0_0_3px_rgba(59,130,246,0.22)]"
                  : "ring-2 ring-[#5f5816] ring-offset-2 shadow-[0_0_0_3px_rgba(95,88,22,0.22)]"
                : selected
                  ? "ring-2 ring-[var(--accent)] ring-offset-1"
                  : ""
            }`}
            onClick={select}
          >
            {/* GLASS SHINE */}

            <div
              className={`pointer-events-none absolute inset-0 z-0 rounded-[16px] ${
                isOwn
                  ? darkMode
                    ? "bg-gradient-to-br from-white/25 via-transparent to-[#123d78]/25"
                    : "bg-gradient-to-br from-white/25 via-transparent to-[var(--accent)]/20"
                  : darkMode
                    ? "bg-gradient-to-br from-white/25 via-transparent to-[#3B82F6]/10"
                    : "bg-gradient-to-br from-white/25 via-transparent to-[var(--accent)]/10"
              }`}
            />

            {/* TOP GLASS HIGHLIGHT */}

            <div className="pointer-events-none absolute left-2 right-2 top-[1px] z-0 h-[1px] rounded-full bg-white/45" />

            {/* ===================================================
                CONTENT
            =================================================== */}

            <div className="relative z-10">
              {/* USERNAME */}

              {!isOwn && (
                <div className="mb-0.5 text-[10px] font-bold text-[#a14a32]">
                  {message.username}
                </div>
              )}

              {/* REPLY PREVIEW */}

              {message.replyTo && (
                <div className="mb-1 rounded-md border-l-2 border-[#a14a32] bg-white/30 px-2 py-1 text-[10px] backdrop-blur-sm">
                  <strong>
                    {message.replyTo.username}
                  </strong>

                  <div className="truncate opacity-70">
                    {message.replyTo.text ||
                      "Media message"}
                  </div>
                </div>
              )}

              {/* TEXT */}

              {message.text && (
                <p
                  className={`whitespace-pre-wrap break-words text-sm leading-[1.35] ${
                    darkMode
                      ? "text-white"
                      : "text-[#071F49]"
                  }`}
                >
                  {highlightText(message.text)}
                </p>
              )}

              {/* IMAGE */}

              {isImage && (
                <div className="mt-1 overflow-hidden rounded-xl">
                  {message.viewOnce ? (
                    <ViewOnce
                      opened={viewedOnce}
                      loading={loadingOnce}
                      onOpen={openOnce}
                    />
                  ) : (
                    <>
                      <img
                        src={message.fileData}
                        alt={
                          message.fileName || "Image"
                        }
                        className="max-h-[330px] w-full min-w-[160px] rounded-xl object-cover"
                      />

                      <div className="mt-1 flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFile?.();
                          }}
                          className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                            darkMode
                              ? "text-white"
                              : "text-[#071F49]"
                          }`}
                        >
                          Open
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownload?.();
                          }}
                          className={`rounded-md p-1.5 ${
                            darkMode
                              ? "text-white"
                              : "text-[#071F49]"
                          }`}
                        >
                          <Icon
                            type="download"
                            size={13}
                          />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* VIDEO */}

              {isVideo && (
                <div className="mt-1 overflow-hidden rounded-xl">
                  {message.viewOnce ? (
                    <ViewOnce
                      opened={viewedOnce}
                      loading={loadingOnce}
                      onOpen={openOnce}
                      label="Video"
                    />
                  ) : (
                    <video
                      src={message.fileData}
                      controls
                      className="max-h-[330px] w-full min-w-[200px] rounded-xl"
                    />
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload?.();
                    }}
                    className={`mt-1 flex items-center gap-1 text-[10px] font-semibold ${
                      darkMode
                        ? "text-white"
                        : "text-[#071F49]"
                    }`}
                  >
                    <Icon
                      type="download"
                      size={13}
                    />
                    Save
                  </button>
                </div>
              )}

              {/* DOCUMENT */}

              {!isImage &&
                !isVideo &&
                !isAudio &&
                message.fileData && (
                  <div className="mt-1 flex min-w-[245px] items-center gap-2 rounded-xl bg-white/40 p-2 backdrop-blur-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#071F49] text-[9px] font-bold text-white">
                      DOC
                    </div>

                    <div className="min-w-0 flex-1">
                      <strong
                        className={`block truncate text-xs ${
                          darkMode
                            ? "text-white"
                            : "text-[#071F49]"
                        }`}
                      >
                        {message.fileName ||
                          "Document"}
                      </strong>

                      <span
                        className={`text-[10px] ${
                          darkMode
                            ? "text-white/55"
                            : "text-[#071F49]/55"
                        }`}
                      >
                        Document
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFile?.();
                      }}
                      className={`rounded-md p-1.5 ${
                        darkMode
                          ? "text-white"
                          : "text-[#071F49]"
                      }`}
                    >
                      Open
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload?.();
                      }}
                      className={`rounded-md p-1.5 ${
                        darkMode
                          ? "text-white"
                          : "text-[#071F49]"
                      }`}
                    >
                      <Icon type="download" />
                    </button>
                  </div>
                )}

              {/* AUDIO / VOICE */}

              {isAudio && (
                <div className="mt-1 flex min-w-[270px] items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAudio();
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center bg-transparent text-[var(--accent)]"
                    aria-label={playing ? "Pause voice message" : "Play voice message"}
                  >
                    {playing ? (
                      <Icon type="pause" />
                    ) : (
                      <span className="text-lg leading-none">▶</span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex h-7 items-center gap-[2px]">
                      {Array.from({
                        length: 28,
                      }).map((_, i) => (
                        <span
                          key={i}
                          className="w-[3px] rounded-full bg-[var(--accent)]/45"
                          style={{
                            height: `${
                              7 + ((i * 13) % 18)
                            }px`,
                          }}
                        />
                      ))}
                    </div>

                    <div className="h-[2px] overflow-hidden rounded-full bg-[var(--accent)]/15">
                      <span
                        className="block h-full bg-[var(--accent)]"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeSpeed();
                    }}
                    className="text-[9px] font-bold text-[var(--accent)]"
                  >
                    {speed}x
                  </button>

                  <span className="text-[9px] text-[var(--accent)]/60">
                    {formatDuration(
                      message.voiceDuration
                    )}
                  </span>

                  <audio
                    ref={audioRef}
                    src={
                      message.voiceData ||
                      message.fileData
                    }
                    preload="metadata"
                  />
                </div>
              )}

              {/* MESSAGE TIME */}

              <div
                className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                  darkMode
                    ? "text-white/55"
                    : "text-[#071F49]/55"
                }`}
              >
                {pinned && <span>📌</span>}

                {favorite && <span>♥</span>}

                {message.time}

                {isOwn && (
                  <span
                    className={
                      darkMode
                        ? "text-white"
                        : "text-[#071F49]"
                    }
                  >
                    ✓✓
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =======================================================
          PORTAL ACTION MENU
          THIS IS OUTSIDE THE CHAT CONTAINER
          SO NAVBAR / OVERFLOW CANNOT HIDE IT
      ======================================================= */}

      {actionMenu}
    </>
  );
}