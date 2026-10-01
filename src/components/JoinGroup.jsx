import { useEffect, useState } from "react";

const BLUE = "#3B82F6";
const ORANGE = "#978B21";

export default function JoinGroup({ onJoin }) {
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const typewriterTexts = [
    "Connect with your group.",
    "Chat with your members.",
    "Share ideas together.",
    "Stay connected easily.",
    "Create conversations that matter.",
  ];

  const [typedText, setTypedText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [isFading, setIsFading] = useState(false);

  /*
    TYPEWRITER
    Old text does NOT get deleted.
    It fades out, then the next text is typed.
  */
  useEffect(() => {
    const currentText = typewriterTexts[textIndex];

    if (isFading) {
      const fadeTimer = setTimeout(() => {
        setTypedText("");
        setIsFading(false);
        setIsTyping(true);
      }, 450);

      return () => clearTimeout(fadeTimer);
    }

    if (isTyping && typedText.length < currentText.length) {
      const typingTimer = setTimeout(() => {
        setTypedText(
          currentText.substring(0, typedText.length + 1)
        );
      }, 75);

      return () => clearTimeout(typingTimer);
    }

    if (
      isTyping &&
      typedText.length === currentText.length
    ) {
      const pauseTimer = setTimeout(() => {
        setIsTyping(false);
        setIsFading(true);
      }, 1700);

      return () => clearTimeout(pauseTimer);
    }

    if (!isTyping && !isFading) {
      setTextIndex(
        (prev) => (prev + 1) % typewriterTexts.length
      );
      setIsTyping(true);
    }
  }, [typedText, textIndex, isTyping, isFading]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    if (!room.trim()) {
      setError("Please enter a group name.");
      return;
    }

    setError("");

    onJoin({
      username: username.trim(),
      room: room.trim(),
    });
  };

  return (
    <main
      className={`relative h-screen w-full overflow-hidden transition-colors duration-300 ${
        darkMode
          ? "bg-[#071F49]"
          : "bg-[#F7F6D0]"
      }`}
      style={{ "--accent": darkMode ? BLUE : ORANGE }}
    >
      {/* TOP BAR */}
      <header className="absolute left-0 right-0 top-0 z-50 flex h-16 items-center justify-between px-4 sm:px-7">

        {/* GROUP CHAT + ICON */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-md ${
              darkMode
                ? "bg-[#132D4F]"
                : "bg-[var(--accent)]"
            }`}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M16 21V19C16 16.7909 14.2091 15 12 15H6C3.79086 15 2 16.7909 2 19V21"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />

              <circle
                cx="9"
                cy="7"
                r="4"
                stroke="white"
                strokeWidth="2"
              />

              <path
                d="M22 21V19C21.9986 17.1771 20.765 15.5857 19 15.13"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />

              <path
                d="M16 3.13C17.7699 3.5833 19.0076 5.1775 19.0076 7C19.0076 8.8225 17.7699 10.4167 16 10.87"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1
            className={`text-lg font-black tracking-wide sm:text-xl ${
              darkMode
                ? "text-white"
                : "text-[var(--accent)]"
            }`}
          >
            GROUP CHAT
          </h1>
        </div>

        {/* THEME TOGGLE */}
        <div
          className={`flex items-center gap-1 rounded-full border p-1 shadow-sm ${
            darkMode
              ? "border-white/20 bg-white/10"
              : "border-[var(--accent)]/25 bg-white/70"
          }`}
        >
          <button
            type="button"
            onClick={() => setDarkMode(false)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition sm:px-4 sm:py-2 sm:text-xs ${
              !darkMode
                ? "bg-[var(--accent)] text-white shadow"
                : "text-white/80 hover:bg-white/10"
            }`}
          >
            Light
          </button>

          <button
            type="button"
            onClick={() => setDarkMode(true)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition sm:px-4 sm:py-2 sm:text-xs ${
              darkMode
                ? "bg-[#132D4F] text-white shadow"
                : "text-[#071F49]/60 hover:bg-[var(--accent)]/10"
            }`}
          >
            Dark
          </button>
        </div>
      </header>

      {/* MAIN AREA */}
      <div className="relative z-20 flex h-screen w-full items-center justify-center px-5 pb-8 pt-16 sm:px-8 sm:pt-14">

        <div className="relative h-[min(76vh,620px)] w-[min(88vw,850px)]">

          {/* =====================================================
              GREEN / MEHNDI BACK CARD
              Slightly tilted and visible around the front card.
             ===================================================== */}
          <div
            className={`back-card absolute inset-0 rounded-[30px] border-2 border-[var(--accent)] ${
              darkMode
                ? "bg-[#132D4F]"
                : "bg-[var(--accent)]"
            }`}
          />

          {/* FRONT CARD */}
          <section
            className={`absolute inset-0 z-10 flex flex-col justify-center rounded-[30px] border-2 border-[var(--accent)] px-6 py-5 shadow-[0_20px_55px_rgba(7,31,73,.18)] sm:px-10 sm:py-7 lg:px-14 ${
              darkMode
                ? "bg-[#0a1830]"
                : "bg-[#F7F6D0]"
            }`}
          >
            <div className="mx-auto w-full max-w-2xl">

              {/* ICON */}
              <div className="mb-3 flex justify-center">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${
                    darkMode
                      ? "bg-[#132D4F]"
                      : "bg-[var(--accent)]"
                  }`}
                >
                  <svg
                    width="29"
                    height="29"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16 21V19C16 16.7909 14.2091 15 12 15H6C3.79086 15 2 16.7909 2 19V21"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    <circle
                      cx="9"
                      cy="7"
                      r="4"
                      stroke="white"
                      strokeWidth="2"
                    />

                    <path
                      d="M22 21V19C21.9986 17.1771 20.765 15.5857 19 15.13"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />

                    <path
                      d="M16 3.13C17.7699 3.5833 19.0076 5.1775 19.0076 7C19.0076 8.8225 17.7699 10.4167 16 10.87"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>

              {/* TITLE */}
              <div className="mb-5 text-center">
                <h2 className="text-3xl font-black text-[var(--accent)] sm:text-4xl lg:text-5xl">
                  Join your group
                </h2>
              </div>

              {/* TYPEWRITER */}
              <div className="mb-6 flex min-h-[30px] items-center justify-center">
                <p
                  className={`text-center text-sm font-semibold transition-opacity duration-400 sm:text-base ${
                    isFading
                      ? "opacity-0"
                      : "opacity-100"
                  } ${
                    darkMode
                      ? "text-white/75"
                      : "text-[#071F49]/70"
                  }`}
                >
                  {typedText}

                  {!isFading && (
                    <span
                      className={`ml-1 inline-block h-4 w-[2px] animate-pulse align-middle ${
                        darkMode
                          ? "bg-white"
                          : "bg-[var(--accent)]"
                      }`}
                    />
                  )}
                </p>
              </div>

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="space-y-4 sm:space-y-5"
              >

                {/* USERNAME */}
                <div>
                  <label
                    className={`mb-2 block text-sm font-bold ${
                      darkMode
                        ? "text-white"
                        : "text-[#071F49]"
                    }`}
                  >
                    Username
                  </label>

                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your username"
                    className={`w-full rounded-2xl border-2 border-[var(--accent)] px-4 py-3.5 text-sm font-medium outline-none transition placeholder:opacity-50 focus:ring-2 focus:ring-[var(--accent)]/30 sm:py-4 ${
                      darkMode
                        ? "bg-white/5 text-white placeholder:text-white/50"
                        : "bg-white/70 text-[#071F49] placeholder:text-[#071F49]/40"
                    }`}
                  />
                </div>

                {/* GROUP NAME */}
                <div>
                  <label
                    className={`mb-2 block text-sm font-bold ${
                      darkMode
                        ? "text-white"
                        : "text-[#071F49]"
                    }`}
                  >
                    Group Name
                  </label>

                  <input
                    type="text"
                    value={room}
                    onChange={(e) => {
                      setRoom(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your group name"
                    className={`w-full rounded-2xl border-2 border-[var(--accent)] px-4 py-3.5 text-sm font-medium outline-none transition placeholder:opacity-50 focus:ring-2 focus:ring-[var(--accent)]/30 sm:py-4 ${
                      darkMode
                        ? "bg-white/5 text-white placeholder:text-white/50"
                        : "bg-white/70 text-[#071F49] placeholder:text-[#071F49]/40"
                    }`}
                  />
                </div>

                {/* ERROR */}
                {error && (
                  <p className="rounded-xl bg-red-500/10 px-3 py-2 text-center text-xs font-semibold text-red-500">
                    {error}
                  </p>
                )}

                {/* JOIN BUTTON */}
                <button
                  type="submit"
                  className={`w-full rounded-2xl px-5 py-3.5 text-sm font-black tracking-wide text-white shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 sm:py-4 ${
                    darkMode
                      ? "bg-[#132D4F] hover:bg-[#193b66]"
                      : "bg-[var(--accent)] hover:bg-[#82751b]"
                  }`}
                >
                  JOIN GROUP
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>

      {/* BACK CARD STYLE */}
      <style>{`
        /*
          FRONT CARD:
          Completely straight.

          BACK CARD:
          Slightly tilted, just like the reference.
          It is slightly smaller than before so
          the bottom-left corner does not get cut.
        */

        .back-card {
          width: 100%;
          height: 100%;

          /*
            Same rotation as the previous perfect version.
            Only scale is slightly reduced and card is moved
            a tiny amount upward.
          */
          transform: rotate(-11deg) scale(1.015) translateY(-10px);

          transform-origin: center center;

          z-index: 0;

          box-shadow: 0 25px 55px rgba(7, 31, 73, 0.24);
        }

        /*
          TABLET
        */
        @media (max-width: 768px) {
          .back-card {
            transform: rotate(-9deg) scale(1.01) translateY(-2px);
          }
        }

        /*
          MOBILE
        */
        @media (max-width: 480px) {
          .back-card {
            transform: rotate(-7deg) scale(1) translateY(-1px);
          }
        }
      `}</style>
    </main>
  );
}