import { useEffect, useMemo, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import ChatHeader from "./chat/ChatHeader";
import ChatMenu from "./chat/ChatMenu";
import MessageBubble from "./chat/MessageBubble";
import AttachmentMenu from "./chat/AttachmentMenu";
import VoiceRecorder from "./chat/VoiceRecorder";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ORANGE = "#978B21";
const NAVY = "#071F49";
const BLUE = "#3B82F6";
const CREAM = "#fff7ed";

const uid = () =>
  `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`;

const getCurrentTime = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const getInitial = (name = "") =>
  name.trim().charAt(0).toUpperCase() || "?";

const formatDuration = (seconds = 0) =>
  `${String(Math.floor(seconds / 60)).padStart(
    2,
    "0"
  )}:${String(seconds % 60).padStart(2, "0")}`;

const formatFileSize = (size = 0) =>
  size < 1024
    ? `${size} B`
    : size < 1024 * 1024
    ? `${(size / 1024).toFixed(1)} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;

/*
  Large media (videos) is split into several socket messages so it never
  exceeds the server's per-message size limit. Small messages are sent
  exactly as before.
*/
const CHUNK_THRESHOLD = 600000;
const CHUNK_SIZE = 300000;

function Avatar({ name, large = false }) {
  const colors = [
    "var(--accent)",
    "#6D849E",
    "#7B61A8",
    "#5B8C5A",
    "#B65C72",
    "#C67C3A",
    "#4D8C8C",
  ];

  const color =
    colors[
      (name || "")
        .split("")
        .reduce(
          (a, c) => a + c.charCodeAt(0),
          0
        ) % colors.length
    ];

  return (
    <div
      style={{ backgroundColor: color }}
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ${
        large
          ? "h-20 w-20 text-2xl"
          : "h-10 w-10 text-sm"
      }`}
    >
      {getInitial(name)}
    </div>
  );
}

export default function ChatRoom({
  username,
  room,
  socket,
  onLeave,
}) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [darkMode, setDarkMode] =
    useState(false);

  const [showEmojiPicker, setShowEmojiPicker] =
    useState(false);
  const [
    showAttachmentMenu,
    setShowAttachmentMenu,
  ] = useState(false);
  const [showChatMenu, setShowChatMenu] =
    useState(false);

  const [showSearch, setShowSearch] =
    useState(false);
  const [searchText, setSearchText] =
    useState("");

  const [showGroupInfo, setShowGroupInfo] =
    useState(false);
  const [memberSearch, setMemberSearch] =
    useState("");

  const [members, setMembers] = useState(() =>
    username?.trim()
      ? [username.trim()]
      : []
  );

  const [selectedMessage, setSelectedMessage] =
    useState(null);

  const [reactions, setReactions] =
    useState({});

  const [favoriteMessages, setFavoriteMessages] =
    useState([]);

  const [pinnedMessages, setPinnedMessages] =
    useState([]);

  const [pinnedMessageIds, setPinnedMessageIds] =
    useState([]);

  const [selectedMessages, setSelectedMessages] =
    useState([]);

  const [selectionMode, setSelectionMode] =
    useState(false);

  const [
    disappearingMessages,
    setDisappearingMessages,
  ] = useState(false);

  const [
    disappearingDuration,
    setDisappearingDuration,
  ] = useState(null);

  const [
    showDisappearPicker,
    setShowDisappearPicker,
  ] = useState(false);

  const [showFavorites, setShowFavorites] =
    useState(false);

  const [messageInfo, setMessageInfo] =
    useState(null);

  const [messageReceipts, setMessageReceipts] =
    useState({});

  const [highlightedMessage, setHighlightedMessage] =
    useState(null);

  const [replyTo, setReplyTo] =
    useState(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [selectedVoice, setSelectedVoice] =
    useState(null);

  // View Once: ids this receiver already opened + the open viewer.
  // Kept only in this browser, so every receiver has their own single view.
  const viewedOnceRef =
    useRef(new Set());

  const [viewOnceViewer, setViewOnceViewer] =
    useState(null);

  const [viewOnce, setViewOnce] =
    useState(false);

  const [mediaCaption, setMediaCaption] =
    useState("");

  /* =====================================================
     MEDIA EDITOR
  ===================================================== */

  const [showMediaEditor, setShowMediaEditor] =
    useState(false);

  const [editorMode, setEditorMode] =
    useState("preview");

  /* TEXT */

  const [imageText, setImageText] =
    useState("");

  const [textPosition, setTextPosition] =
    useState({
      x: 50,
      y: 50,
    });

  const [textScale, setTextScale] =
    useState(1);

  /* PENCIL */

  const [drawColor, setDrawColor] =
    useState(ORANGE);

  /*
    Every finished mouse stroke is stored
    separately here.
  */
  const [drawStrokes, setDrawStrokes] =
    useState([]);

  /*
    Current stroke while mouse is being held.
  */
  const [currentStroke, setCurrentStroke] =
    useState([]);

  const [drawWidth, setDrawWidth] =
    useState(3);

  useEffect(() => {
    setDrawColor((current) => {
      if (
        current === ORANGE ||
        current === BLUE ||
        current === "var(--accent)"
      ) {
        return darkMode ? BLUE : ORANGE;
      }

      return current;
    });
  }, [darkMode]);

  /* EMOJI */

  const [imageEmoji, setImageEmoji] =
    useState("");

  const [emojiPosition, setEmojiPosition] =
    useState({
      x: 50,
      y: 50,
    });

  const [emojiScale, setEmojiScale] =
    useState(1);

  const [
    showImageEmojiPicker,
    setShowImageEmojiPicker,
  ] = useState(false);

  /* CROP */

  const [cropRect, setCropRect] =
    useState({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    });

  const [
    cropInteraction,
    setCropInteraction,
  ] = useState(null);

  const [editorBackup, setEditorBackup] =
    useState(null);

  /* =====================================================
     REFS
  ===================================================== */

  const messagesEndRef = useRef(null);
  const messagesRef = useRef([]);

  const searchInputRef = useRef(null);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const mediaRecorderRef =
    useRef(null);

  const mediaStreamRef =
    useRef(null);

  const audioChunksRef =
    useRef([]);

  const recordingTimerRef =
    useRef(null);

  const recordingTimeRef =
    useRef(0);

  const messageRefs =
    useRef({});

  const receiptSentRef =
    useRef({
      delivered: new Set(),
      read: new Set(),
    });

  const disappearingRef =
    useRef(false);

  const disappearingDurationRef =
    useRef(86400000);

  const editorImageRef =
    useRef(null);

  const editorVideoRef =
    useRef(null);

  const cropAreaRef =
    useRef(null);

  const cropInteractionRef =
    useRef(null);

  messagesRef.current = messages;

  /* =====================================================
     RECORDING
  ===================================================== */

  const [recording, setRecording] =
    useState(false);

  const [recordingTime, setRecordingTime] =
    useState(0);

  /* =====================================================
     MEMBERS
  ===================================================== */

  const addMember = (name) => {
    const clean = name?.trim();

    if (!clean) return;

    setMembers((prev) =>
      prev.some(
        (m) =>
          m.toLowerCase() ===
          clean.toLowerCase()
      )
        ? prev
        : [...prev, clean]
    );
  };

  /* =====================================================
     MESSAGE RECEIPTS
  ===================================================== */

  const addMessageReceipt = (type, messageId, username, time) => {
    if (!messageId || !username) return;

    setMessageReceipts((prev) => {
      const current = prev[messageId] || {
        delivered: [],
        read: [],
      };

      const list = current[type] || [];

      if (
        list.some(
          (entry) =>
            entry.username?.toLowerCase() ===
            username.toLowerCase()
        )
      ) {
        return prev;
      }

      return {
        ...prev,
        [messageId]: {
          ...current,
          [type]: [
            ...list,
            {
              username,
              time: time || getCurrentTime(),
            },
          ],
        },
      };
    });
  };

  /* =====================================================
     SOCKET
  ===================================================== */

  useEffect(() => {
    if (
      !socket ||
      !room ||
      !username
    ) {
      return;
    }

    const cleanUsername =
      username.trim();

    const cleanRoom =
      room.trim();

    const normalize = (msg) => ({
      ...msg,
      id: msg.id || uid(),
      createdAt:
        msg.createdAt ||
        Date.now(),
    });

    const chunkStore = {};

    const handleMessage = (raw) => {
      if (!raw) return;

      const msg = normalize(raw);

      const incomingUsername =
        msg?.username?.trim();

      if (
        msg.type === "message-delivered" ||
        msg.type === "message-read"
      ) {
        addMessageReceipt(
          msg.type === "message-read"
            ? "read"
            : "delivered",
          msg.messageId,
          incomingUsername,
          msg.time
        );
        return;
      }

      if (msg.type === "msg-chunk") {
        if (
          !msg.messageId ||
          incomingUsername?.toLowerCase() === cleanUsername.toLowerCase()
        ) {
          return;
        }

        const entry =
          chunkStore[msg.messageId] ||
          (chunkStore[msg.messageId] = {
            parts: [],
            received: 0,
            total: msg.total,
          });

        if (entry.parts[msg.index] === undefined) {
          entry.parts[msg.index] = msg.part;
          entry.received += 1;
        }

        if (entry.received >= entry.total) {
          delete chunkStore[msg.messageId];

          try {
            handleMessage(JSON.parse(entry.parts.join("")));
          } catch (error) {
            console.error("Could not rebuild media message", error);
          }
        }

        return;
      }

      if (msg.type === "message-pin") {
        if (incomingUsername?.toLowerCase() === cleanUsername.toLowerCase()) {
          return;
        }

        const targetIndex = messagesRef.current.findIndex(
          (item) => item?.id === msg.messageId
        );

        if (targetIndex === -1) return;

        setPinnedMessageIds((ids) =>
          msg.action === "unpin"
            ? ids.filter((id) => id !== msg.messageId)
            : ids.includes(msg.messageId)
              ? ids
              : [...ids, msg.messageId]
        );

        setPinnedMessages((indices) =>
          msg.action === "unpin"
            ? indices.filter((i) => i !== targetIndex)
            : indices.includes(targetIndex)
              ? indices
              : [...indices, targetIndex]
        );

        setMessages((prev) => [
          ...prev,
          normalize({
            type: "system",
            text: `${incomingUsername || "Someone"} ${msg.action === "unpin" ? "unpinned" : "pinned"} ${msg.messageText || "this message"} at ${msg.time || getCurrentTime()}`,
            username: incomingUsername || "Someone",
            time: msg.time || getCurrentTime(),
          }),
        ]);
        return;
      }

      if (
        msg.type ===
        "user-joined"
      ) {
        if (incomingUsername) {
          addMember(
            incomingUsername
          );

          if (
            incomingUsername.toLowerCase() !==
            cleanUsername.toLowerCase()
          ) {
            setMessages((prev) => [
              ...prev,
              normalize({
                type: "system",
                text: `${incomingUsername} joined the group`,
                username:
                  incomingUsername,
                time:
                  msg.time ||
                  getCurrentTime(),
              }),
            ]);

            socket.emit("send", {
              type:
                "member-present",
              username:
                cleanUsername,
              room: cleanRoom,
            });
          }
        }

        return;
      }

      if (
        msg.type ===
        "member-present"
      ) {
        addMember(
          incomingUsername
        );

        return;
      }

      if (
        msg.type ===
        "user-left"
      ) {
        if (incomingUsername) {
          setMembers((prev) =>
            prev.filter(
              (m) =>
                m.toLowerCase() !==
                incomingUsername.toLowerCase()
            )
          );

          setMessages((prev) => [
            ...prev,
            normalize({
              type: "system",
              text: `${incomingUsername} left the group`,
              username:
                incomingUsername,
              time:
                msg.time ||
                getCurrentTime(),
            }),
          ]);
        }

        return;
      }

      if (
        msg.type ===
        "disappearing-setting"
      ) {
        setDisappearingMessages(
          Boolean(msg.enabled)
        );

        setDisappearingDuration(
          msg.duration || null
        );

        return;
      }

      const withExpiry =
        disappearingRef.current &&
        !msg.expiresAt &&
        !msg.type
          ? {
              ...msg,
              expiresAt:
                Date.now() +
                disappearingDurationRef.current,
            }
          : msg;

      setMessages((prev) => [
        ...prev,
        withExpiry,
      ]);

      if (
        incomingUsername &&
        incomingUsername.toLowerCase() !==
          cleanUsername.toLowerCase() &&
        msg.id &&
        !receiptSentRef.current.delivered.has(msg.id)
      ) {
        receiptSentRef.current.delivered.add(msg.id);

        socket.emit("send", {
          type: "message-delivered",
          messageId: msg.id,
          username: cleanUsername,
          room: cleanRoom,
          time: getCurrentTime(),
        });
      }

      if (incomingUsername) {
        addMember(
          incomingUsername
        );
      }
    };

    socket.on(
      "message",
      handleMessage
    );

    const joinRoom = () => {
      socket.emit(
        "join",
        cleanRoom
      );

      addMember(
        cleanUsername
      );

      socket.emit("send", {
        type: "user-joined",
        username:
          cleanUsername,
        room: cleanRoom,
        time:
          getCurrentTime(),
      });
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on(
      "connect",
      joinRoom
    );

    return () => {
      socket.off(
        "message",
        handleMessage
      );

      socket.off(
        "connect",
        joinRoom
      );
    };
  }, [
    socket,
    room,
    username,
  ]);

  /* =====================================================
     EFFECTS
  ===================================================== */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  useEffect(() => {
    if (!socket?.connected || !username) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.55) {
            return;
          }

          const index = Number(
            entry.target.getAttribute("data-message-index")
          );

          const msg = messages[index];

          if (
            !msg?.id ||
            msg.type ||
            msg.username?.trim().toLowerCase() ===
              username.trim().toLowerCase()
          ) {
            return;
          }

          if (receiptSentRef.current.read.has(msg.id)) {
            return;
          }

          receiptSentRef.current.read.add(msg.id);

          socket.emit("send", {
            type: "message-read",
            messageId: msg.id,
            username: username.trim(),
            room: room?.trim(),
            time: getCurrentTime(),
          });
        });
      },
      { threshold: [0.55] }
    );

    messages.forEach((msg, index) => {
      if (msg?.type || !messageRefs.current[index]) return;
      const node = messageRefs.current[index];
      node.setAttribute("data-message-index", String(index));
      observer.observe(node);
    });

    return () => observer.disconnect();
  }, [messages, socket, room, username]);

  useEffect(() => {
    if (showSearch) {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    }
  }, [showSearch]);

  useEffect(() => {
    const timer =
      window.setInterval(() => {
        setMessages((prev) => {
          const now =
            Date.now();

          const next =
            prev.filter(
              (m) =>
                !m.expiresAt ||
                m.expiresAt > now
            );

          return next.length ===
            prev.length
            ? prev
            : next;
        });
      }, 1000);

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  useEffect(() => {
    const closeFloating =
      (event) => {
        const target =
          event.target;

        if (
          target?.closest?.(
            "[data-floating-menu]"
          ) ||
          target?.closest?.(
            "[data-message-root]"
          )
        ) {
          return;
        }

        setSelectedMessage(null);
        setShowChatMenu(false);
        setShowEmojiPicker(false);
        setShowAttachmentMenu(false);
        setShowDisappearPicker(false);

        if (selectionMode && selectedMessages.length === 0) {
          setSelectionMode(false);
        }
      };

    document.addEventListener(
      "pointerdown",
      closeFloating
    );

    return () =>
      document.removeEventListener(
        "pointerdown",
        closeFloating
      );
  }, [selectionMode, selectedMessages.length]);

  useEffect(() => {
    disappearingRef.current =
      disappearingMessages;

    if (disappearingDuration) {
      disappearingDurationRef.current =
        disappearingDuration;
    }
  }, [
    disappearingMessages,
    disappearingDuration,
  ]);

  const filteredMembers =
    useMemo(
      () =>
        members.filter((m) =>
          m
            .toLowerCase()
            .includes(
              memberSearch.toLowerCase()
            )
        ),
      [members, memberSearch]
    );

  /* =====================================================
     SEARCH
  ===================================================== */

  const highlightText = (
    text = ""
  ) => {
    if (!searchText.trim()) {
      return text;
    }

    const escaped =
      searchText.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

    return text
      .split(
        new RegExp(
          `(${escaped})`,
          "gi"
        )
      )
      .map(
        (word, i) =>
          word.toLowerCase() ===
          searchText.toLowerCase() ? (
            <mark
              key={i}
              className="rounded bg-[var(--accent)] px-0.5 text-white"
            >
              {word}
            </mark>
          ) : (
            <span key={i}>
              {word}
            </span>
          )
      );
  };

  /* =====================================================
     MEDIA RESET
  ===================================================== */

  const resetMediaEditor =
    () => {
      setShowMediaEditor(
        false
      );

      setEditorMode(
        "preview"
      );

      setImageText("");
      setTextPosition({
        x: 50,
        y: 50,
      });
      setTextScale(1);

      setDrawStrokes([]);
      setCurrentStroke([]);
      setDrawWidth(3);

      setImageEmoji("");
      setEmojiPosition({
        x: 50,
        y: 50,
      });
      setEmojiScale(1);

      setShowImageEmojiPicker(
        false
      );

      setCropRect({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      setCropInteraction(
        null
      );

      cropInteractionRef.current =
        null;

      setEditorBackup(null);
    };

  const openMediaEditor =
    () => {
      if (!selectedFile?.type?.startsWith("image/")) {
        return;
      }

      setEditorBackup({
        fileData:
          selectedFile.data,

        imageText,
        textPosition: {
          ...textPosition,
        },
        textScale,

        drawColor,
        drawStrokes: [
          ...drawStrokes,
        ],
        drawWidth,

        imageEmoji,
        emojiPosition: {
          ...emojiPosition,
        },
        emojiScale,

        cropRect: {
          ...cropRect,
        },
      });

      setShowImageEmojiPicker(
        false
      );

      setEditorMode("edit");
    };

  const cancelMediaEdits =
    () => {
      if (editorBackup) {
        if (
          editorBackup.fileData
        ) {
          setSelectedFile(
            (prev) =>
              prev
                ? {
                    ...prev,
                    data:
                      editorBackup.fileData,
                  }
                : prev
          );
        }

        setImageText(
          editorBackup.imageText ||
            ""
        );

        setTextPosition({
          ...(
            editorBackup.textPosition ||
            {
              x: 50,
              y: 50,
            }
          ),
        });

        setTextScale(
          editorBackup.textScale ||
            1
        );

        setDrawColor(
          editorBackup.drawColor ||
            ORANGE
        );

        setDrawStrokes([
          ...(editorBackup.drawStrokes ||
            []),
        ]);

        setCurrentStroke([]);

        setDrawWidth(
          editorBackup.drawWidth ||
            3
        );

        setImageEmoji(
          editorBackup.imageEmoji ||
            ""
        );

        setEmojiPosition({
          ...(
            editorBackup.emojiPosition ||
            {
              x: 50,
              y: 50,
            }
          ),
        });

        setEmojiScale(
          editorBackup.emojiScale ||
            1
        );

        setCropRect({
          ...(
            editorBackup.cropRect ||
            {
              x: 0,
              y: 0,
              width: 100,
              height: 100,
            }
          ),
        });
      }

      setShowImageEmojiPicker(
        false
      );

      setEditorMode(
        "preview"
      );
    };

  const closeMediaBox =
    () => {
      setShowMediaEditor(
        false
      );

      setSelectedFile(null);
      setMediaCaption("");
      setViewOnce(false);

      setEditorMode(
        "preview"
      );

      setImageText("");
      setTextPosition({
        x: 50,
        y: 50,
      });
      setTextScale(1);

      setDrawStrokes([]);
      setCurrentStroke([]);
      setDrawWidth(3);

      setImageEmoji("");
      setEmojiPosition({
        x: 50,
        y: 50,
      });
      setEmojiScale(1);

      setShowImageEmojiPicker(
        false
      );

      setCropRect({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      setEditorBackup(null);
    };

  /* =====================================================
     READ FILE
  ===================================================== */

  const readFile = (file) => {
    if (!file) return;

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      alert(
        "Please select a file smaller than 20 MB."
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      if (
        typeof reader.result !==
        "string"
      ) {
        return;
      }

      const isImage =
        file.type.startsWith(
          "image/"
        );

      const isVideo =
        file.type.startsWith(
          "video/"
        );

      setSelectedFile({
        name: file.name,
        type:
          file.type ||
          "application/octet-stream",
        data:
          reader.result,
        size: file.size,
      });

      setSelectedVoice(
        null
      );

      setMediaCaption("");

      setImageText("");

      setTextPosition({
        x: 50,
        y: 50,
      });

      setTextScale(1);

      setDrawStrokes([]);
      setCurrentStroke([]);
      setDrawWidth(3);

      setImageEmoji("");

      setEmojiPosition({
        x: 50,
        y: 50,
      });

      setEmojiScale(1);

      setShowImageEmojiPicker(
        false
      );

      setCropRect({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      if (
        isImage ||
        isVideo
      ) {
        setEditorMode(
          "preview"
        );

        setShowMediaEditor(
          true
        );
      }
    };

    reader.readAsDataURL(file);
  };

  /* =====================================================
     VOICE
  ===================================================== */

  const cleanupRecording =
    () => {
      if (
        recordingTimerRef.current
      ) {
        window.clearInterval(
          recordingTimerRef.current
        );
      }

      recordingTimerRef.current =
        null;

      mediaStreamRef.current
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        );

      mediaStreamRef.current =
        null;

      mediaRecorderRef.current =
        null;

      recordingTimeRef.current =
        0;

      setRecordingTime(0);
      setRecording(false);
    };

  const startRecording =
    async () => {
      if (recording) return;

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true,
            }
          );

        mediaStreamRef.current =
          stream;

        audioChunksRef.current =
          [];

        const recorder =
          new MediaRecorder(
            stream
          );

        mediaRecorderRef.current =
          recorder;

        recorder.ondataavailable =
          (event) => {
            if (
              event.data?.size
            ) {
              audioChunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onstop = () => {
          const blob =
            new Blob(
              audioChunksRef.current,
              {
                type:
                  recorder.mimeType ||
                  "audio/webm",
              }
            );

          if (
            blob.size >
            MAX_FILE_SIZE
          ) {
            alert(
              "Voice message is larger than 20 MB."
            );

            cleanupRecording();

            return;
          }

          const reader =
            new FileReader();

          reader.onloadend =
            () => {
              if (
                typeof reader.result ===
                "string"
              ) {
                setSelectedVoice(
                  {
                    data:
                      reader.result,
                    type:
                      recorder.mimeType ||
                      "audio/webm",
                    size:
                      blob.size,
                    duration:
                      recordingTimeRef.current,
                  }
                );

                cleanupRecording();
              }
            };

          reader.readAsDataURL(
            blob
          );
        };

        recorder.start();

        recordingTimeRef.current =
          0;

        setRecordingTime(0);
        setRecording(true);

        recordingTimerRef.current =
          window.setInterval(
            () => {
              recordingTimeRef.current +=
                1;

              setRecordingTime(
                recordingTimeRef.current
              );
            },
            1000
          );
      } catch {
        alert(
          "Please allow microphone permission."
        );
      }
    };

  const stopRecording =
    () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current
          .state !==
          "inactive"
      ) {
        mediaRecorderRef.current.stop();
      } else {
        cleanupRecording();
      }
    };

  const cancelRecording =
    () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current
          .state !==
          "inactive"
      ) {
        mediaRecorderRef.current.ondataavailable =
          null;

        mediaRecorderRef.current.onstop =
          null;

        mediaRecorderRef.current.stop();
      }

      audioChunksRef.current =
        [];

      cleanupRecording();
    };

  useEffect(() => {
    return () =>
      cleanupRecording();
  }, []);

  /* =====================================================
     EDITOR POINT
  ===================================================== */

  const getEditorPoint =
    (event) => {
      const area =
        cropAreaRef.current;

      if (!area) return null;

      const rect =
        area.getBoundingClientRect();

      if (
        !rect.width ||
        !rect.height
      ) {
        return null;
      }

      return {
        x: Math.max(
          0,
          Math.min(
            100,
            ((event.clientX -
              rect.left) /
              rect.width) *
              100
          )
        ),

        y: Math.max(
          0,
          Math.min(
            100,
            ((event.clientY -
              rect.top) /
              rect.height) *
              100
          )
        ),
      };
    };

  /* =====================================================
     PENCIL
  ===================================================== */

  const startDrawing =
    (event) => {
      if (
        editorMode !==
        "pencil"
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const point =
        getEditorPoint(
          event
        );

      if (!point) return;

      setCurrentStroke([
        point,
      ]);
    };

  const drawMove =
    (event) => {
      if (
        editorMode !==
        "pencil"
      ) {
        return;
      }

      if (
        !currentStroke.length
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const point =
        getEditorPoint(
          event
        );

      if (!point) return;

      setCurrentStroke(
        (prev) => [
          ...prev,
          point,
        ]
      );
    };

  const stopDrawing =
    () => {
      if (
        editorMode !==
        "pencil"
      ) {
        return;
      }

      if (
        !currentStroke.length
      ) {
        return;
      }

      /*
        Mouse chortay hi stroke
        permanently save ho jati hai.
      */

      if (
        currentStroke.length >
        1
      ) {
        setDrawStrokes(
          (prev) => [
            ...prev,
            {
              points:
                currentStroke,
              color:
                drawColor,
              width:
                drawWidth,
            },
          ]
        );
      }

      setCurrentStroke([]);
    };

  /* =====================================================
     MOVE TEXT / EMOJI
  ===================================================== */

  const moveOverlay =
    (type, event) => {
      event.preventDefault();
      event.stopPropagation();

      const move = (e) => {
        const point =
          getEditorPoint(
            e
          );

        if (!point) return;

        if (
          type === "text"
        ) {
          setTextPosition(
            point
          );
        }

        if (
          type === "emoji"
        ) {
          setEmojiPosition(
            point
          );
        }
      };

      const stop = () => {
        window.removeEventListener(
          "pointermove",
          move
        );

        window.removeEventListener(
          "pointerup",
          stop
        );
      };

      window.addEventListener(
        "pointermove",
        move
      );

      window.addEventListener(
        "pointerup",
        stop
      );
    };

  /* =====================================================
     RESIZE TEXT / EMOJI
  ===================================================== */

  const beginOverlayResize =
    (
      type,
      event,
      corner
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const area =
        cropAreaRef.current;

      if (!area) return;

      const rect =
        area.getBoundingClientRect();

      const startX =
        event.clientX;

      const startY =
        event.clientY;

      const startScale =
        type === "text"
          ? textScale
          : emojiScale;

      const move = (e) => {
        const dx =
          e.clientX -
          startX;

        const dy =
          e.clientY -
          startY;

        /*
          Bottom-right handle:
          right = increase
          left = decrease
          down = increase
          up = decrease
        */

        const directionX =
          corner.includes(
            "right"
          )
            ? 1
            : -1;

        const directionY =
          corner.includes(
            "bottom"
          )
            ? 1
            : -1;

        const delta =
          ((dx *
            directionX) +
            (dy *
              directionY)) /
          2;

        const sensitivity =
          Math.max(
            100,
            Math.min(
              rect.width,
              rect.height
            )
          );

        const nextScale =
          Math.max(
            0.45,
            Math.min(
              3,
              startScale +
                delta /
                  sensitivity
            )
          );

        if (
          type === "text"
        ) {
          setTextScale(
            nextScale
          );
        } else {
          setEmojiScale(
            nextScale
          );
        }
      };

      const stop = () => {
        window.removeEventListener(
          "pointermove",
          move
        );

        window.removeEventListener(
          "pointerup",
          stop
        );
      };

      window.addEventListener(
        "pointermove",
        move
      );

      window.addEventListener(
        "pointerup",
        stop
      );
    };

  /* =====================================================
     CROP
  ===================================================== */

  const beginCropInteraction =
    (
      event,
      mode,
      handle = null
    ) => {
      if (
        editorMode !==
        "crop"
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const area =
        cropAreaRef.current;

      if (!area) return;

      const rect =
        area.getBoundingClientRect();

      const interaction = {
        mode,
        handle,
        startX:
          event.clientX,
        startY:
          event.clientY,
        frameWidth:
          rect.width,
        frameHeight:
          rect.height,
        startRect: {
          ...cropRect,
        },
      };

      cropInteractionRef.current =
        interaction;

      setCropInteraction(
        interaction
      );

      const move = (e) => {
        const current =
          cropInteractionRef.current;

        if (!current) return;

        const dx =
          ((e.clientX -
            current.startX) /
            current.frameWidth) *
          100;

        const dy =
          ((e.clientY -
            current.startY) /
            current.frameHeight) *
          100;

        const r = {
          ...current.startRect,
        };

        if (
          current.mode ===
          "move"
        ) {
          r.x = Math.max(
            0,
            Math.min(
              100 -
                r.width,
              current.startRect
                .x + dx
            )
          );

          r.y = Math.max(
            0,
            Math.min(
              100 -
                r.height,
              current.startRect
                .y + dy
            )
          );
        } else {
          let left = r.x;
          let top = r.y;

          let right =
            r.x + r.width;

          let bottom =
            r.y + r.height;

          if (
            current.handle.includes(
              "left"
            )
          ) {
            left = Math.max(
              0,
              Math.min(
                right - 10,
                current
                  .startRect
                  .x + dx
              )
            );
          }

          if (
            current.handle.includes(
              "right"
            )
          ) {
            right = Math.min(
              100,
              Math.max(
                left + 10,
                current
                  .startRect
                  .x +
                  current
                    .startRect
                    .width +
                  dx
              )
            );
          }

          if (
            current.handle.includes(
              "top"
            )
          ) {
            top = Math.max(
              0,
              Math.min(
                bottom - 10,
                current
                  .startRect
                  .y + dy
              )
            );
          }

          if (
            current.handle.includes(
              "bottom"
            )
          ) {
            bottom = Math.min(
              100,
              Math.max(
                top + 10,
                current
                  .startRect
                  .y +
                  current
                    .startRect
                    .height +
                  dy
              )
            );
          }

          r.x = left;
          r.y = top;
          r.width =
            right - left;
          r.height =
            bottom - top;
        }

        setCropRect(r);
      };

      const stop = () => {
        cropInteractionRef.current =
          null;

        setCropInteraction(
          null
        );

        window.removeEventListener(
          "pointermove",
          move
        );

        window.removeEventListener(
          "pointerup",
          stop
        );
      };

      window.addEventListener(
        "pointermove",
        move
      );

      window.addEventListener(
        "pointerup",
        stop
      );
    };

  /* =====================================================
     COMPOSE IMAGE
  ===================================================== */

  const composeEditedImage =
    async () => {
      if (
        !selectedFile?.type?.startsWith(
          "image/"
        )
      ) {
        return selectedFile?.data;
      }

      const hasCrop =
        cropRect.x !== 0 ||
        cropRect.y !== 0 ||
        cropRect.width !== 100 ||
        cropRect.height !== 100;

      if (
        !imageText.trim() &&
        drawStrokes.length ===
          0 &&
        currentStroke.length ===
          0 &&
        !imageEmoji &&
        !hasCrop
      ) {
        return selectedFile.data;
      }

      return new Promise(
        (resolve) => {
          const img =
            new Image();

          img.onload = () => {
            const sourceX =
              img.width *
              (cropRect.x /
                100);

            const sourceY =
              img.height *
              (cropRect.y /
                100);

            const sourceWidth =
              img.width *
              (cropRect.width /
                100);

            const sourceHeight =
              img.height *
              (cropRect.height /
                100);

            const canvas =
              document.createElement(
                "canvas"
              );

            canvas.width =
              Math.max(
                1,
                Math.round(
                  sourceWidth
                )
              );

            canvas.height =
              Math.max(
                1,
                Math.round(
                  sourceHeight
                )
              );

            const ctx =
              canvas.getContext(
                "2d"
              );

            if (!ctx) {
              resolve(
                selectedFile.data
              );

              return;
            }

            /* ORIGINAL / CROP */

            ctx.drawImage(
              img,
              sourceX,
              sourceY,
              sourceWidth,
              sourceHeight,
              0,
              0,
              canvas.width,
              canvas.height
            );

            /* =================================================
               PENCIL - ALL FIXED STROKES
            ================================================= */

            const allStrokes = [
              ...drawStrokes,
              ...(currentStroke.length >
              1
                ? [
                    {
                      points:
                        currentStroke,
                      color:
                        drawColor,
                      width:
                        drawWidth,
                    },
                  ]
                : []),
            ];

            allStrokes.forEach(
              (stroke) => {
                if (
                  !stroke.points ||
                  stroke.points
                    .length < 2
                ) {
                  return;
                }

                ctx.strokeStyle =
                  stroke.color === "var(--accent)"
                    ? ORANGE
                    : stroke.color || ORANGE;

                ctx.lineWidth =
                  Math.max(
                    2,
                    Math.round(
                      (canvas.width /
                        500) *
                        stroke.width
                    )
                  );

                ctx.lineCap =
                  "round";

                ctx.lineJoin =
                  "round";

                ctx.beginPath();

                stroke.points.forEach(
                  (
                    point,
                    index
                  ) => {
                    const normalizedX =
                      (Number(point.x) / 100 -
                        Number(cropRect.x) / 100) /
                      (Number(cropRect.width) / 100);

                    const normalizedY =
                      (Number(point.y) / 100 -
                        Number(cropRect.y) / 100) /
                      (Number(cropRect.height) / 100);

                    const x = normalizedX * canvas.width;
                    const y = normalizedY * canvas.height;

                    if (
                      index ===
                      0
                    ) {
                      ctx.moveTo(
                        x,
                        y
                      );
                    } else {
                      ctx.lineTo(
                        x,
                        y
                      );
                    }
                  }
                );

                ctx.stroke();
              }
            );

            /* =================================================
               TEXT
            ================================================= */

            if (
              imageText.trim()
            ) {
              const normalizedX =
                (textPosition.x /
                  100 -
                  cropRect.x /
                    100) /
                (cropRect.width /
                  100);

              const normalizedY =
                (textPosition.y /
                  100 -
                  cropRect.y /
                    100) /
                (cropRect.height /
                  100);

              if (
                normalizedX >=
                  0 &&
                normalizedX <=
                  1 &&
                normalizedY >=
                  0 &&
                normalizedY <=
                  1
              ) {
                const x =
                  normalizedX *
                  canvas.width;

                const y =
                  normalizedY *
                  canvas.height;

                const fontSize =
                  Math.max(
                    22,
                    Math.round(
                      (canvas.width /
                        18) *
                        textScale
                    )
                  );

                ctx.font = `bold ${fontSize}px system-ui`;

                ctx.textAlign =
                  "center";

                ctx.textBaseline =
                  "middle";

                const text =
                  imageText
                    .trim()
                    .slice(
                      0,
                      100
                    );

                const padding =
                  16 *
                  textScale;

                const metrics =
                  ctx.measureText(
                    text
                  );

                const boxWidth =
                  metrics.width +
                  padding * 2;

                ctx.fillStyle =
                  "rgba(0,0,0,.45)";

                if (
                  ctx.roundRect
                ) {
                  ctx.beginPath();

                  ctx.roundRect(
                    x -
                      boxWidth /
                        2,
                    y -
                      fontSize,
                    boxWidth,
                    fontSize * 2,
                    12 *
                      textScale
                  );

                  ctx.fill();
                }

                ctx.fillStyle =
                  "#ffffff";

                ctx.fillText(
                  text,
                  x,
                  y
                );
              }
            }

            /* =================================================
               EMOJI
            ================================================= */

            if (imageEmoji) {
              const normalizedX =
                (emojiPosition.x /
                  100 -
                  cropRect.x /
                    100) /
                (cropRect.width /
                  100);

              const normalizedY =
                (emojiPosition.y /
                  100 -
                  cropRect.y /
                    100) /
                (cropRect.height /
                  100);

              if (
                normalizedX >=
                  0 &&
                normalizedX <=
                  1 &&
                normalizedY >=
                  0 &&
                normalizedY <=
                  1
              ) {
                const x =
                  normalizedX *
                  canvas.width;

                const y =
                  normalizedY *
                  canvas.height;

                const emojiSize =
                  Math.max(
                    35,
                    Math.round(
                      (canvas.width /
                        9) *
                        emojiScale
                    )
                  );

                ctx.font = `${emojiSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;

                ctx.textAlign =
                  "center";

                ctx.textBaseline =
                  "middle";

                ctx.fillText(
                  imageEmoji,
                  x,
                  y
                );
              }
            }

            resolve(
              canvas.toDataURL(
                selectedFile.type ===
                  "image/png"
                  ? "image/png"
                  : "image/jpeg",
                0.92
              )
            );
          };

          img.onerror = () => {
            resolve(
              selectedFile.data
            );
          };

          img.src =
            selectedFile.data;
        }
      );
    };

  const composeEditedVideo = async () => {
    if (!selectedFile?.type?.startsWith("video/")) {
      return selectedFile?.data;
    }

    const hasCrop =
      cropRect.x !== 0 ||
      cropRect.y !== 0 ||
      cropRect.width !== 100 ||
      cropRect.height !== 100;

    if (
      !imageText.trim() &&
      drawStrokes.length === 0 &&
      !imageEmoji &&
      !hasCrop
    ) {
      return selectedFile.data;
    }

    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = selectedFile.data;
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      video.onloadedmetadata = () => {
        const canvas = document.createElement("canvas");
        const sourceWidth = video.videoWidth || 1280;
        const sourceHeight = video.videoHeight || 720;

        canvas.width = Math.max(
          1,
          Math.round(sourceWidth * (cropRect.width / 100))
        );
        canvas.height = Math.max(
          1,
          Math.round(sourceHeight * (cropRect.height / 100))
        );

        const ctx = canvas.getContext("2d");
        const captureStream = canvas.captureStream(30);

        try {
          const sourceStream = video.captureStream();
          sourceStream.getAudioTracks().forEach((track) => {
            captureStream.addTrack(track);
          });
        } catch {
          // Video editing still works if the browser cannot expose the source audio track.
        }

        const mimeType =
          MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
            ? "video/webm;codecs=vp9"
            : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
              ? "video/webm;codecs=vp8"
              : "video/webm";

        let recorder;

        try {
          recorder = new MediaRecorder(captureStream, {
            mimeType,
          });
        } catch {
          resolve(selectedFile.data);
          return;
        }

        const chunks = [];

        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, {
            type: recorder.mimeType || "video/webm",
          });

          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(
              typeof reader.result === "string"
                ? reader.result
                : selectedFile.data
            );
          };
          reader.readAsDataURL(blob);
        };

        const drawFrame = () => {
          if (video.ended || video.paused) {
            if (recorder.state !== "inactive") recorder.stop();
            return;
          }

          if (!ctx) {
            if (recorder.state !== "inactive") recorder.stop();
            return;
          }

          const sx = sourceWidth * (cropRect.x / 100);
          const sy = sourceHeight * (cropRect.y / 100);
          const sw = sourceWidth * (cropRect.width / 100);
          const sh = sourceHeight * (cropRect.height / 100);

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(
            video,
            sx,
            sy,
            sw,
            sh,
            0,
            0,
            canvas.width,
            canvas.height
          );

          const normalizePoint = (point) => ({
            x:
              ((point.x / 100 - cropRect.x / 100) /
                (cropRect.width / 100)) *
              canvas.width,
            y:
              ((point.y / 100 - cropRect.y / 100) /
                (cropRect.height / 100)) *
              canvas.height,
          });

          const allStrokes = drawStrokes;

          allStrokes.forEach((stroke) => {
            if (!stroke.points || stroke.points.length < 2) return;

            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = Math.max(
              2,
              Math.round((canvas.width / 500) * stroke.width)
            );
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();

            stroke.points.forEach((point, index) => {
              const p = normalizePoint(point);
              if (index === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
            });

            ctx.stroke();
          });

          if (imageText.trim()) {
            const point = normalizePoint(textPosition);
            const fontSize = Math.max(
              22,
              Math.round((canvas.width / 18) * textScale)
            );

            ctx.font = `bold ${fontSize}px system-ui`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const text = imageText.trim().slice(0, 100);
            const padding = 16 * textScale;
            const metrics = ctx.measureText(text);
            const boxWidth = metrics.width + padding * 2;

            ctx.fillStyle = "rgba(0,0,0,.45)";
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(
                point.x - boxWidth / 2,
                point.y - fontSize,
                boxWidth,
                fontSize * 2,
                12 * textScale
              );
              ctx.fill();
            }

            ctx.fillStyle = "#ffffff";
            ctx.fillText(text, point.x, point.y);
          }

          if (imageEmoji) {
            const point = normalizePoint(emojiPosition);
            const emojiSize = Math.max(
              35,
              Math.round((canvas.width / 9) * emojiScale)
            );

            ctx.font = `${emojiSize}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(imageEmoji, point.x, point.y);
          }

          requestAnimationFrame(drawFrame);
        };

        recorder.start();
        video.currentTime = 0;
        video.play().then(drawFrame).catch(() => {
          if (recorder.state !== "inactive") recorder.stop();
        });
      };

      video.onerror = () => resolve(selectedFile.data);
      video.load();
    });
  };

  /* =====================================================
     DONE
  ===================================================== */

  const handleDoneEditing =
    async () => {
      if (
        !selectedFile?.type?.startsWith("image/") &&
        !selectedFile?.type?.startsWith("video/")
      ) {
        setEditorMode("preview");
        return;
      }

      const composed = await composeEditedImage();

      /*
        Image with crop + pencil +
        text + emoji is now baked.
      */

      setSelectedFile(
        (prev) =>
          prev
            ? {
                ...prev,
                data: composed,
              }
            : prev
      );

      setImageText("");

      setTextPosition({
        x: 50,
        y: 50,
      });

      setTextScale(1);

      setDrawStrokes([]);
      setCurrentStroke([]);

      setImageEmoji("");

      setEmojiPosition({
        x: 50,
        y: 50,
      });

      setEmojiScale(1);

      setCropRect({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      setShowImageEmojiPicker(
        false
      );

      setCropInteraction(
        null
      );

      cropInteractionRef.current =
        null;

      setEditorBackup(null);

      setEditorMode(
        "preview"
      );
    };

  /* =====================================================
     SEND
  ===================================================== */

  const handleSend =
    async (e) => {
      e?.preventDefault();

      if (
        !socket?.connected ||
        (!message.trim() &&
          !selectedFile &&
          !selectedVoice)
      ) {
        return;
      }

      const editedData =
        await composeEditedImage();

      const expiresAt =
        disappearingMessages
          ? Date.now() +
            (disappearingDuration ||
              86400000)
          : undefined;

      const newMessage = {
        id: uid(),

        text: selectedFile
          ? mediaCaption.trim()
          : message.trim(),

        room:
          room?.trim(),

        username:
          username?.trim() ||
          "You",

        time:
          getCurrentTime(),

        createdAt:
          Date.now(),

        ...(replyTo
          ? {
              replyTo: {
                username:
                  replyTo.username,
                text:
                  replyTo.text,
                time:
                  replyTo.time,
              },
            }
          : {}),

        ...(expiresAt
          ? {
              expiresAt,
            }
          : {}),
      };

      if (selectedFile) {
        Object.assign(
          newMessage,
          {
            fileName:
              selectedFile.name,

            fileType:
              selectedFile.type,

            fileData:
              editedData,

            fileSize:
              selectedFile.size,

            viewOnce,
          }
        );
      }

      if (selectedVoice) {
        Object.assign(
          newMessage,
          {
            voiceData:
              selectedVoice.data,

            voiceType:
              selectedVoice.type,

            voiceSize:
              selectedVoice.size,

            voiceDuration:
              selectedVoice.duration,
          }
        );
      }

      // TODO:
      // Save message/media/reactions/
      // replies/favorites/pins in backend/database.

      const json = JSON.stringify(newMessage);

      if (json.length <= CHUNK_THRESHOLD) {
        socket.emit(
          "send",
          newMessage
        );
      } else {
        const total = Math.ceil(json.length / CHUNK_SIZE);

        for (let i = 0; i < total; i += 1) {
          socket.emit("send", {
            type: "msg-chunk",
            messageId: newMessage.id,
            index: i,
            total,
            part: json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
            username: newMessage.username,
            room: newMessage.room,
          });
        }
      }

      setMessages(
        (prev) => [
          ...prev,
          newMessage,
        ]
      );

      addMember(
        newMessage.username
      );

      setMessage("");

      setReplyTo(null);

      setSelectedFile(null);

      setSelectedVoice(null);

      setViewOnce(false);

      setMediaCaption("");

      setImageText("");

      setImageEmoji("");

      setDrawStrokes([]);
      setCurrentStroke([]);

      resetMediaEditor();

      setShowEmojiPicker(
        false
      );

      setShowAttachmentMenu(
        false
      );
    };

  /* =====================================================
     MESSAGE ACTIONS
  ===================================================== */

  const deleteMessage =
    (index) => {
      setMessages(
        (prev) =>
          prev.filter(
            (_, i) =>
              i !== index
          )
      );

      setPinnedMessageIds((prev) =>
        prev.filter((id) => id !== messages[index]?.id)
      );

      setPinnedMessages(
        (prev) =>
          prev
            .filter((i) => i !== index)
            .map((i) => (i > index ? i - 1 : i))
      );

      setFavoriteMessages(
        (prev) =>
          prev
            .filter(
              (i) =>
                i !== index
            )
            .map((i) =>
              i > index
                ? i - 1
                : i
            )
      );

      setSelectedMessage(
        null
      );
    };

  const copyMessage =
    async (msg) => {
      try {
        await navigator.clipboard.writeText(
          msg.text ||
            msg.fileName ||
            ""
        );
      } catch {
        alert(
          "Unable to copy message."
        );
      }

      setSelectedMessage(
        null
      );
    };

  const toggleFavorite =
    (index) => {
      setFavoriteMessages(
        (prev) =>
          prev.includes(index)
            ? prev.filter(
                (i) =>
                  i !== index
              )
            : [
                ...prev,
                index,
              ]
      );

      setSelectedMessage(
        null
      );
    };

  const togglePin =
    (index) => {
      const target = messages[index];
      if (!target?.id) return;

      const isPinned = pinnedMessages.includes(index);
      const action = isPinned ? "unpin" : "pin";
      const time = getCurrentTime();

      setPinnedMessages((prev) =>
        isPinned
          ? prev.filter((i) => i !== index)
          : [...prev, index]
      );

      setPinnedMessageIds((prev) =>
        isPinned
          ? prev.filter((id) => id !== target.id)
          : prev.includes(target.id)
            ? prev
            : [...prev, target.id]
      );

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          type: "system",
          text: `${username?.trim() || "You"} ${action === "pin" ? "pinned" : "unpinned"} ${target.text || target.fileName || "this message"} at ${time}`,
          username: username?.trim() || "You",
          time,
          createdAt: Date.now(),
        },
      ]);

      socket?.emit("send", {
        type: "message-pin",
        action,
        messageId: target.id,
        messageText: target.text || target.fileName || "this message",
        username: username?.trim() || "You",
        room: room?.trim(),
        time,
      });

      setSelectedMessage(null);
    };

  const replyMessage =
    (msg) => {
      setReplyTo(msg);
      setSelectedMessage(
        null
      );
    };

  const showInfo =
    (msg, index) => {
      setMessageInfo({
        msg,
        index,
      });

      setSelectedMessage(
        null
      );
    };

  const toggleSelection =
    (index) =>
      setSelectedMessages(
        (prev) =>
          prev.includes(index)
            ? prev.filter(
                (i) =>
                  i !== index
              )
            : [
                ...prev,
                index,
              ]
      );

  const clearSelected =
    () => {
      const selected =
        new Set(
          selectedMessages
        );

      setMessages(
        (prev) =>
          prev.filter(
            (_, i) =>
              !selected.has(i)
          )
      );

      setFavoriteMessages(
        (prev) =>
          prev.filter(
            (i) =>
              !selected.has(i)
          )
      );

      const deletedIds = new Set(
        selectedMessages.map((i) => messages[i]?.id).filter(Boolean)
      );

      setPinnedMessageIds((prev) =>
        prev.filter((id) => !deletedIds.has(id))
      );

      setPinnedMessages(
        (prev) => prev.filter((i) => !selected.has(i))
      );

      setSelectedMessages(
        []
      );

      setSelectionMode(
        false
      );
    };

  const favoriteSelected =
    () => {
      setFavoriteMessages(
        (prev) => [
          ...new Set([
            ...prev,
            ...selectedMessages,
          ]),
        ]
      );

      setSelectedMessages(
        []
      );

      setSelectionMode(
        false
      );
    };

  const clearChat = () => {
    setMessages([]);

    setPinnedMessages([]);
    setPinnedMessageIds([]);

    setFavoriteMessages(
      []
    );

    setSelectedMessages([]);
    setSelectionMode(false);
    setShowChatMenu(false);
  };

  /* =====================================================
     DISAPPEARING
  ===================================================== */

  const setDisappearing =
    (duration) => {
      setDisappearingMessages(
        Boolean(duration)
      );

      setDisappearingDuration(
        duration || null
      );

      setShowDisappearPicker(
        false
      );

      setShowChatMenu(
        false
      );

      if (socket?.connected) {
        socket.emit("send", {
          type:
            "disappearing-setting",

          room:
            room?.trim(),

          username:
            username?.trim(),

          enabled:
            Boolean(duration),

          duration:
            duration || null,
        });
      }
    };

  /* =====================================================
     LEAVE
  ===================================================== */

  const leaveGroup =
    () => {
      if (socket?.connected) {
        socket.emit("send", {
          type: "user-left",
          username:
            username.trim(),
          room:
            room.trim(),
          time:
            getCurrentTime(),
        });
      }

      onLeave?.();
    };

  /* =====================================================
     FILE
  ===================================================== */

  const openViewOnce =
    (event, msg, isOwn) => {
      if (
        !msg?.viewOnce ||
        isOwn ||
        !msg.fileData ||
        !(
          msg.fileType?.startsWith("image/") ||
          msg.fileType?.startsWith("video/")
        )
      ) {
        return;
      }

      const button =
        event.target?.closest?.(
          "button"
        );

      // Only the "1 Photo / 1 Video" button opens the media.
      if (
        !button ||
        !button.className.includes(
          "text-left"
        ) ||
        !button.innerText
          .trim()
          .startsWith("1")
      ) {
        return;
      }

      if (
        viewedOnceRef.current.has(
          msg.id
        ) ||
        viewOnceViewer
      ) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }

      viewedOnceRef.current.add(
        msg.id
      );

      setViewOnceViewer({
        id: msg.id,
        type: msg.fileType,
        data: msg.fileData,
        name: msg.fileName,
      });
    };

  const closeViewOnce =
    () => {
      const id =
        viewOnceViewer?.id;

      setViewOnceViewer(null);

      // Drop the media from this receiver's copy so it cannot be reopened.
      if (id) {
        setMessages((prev) =>
          prev.map((m) =>
            m?.id === id
              ? {
                  ...m,
                  fileData: undefined,
                }
              : m
          )
        );
      }
    };

  const openFile =
    (msg) => {
      if (!msg?.fileData)
        return;

      // View Once media cannot be opened outside the one-time viewer.
      if (
        msg.viewOnce &&
        msg.username?.trim().toLowerCase() !==
          username?.trim().toLowerCase()
      ) {
        return;
      }

      const win =
        window.open();

      if (win) {
        win.document.write(`
          <title>${
            msg.fileName ||
            "File"
          }</title>
          <iframe
            src="${msg.fileData}"
            style="width:100%;height:100%;border:0"
          ></iframe>
        `);
      }
    };

  const downloadFile =
    (msg) => {
      if (!msg?.fileData)
        return;

      // View Once media cannot be saved by the receiver.
      if (
        msg.viewOnce &&
        msg.username?.trim().toLowerCase() !==
          username?.trim().toLowerCase()
      ) {
        return;
      }

      const a =
        document.createElement(
          "a"
        );

      a.href =
        msg.fileData;

      a.download =
        msg.fileName ||
        "download";

      document.body.appendChild(
        a
      );

      a.click();

      a.remove();
    };

  const jumpTo =
    (index) => {
      messageRefs.current[
        index
      ]?.scrollIntoView({
        behavior:
          "smooth",
        block:
          "center",
      });

      setHighlightedMessage(index);

      window.setTimeout(
        () =>
          setHighlightedMessage(
            null
          ),
        1400
      );
    };

  /* =====================================================
     ATTACHMENT
  ===================================================== */

  const selectAttachment =
    (kind) => {
      setShowAttachmentMenu(
        false
      );

      if (
        kind === "image"
      ) {
        imageInputRef.current?.click();
      } else if (
        kind === "video"
      ) {
        videoInputRef.current?.click();
      } else {
        fileInputRef.current?.click();
      }
    };

  const pinnedLatestId =
    pinnedMessageIds[pinnedMessageIds.length - 1];

  const pinnedLatest = pinnedLatestId
    ? messages.findIndex((msg) => msg?.id === pinnedLatestId)
    : pinnedMessages[pinnedMessages.length - 1];

  const pinnedMessage =
    pinnedLatest >= 0
      ? messages[pinnedLatest]
      : null;

  const infoMessage = messageInfo
    ? messages.find((msg) => msg.id === messageInfo.msg.id) ||
      messageInfo.msg
    : null;

  const infoReceipt = infoMessage
    ? messageReceipts[infoMessage.id] || {
        delivered: [],
        read: [],
      }
    : {
        delivered: [],
        read: [],
      };

  const infoRecipients = infoMessage
    ? members.filter(
        (member) =>
          member?.trim().toLowerCase() !==
          infoMessage.username?.trim().toLowerCase()
      )
    : [];

  const readNames = new Set(
    infoReceipt.read.map((entry) =>
      entry.username?.trim().toLowerCase()
    )
  );

  const notSeenMembers = infoRecipients.filter(
    (member) =>
      !readNames.has(member?.trim().toLowerCase())
  );

  const firstDelivered = infoReceipt.delivered[0];
  const firstRead = infoReceipt.read[0];

  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <div
      className={`flex h-screen w-full overflow-hidden font-sans ${
        darkMode
          ? "bg-[#071F49] text-white"
          : "bg-[var(--accent)] text-[#071F49]"
      }`}
      style={{ "--accent": darkMode ? BLUE : ORANGE }}
    >
      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* HEADER */}

        <ChatHeader
          room={room}
          members={members}
          memberCount={
            members.length
          }
          darkMode={darkMode}
          showSearch={
            showSearch
          }
          searchText={
            searchText
          }
          searchInputRef={
            searchInputRef
          }
          onSearchChange={
            setSearchText
          }
          onSearch={() => {
            setShowSearch(
              (v) => !v
            );

            setShowChatMenu(
              false
            );
          }}
          onMenu={() => {
            setShowChatMenu(
              (v) => !v
            );

            setSelectedMessage(
              null
            );
          }}
        />

        {/* CHAT MENU */}

        {showChatMenu && (
          <ChatMenu
            darkMode={darkMode}
            onDarkMode={() => {
              setDarkMode(true);
              setShowChatMenu(
                false
              );
            }}
            onLightMode={() => {
              setDarkMode(false);
              setShowChatMenu(
                false
              );
            }}
            onSearch={() => {
              setShowSearch(
                true
              );

              setShowChatMenu(
                false
              );
            }}
            onSelectMessages={() => {
              setSelectionMode(
                true
              );

              setSelectedMessages(
                []
              );

              setSelectedMessage(
                null
              );

              setShowChatMenu(
                false
              );
            }}
            disappearingMessages={
              disappearingMessages
            }
            onDisappearing={() => {
              setShowDisappearPicker(
                true
              );

              setShowChatMenu(
                false
              );
            }}
            onFavorite={() => {
              setShowFavorites(
                true
              );

              setShowChatMenu(
                false
              );
            }}
            onClear={
              clearChat
            }
            onGroupInfo={() => {
              setShowGroupInfo(
                true
              );

              setShowChatMenu(
                false
              );
            }}
            onLeave={
              leaveGroup
            }
          />
        )}

        {/* PINNED */}

        {pinnedMessage && (
          <button
            type="button"
            onClick={() =>
              jumpTo(
                pinnedLatest
              )
            }
            className={`flex shrink-0 items-center gap-3 border-b px-4 py-2 text-left ${
              darkMode
                ? "border-white/10 bg-[#10203a]"
                : "border-[var(--accent)]/20 bg-white"
            }`}
          >
            <span className="text-[var(--accent)]">
              📌
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold text-[var(--accent)]">
                PINNED MESSAGE
              </span>

              <span className="block truncate text-xs">
                {
                  pinnedMessage.username
                }
                :{" "}
                {pinnedMessage.text ||
                  pinnedMessage.fileName ||
                  "Media message"}
              </span>
            </span>
          </button>
        )}

        {/* SELECTION */}

        {selectionMode && (
          <div
            className={`flex shrink-0 items-center gap-2 border-b px-4 py-2 ${
              darkMode
                ? "border-white/10 bg-[#10203a]"
                : "border-[var(--accent)]/20 bg-white"
            }`}
          >
            <strong className="mr-auto text-sm">
              {
                selectedMessages.length
              }{" "}
              selected
            </strong>

            <button
              type="button"
              onClick={
                favoriteSelected
              }
              disabled={
                !selectedMessages.length
              }
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--accent)] disabled:opacity-40"
            >
              Favorite
            </button>

            <button
              type="button"
              onClick={
                clearChat
              }
              disabled={
                !selectedMessages.length
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${darkMode ? "text-blue-300 hover:bg-blue-400/10" : "text-[#071F49] hover:bg-[var(--accent)]/10"} disabled:opacity-40` }
            >
              Clear Chat
            </button>

            <button
              type="button"
              onClick={
                clearSelected
              }
              disabled={
                !selectedMessages.length
              }
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 disabled:opacity-40"
            >
              Delete
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectionMode(
                  false
                );

                setSelectedMessages(
                  []
                );
              }}
              className="rounded-lg px-3 py-1.5 text-xs"
            >
              Done
            </button>
          </div>
        )}

        {/* MESSAGES */}

        <main
          className={`relative min-h-0 flex-1 overflow-y-auto px-2 py-4 sm:px-4 ${
            darkMode
              ? "bg-[#15243b]"
              : "bg-[#F7F6D0]"
          }`}
        >
          {messages.length ===
          0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Avatar name={username || "You"} large />

              <h2 className="mt-4 text-lg font-bold">
                {username?.trim() || "You"}
              </h2>

              <p className="mt-1 text-xs opacity-55">
                No messages yet
              </p>

              <p className="text-xs opacity-45">
                Send a message to start the conversation.
              </p>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2.5">
              {messages.map(
                (
                  msg,
                  index
                ) => {
                  if (
                    msg.type ===
                    "system"
                  ) {
                    return (
                      <div
                        key={
                          msg.id ||
                          index
                        }
                        className="mx-auto rounded-full bg-black/5 px-4 py-1.5 text-center text-[10px] opacity-60"
                      >
                        {
                          msg.text
                        }

                        <span className="ml-2">
                          {
                            msg.time
                          }
                        </span>
                      </div>
                    );
                  }

                  const isOwn =
                    msg.username
                      ?.trim()
                      .toLowerCase() ===
                    username
                      ?.trim()
                      .toLowerCase();

                  return (
                    <div
                      key={
                        msg.id ||
                        index
                      }
                      ref={(el) => {
                        messageRefs.current[
                          index
                        ] = el;
                      }}
                      onClickCapture={(e) =>
                        openViewOnce(
                          e,
                          msg,
                          isOwn
                        )
                      }
                    >
                      <MessageBubble
                        message={
                          msg
                        }
                        index={
                          index
                        }
                        isOwn={
                          isOwn
                        }
                        darkMode={
                          darkMode
                        }
                        selected={
                          selectedMessage ===
                          index
                        }
                        highlighted={
                          highlightedMessage ===
                          index
                        }
                        selectionMode={
                          selectionMode
                        }
                        checked={selectedMessages.includes(
                          index
                        )}
                        reaction={
                          reactions[
                            index
                          ]
                        }
                        pinned={pinnedMessages.includes(
                          index
                        )}
                        favorite={favoriteMessages.includes(
                          index
                        )}
                        highlightText={
                          highlightText
                        }
                        onSelect={() =>
                          setSelectedMessage(
                            (v) =>
                              v ===
                              index
                                ? null
                                : index
                          )
                        }
                        onToggleSelect={() =>
                          toggleSelection(
                            index
                          )
                        }
                        onDelete={() =>
                          deleteMessage(
                            index
                          )
                        }
                        onCopy={() =>
                          copyMessage(
                            msg
                          )
                        }
                        onReply={() =>
                          replyMessage(
                            msg
                          )
                        }
                        onPin={() =>
                          togglePin(
                            index
                          )
                        }
                        onFavorite={() =>
                          toggleFavorite(
                            index
                          )
                        }
                        onInfo={
                          isOwn
                            ? () => showInfo(msg, index)
                            : undefined
                        }
                        onOpenFile={() =>
                          openFile(
                            msg
                          )
                        }
                        onDownload={() =>
                          downloadFile(
                            msg
                          )
                        }
                        onJumpToPin={() =>
                          jumpTo(
                            index
                          )
                        }
                      />
                    </div>
                  );
                }
              )}

              <div
                ref={
                  messagesEndRef
                }
              />
            </div>
          )}
        </main>

        {/* VIEW ONCE VIEWER */}

        {viewOnceViewer && (
          <div
            className="fixed inset-0 z-[1000000] flex flex-col items-center justify-center bg-black/90 p-4"
            onContextMenu={(e) =>
              e.preventDefault()
            }
          >
            <button
              type="button"
              onClick={
                closeViewOnce
              }
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white"
              aria-label="Close"
            >
              ×
            </button>

            {viewOnceViewer.type?.startsWith(
              "video/"
            ) ? (
              <video
                src={
                  viewOnceViewer.data
                }
                controls
                autoPlay
                playsInline
                controlsList="nodownload noplaybackrate"
                disablePictureInPicture
                className="max-h-[85vh] max-w-full rounded-xl"
              />
            ) : (
              <img
                src={
                  viewOnceViewer.data
                }
                alt={
                  viewOnceViewer.name ||
                  "Image"
                }
                draggable={false}
                className="max-h-[85vh] max-w-full rounded-xl object-contain"
              />
            )}

            <p className="mt-3 text-xs text-white/70">
              View once — closing this will remove it
            </p>
          </div>
        )}

        {/* MESSAGE EMOJI PICKER */}

        {showEmojiPicker && (
          <div
            data-floating-menu
            className="absolute bottom-[76px] left-3 z-[120] overflow-hidden rounded-2xl shadow-2xl"
          >
            <EmojiPicker
              onEmojiClick={(
                data
              ) =>
                setMessage(
                  (prev) =>
                    prev +
                    data.emoji
                )
              }
              width={320}
              height={380}
              previewConfig={{
                showPreview:
                  false,
              }}
            />
          </div>
        )}

        {/* ATTACHMENT */}

        {showAttachmentMenu && (
          <AttachmentMenu
            darkMode={darkMode}
            onDocument={() =>
              selectAttachment(
                "document"
              )
            }
            onPhoto={() => selectAttachment("image")}
            onVideo={() => selectAttachment("video")}
          />
        )}

        {/* FILE INPUTS */}

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".pdf"
          onChange={(e) => {
            readFile(
              e.target.files?.[0]
            );

            e.target.value =
              "";
          }}
        />

        <input
          ref={imageInputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={(e) => {
            readFile(
              e.target.files?.[0]
            );

            e.target.value =
              "";
          }}
        />

        <input
          ref={videoInputRef}
          type="file"
          hidden
          accept="video/*"
          onChange={(e) => {
            readFile(
              e.target.files?.[0]
            );

            e.target.value =
              "";
          }}
        />

        {/* =================================================
            MEDIA EDITOR
        ================================================= */}

        {selectedFile && (
          <div
            className="fixed inset-0 z-[260] flex items-center justify-center bg-black/55 p-3 sm:p-4"
            onClick={
              closeMediaBox
            }
          >
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              className={`w-full max-w-[680px] overflow-hidden rounded-3xl border shadow-[0_25px_90px_rgba(7,31,73,.45)] ${
                darkMode
                  ? "border-white/10 bg-[#0b1629] text-white"
                  : "border-[var(--accent)]/25 bg-white text-[#071F49]"
              }`}
            >
              {/* HEADER */}

              <div className="flex items-center justify-between bg-[var(--accent)] px-5 py-3.5 text-white">
                <div className="min-w-0">
                  <div className="text-[9px] font-bold tracking-[.2em] text-white/70">
                    {selectedFile.type.startsWith(
                      "image/"
                    )
                      ? "PHOTO"
                      : selectedFile.type.startsWith(
                          "video/"
                        )
                      ? "VIDEO"
                      : "DOCUMENT"}
                  </div>

                  <strong className="block max-w-[430px] truncate text-sm">
                    {
                      selectedFile.name
                    }
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={
                    closeMediaBox
                  }
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl hover:bg-white/20"
                >
                  ×
                </button>
              </div>

              {/* IMAGE */}

              {(selectedFile.type.startsWith("image/") ||
                selectedFile.type.startsWith("video/")) ? (
                <div
                  className="relative flex h-[min(52vh,470px)] items-center justify-center overflow-hidden bg-[#071F49] p-4"
                  onPointerDown={
                    startDrawing
                  }
                  onPointerMove={
                    drawMove
                  }
                  onPointerUp={
                    stopDrawing
                  }
                  onPointerCancel={
                    stopDrawing
                  }
                >
                  <div
                    ref={
                      cropAreaRef
                    }
                    className="relative flex max-h-full max-w-full items-center justify-center"
                  >
                    {selectedFile.type.startsWith("image/") ? (
                      <img
                        ref={editorImageRef}
                        src={selectedFile.data}
                        alt="Selected"
                        draggable={false}
                        className="max-h-[calc(52vh-32px)] max-w-full rounded-xl object-contain select-none"
                      />
                    ) : (
                      <video
                        ref={editorVideoRef}
                        src={selectedFile.data}
                        controls={editorMode === "preview"}
                        playsInline
                        className="max-h-[calc(52vh-32px)] max-w-full rounded-xl object-contain select-none"
                      />
                    )}

                    {/* =================================================
                        PENCIL LINES
                    ================================================= */}

                    {(drawStrokes.length >
                      0 ||
                      currentStroke.length >
                        1) && (
                      <svg
                        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                      >
                        {drawStrokes.map(
                          (
                            stroke,
                            strokeIndex
                          ) =>
                            stroke.points
                              ?.length >
                              1 && (
                              <polyline
                                key={
                                  strokeIndex
                                }
                                points={stroke.points
                                  .map(
                                    (
                                      p
                                    ) =>
                                      `${p.x},${p.y}`
                                  )
                                  .join(
                                    " "
                                  )}
                                fill="none"
                                stroke={
                                  stroke.color
                                }
                                strokeWidth={
                                  stroke.width
                                }
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            )
                        )}

                        {/* CURRENT LINE WHILE MOUSE IS DOWN */}

                        {currentStroke.length >
                          1 && (
                          <polyline
                            points={currentStroke
                              .map(
                                (
                                  p
                                ) =>
                                  `${p.x},${p.y}`
                              )
                              .join(
                                " "
                              )}
                            fill="none"
                            stroke={
                              drawColor
                            }
                            strokeWidth={
                              drawWidth
                            }
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}
                      </svg>
                    )}

                    {/* =================================================
                        TEXT
                    ================================================= */}

                    {imageText && (
                      <div
                        className={`absolute max-w-[75%] rounded-xl bg-black/50 px-4 py-2 text-center font-bold text-white shadow-xl ${
                          editorMode ===
                          "text"
                            ? "cursor-move ring-2 ring-white/80"
                            : "cursor-pointer pointer-events-auto"
                        }`}
                        style={{
                          left: `${textPosition.x}%`,
                          top: `${textPosition.y}%`,
                          fontSize: `${24 * textScale}px`,
                          lineHeight:
                            1.2,
                          transform:
                            "translate(-50%, -50%)",
                        }}
                        onPointerDown={(
                          e
                        ) => {
                          if (editorMode === "preview") {
                            setEditorMode("text");
                            return;
                          }
                          if (editorMode === "text") {
                            moveOverlay("text", e);
                          }
                        }}
                      >
                        {
                          imageText
                        }

                        {editorMode ===
                          "text" && (
                          <>
                            {/* SIMPLE SELECTION CORNERS */}

                            {[
                              ["-left-1.5 -top-1.5", "top-left"],
                              ["-right-1.5 -top-1.5", "top-right"],
                              ["-left-1.5 -bottom-1.5", "bottom-left"],
                              ["-right-1.5 -bottom-1.5", "bottom-right"],
                            ].map(([position, corner]) => (
                              <button
                                key={corner}
                                type="button"
                                onPointerDown={(e) =>
                                  beginOverlayResize(
                                    "text",
                                    e,
                                    corner
                                  )
                                }
                                className={`absolute ${position} flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-full border-2 border-white bg-white text-[11px] font-black leading-none text-[var(--accent)] shadow`}
                                title="Resize text"
                              >
                                +
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}

                    {/* =================================================
                        EMOJI
                    ================================================= */}

                    {imageEmoji && (
                      <div
                        className={`absolute select-none drop-shadow-xl ${
                          editorMode ===
                          "emoji"
                            ? "cursor-move rounded-xl ring-2 ring-white/80"
                            : "cursor-pointer pointer-events-auto"
                        }`}
                        style={{
                          left: `${emojiPosition.x}%`,
                          top: `${emojiPosition.y}%`,
                          fontSize: `${48 * emojiScale}px`,
                          lineHeight:
                            1,
                          transform:
                            "translate(-50%, -50%)",
                        }}
                        onPointerDown={(
                          e
                        ) => {
                          if (editorMode === "preview") {
                            setEditorMode("emoji");
                            return;
                          }
                          if (editorMode === "emoji") {
                            moveOverlay("emoji", e);
                          }
                        }}
                      >
                        {
                          imageEmoji
                        }

                        {editorMode ===
                          "emoji" && (
                          <>
                            {/* SIMPLE SELECTION CORNERS */}

                            {[
                              ["-left-1.5 -top-1.5", "top-left"],
                              ["-right-1.5 -top-1.5", "top-right"],
                              ["-left-1.5 -bottom-1.5", "bottom-left"],
                              ["-right-1.5 -bottom-1.5", "bottom-right"],
                            ].map(([position, corner]) => (
                              <button
                                key={corner}
                                type="button"
                                onPointerDown={(e) =>
                                  beginOverlayResize(
                                    "emoji",
                                    e,
                                    corner
                                  )
                                }
                                className={`absolute ${position} flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-full border-2 border-white bg-white text-[11px] font-black leading-none text-[var(--accent)] shadow`}
                                title="Resize emoji"
                              >
                                +
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}

                    {/* =================================================
                        CROP
                    ================================================= */}

                    {editorMode ===
                      "crop" && (
                      <div
                        className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,.55)]"
                        style={{
                          left: `${cropRect.x}%`,
                          top: `${cropRect.y}%`,
                          width: `${cropRect.width}%`,
                          height: `${cropRect.height}%`,
                        }}
                        onPointerDown={(
                          e
                        ) =>
                          beginCropInteraction(
                            e,
                            "move"
                          )
                        }
                      >
                        <div className="pointer-events-none absolute left-1/3 top-0 bottom-0 border-l border-white/60" />

                        <div className="pointer-events-none absolute left-2/3 top-0 bottom-0 border-l border-white/60" />

                        <div className="pointer-events-none absolute left-0 right-0 top-1/3 border-t border-white/60" />

                        <div className="pointer-events-none absolute left-0 right-0 top-2/3 border-t border-white/60" />

                        {[
                          [
                            "top-left",
                            "-left-3 -top-3",
                          ],
                          [
                            "top-right",
                            "-right-3 -top-3",
                          ],
                          [
                            "bottom-left",
                            "-left-3 -bottom-3",
                          ],
                          [
                            "bottom-right",
                            "-right-3 -bottom-3",
                          ],
                        ].map(
                          ([
                            handle,
                            position,
                          ]) => (
                            <button
                              key={
                                handle
                              }
                              type="button"
                              onPointerDown={(
                                e
                              ) =>
                                beginCropInteraction(
                                  e,
                                  "resize",
                                  handle
                                )
                              }
                              className={`absolute ${position} flex h-7 w-7 items-center justify-center rounded-full bg-white text-base font-black text-[var(--accent)] shadow-lg`}
                              title="Resize crop"
                            >
                              +
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* =================================================
                      EMOJI PICKER INSIDE IMAGE
                  ================================================= */}

                  {editorMode ===
                    "emoji" &&
                    showImageEmojiPicker && (
                      <div
                        className="absolute bottom-3 left-1/2 z-[80] -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl"
                        onPointerDown={(
                          e
                        ) =>
                          e.stopPropagation()
                        }
                      >
                        <EmojiPicker
                          onEmojiClick={(
                            data
                          ) => {
                            setImageEmoji(
                              data.emoji
                            );

                            setEmojiScale(
                              1
                            );

                            setShowImageEmojiPicker(
                              false
                            );
                          }}
                          width={
                            300
                          }
                          height={
                            260
                          }
                          previewConfig={{
                            showPreview:
                              false,
                          }}
                        />
                      </div>
                    )}
                </div>
              ) : (
                <div className="flex items-center gap-4 p-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-xs font-bold text-white">
                    PDF
                  </div>

                  <div className="min-w-0">
                    <strong className="block truncate text-sm">
                      {
                        selectedFile.name
                      }
                    </strong>

                    <span className="text-[10px] opacity-55">
                      PDF •{" "}
                      {formatFileSize(
                        selectedFile.size
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* =================================================
                  EDIT TOOLBAR
              ================================================= */}

              {(selectedFile.type.startsWith("image/") ||
                selectedFile.type.startsWith("video/")) &&
                editorMode !==
                  "preview" && (
                  <div className="border-t border-[var(--accent)]/15 bg-white px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">

                      {/* CROP */}

                      <button
                        type="button"
                        onClick={() => {
                          setShowImageEmojiPicker(
                            false
                          );

                          setEditorMode(
                            "crop"
                          );
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                          editorMode ===
                          "crop"
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--accent)]/10 text-[var(--accent)]"
                        }`}
                      >
                        ✂ Crop
                      </button>

                      {/* TEXT */}

                      <button
                        type="button"
                        onClick={() => {
                          setShowImageEmojiPicker(
                            false
                          );

                          setEditorMode(
                            "text"
                          );
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                          editorMode ===
                          "text"
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--accent)]/10 text-[var(--accent)]"
                        }`}
                      >
                        T Text
                      </button>

                      {/* EMOJI */}

                      <button
                        type="button"
                        onClick={() => {
                          setEditorMode(
                            "emoji"
                          );

                          setShowImageEmojiPicker(
                            true
                          );
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                          editorMode ===
                          "emoji"
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--accent)]/10 text-[var(--accent)]"
                        }`}
                      >
                        😊 Emoji
                      </button>

                      {/* PENCIL */}

                      <button
                        type="button"
                        onClick={() => {
                          setShowImageEmojiPicker(
                            false
                          );

                          setEditorMode(
                            "pencil"
                          );
                        }}
                        className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                          editorMode ===
                          "pencil"
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--accent)]/10 text-[var(--accent)]"
                        }`}
                      >
                        ✎ Pencil
                      </button>

                      {/* PENCIL CONTROLS */}

                      {editorMode ===
                        "pencil" && (
                        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#fff7ed] px-2 py-1.5">

                          <span className="mr-1 text-[9px] font-bold text-[#071F49]/60">
                            Color
                          </span>

                          {[
                            darkMode ? BLUE : ORANGE,
                            "#071F49",
                            "#EF4444",
                            "#22C55E",
                            "#3B82F6",
                            "#FFFFFF",
                            "#000000",
                          ].map(
                            (
                              color
                            ) => (
                              <button
                                key={
                                  color
                                }
                                type="button"
                                onClick={() =>
                                  setDrawColor(
                                    color
                                  )
                                }
                                className={`h-6 w-6 rounded-full border-2 shadow-sm ${
                                  drawColor ===
                                  color
                                    ? "scale-110 border-[#071F49]"
                                    : "border-white"
                                }`}
                                style={{
                                  backgroundColor:
                                    color,
                                }}
                                title={`Pencil ${color}`}
                              />
                            )
                          )}

                          <div className="ml-1 flex items-center gap-1.5 rounded-lg bg-white px-2 py-1">
                            <span className="text-[9px] font-bold text-[#071F49]/60">
                              Size
                            </span>

                            <span className="text-[8px] text-[#071F49]/50">
                              Thin
                            </span>

                            <input
                              type="range"
                              min="1"
                              max="6"
                              step="1"
                              value={
                                drawWidth
                              }
                              onChange={(
                                e
                              ) =>
                                setDrawWidth(
                                  Number(
                                    e.target
                                      .value
                                  )
                                )
                              }
                              className="w-20 accent-[var(--accent)]"
                            />

                            <span className="text-[8px] text-[#071F49]/50">
                              Thick
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setDrawStrokes(
                                []
                              );

                              setCurrentStroke(
                                []
                              );
                            }}
                            className="ml-1 rounded-lg px-2 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* =================================================
                  TEXT INPUT
              ================================================= */}

              {(selectedFile.type.startsWith("image/") ||
                selectedFile.type.startsWith("video/")) &&
                editorMode ===
                  "text" && (
                  <div className="border-t border-[var(--accent)]/15 p-3">
                    <input
                      autoFocus
                      value={
                        imageText
                      }
                      onChange={(e) =>
                        setImageText(
                          e.target.value
                        )
                      }
                      placeholder="Write text on photo"
                      className="w-full rounded-xl border border-[var(--accent)]/25 bg-[#fffaf5] px-4 py-3 text-sm text-[#071F49] outline-none focus:border-[var(--accent)]"
                    />

                    <p className="mt-1 text-[9px] opacity-50">
                      Center se drag karke
                      text move karein.
                      Neeche right wale
                      arrow se size
                      change karein.
                    </p>
                  </div>
                )}

              {/* =================================================
                  FOOTER
              ================================================= */}

              {(selectedFile.type.startsWith("image/") ||
                selectedFile.type.startsWith("video/")) ? (
                <div className="border-t border-[var(--accent)]/15 p-3">
                  {editorMode === "preview" ? (
                    <div className="flex items-center gap-2">
                      {selectedFile.type.startsWith("image/") && (
                        <button
                          type="button"
                          onClick={
                            openMediaEditor
                          }
                          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-xs font-bold text-white"
                        >
                          ✎ Edit
                        </button>
                      )}

                      <input
                        value={
                          mediaCaption
                        }
                        onChange={(
                          e
                        ) =>
                          setMediaCaption(
                            e.target
                              .value
                          )
                        }
                        placeholder="Add a caption (optional)"
                        className="min-w-0 flex-1 rounded-full border border-[var(--accent)]/25 bg-[#fffaf5] px-4 py-2.5 text-xs text-[#071F49] outline-none focus:border-[var(--accent)]"
                      />

                      <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-[var(--accent)]/25 px-2.5 py-2.5 text-[10px] font-bold text-[var(--accent)]">
                        <input
                          type="checkbox"
                          checked={
                            viewOnce
                          }
                          onChange={(
                            e
                          ) =>
                            setViewOnce(
                              e.target
                                .checked
                            )
                          }
                          className="accent-[var(--accent)]"
                        />

                        1
                      </label>

                      <button
                        type="button"
                        onClick={
                          handleSend
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md"
                      >
                        ➤
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        value={
                          mediaCaption
                        }
                        onChange={(
                          e
                        ) =>
                          setMediaCaption(
                            e.target
                              .value
                          )
                        }
                        placeholder="Add a caption (optional)"
                        className="min-w-0 flex-1 rounded-full border border-[var(--accent)]/25 bg-[#fffaf5] px-4 py-2.5 text-xs text-[#071F49] outline-none focus:border-[var(--accent)]"
                      />

                      <button
                        type="button"
                        onClick={
                          cancelMediaEdits
                        }
                        className="rounded-xl border border-red-300 px-4 py-2.5 text-xs font-bold text-red-500"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={
                          handleDoneEditing
                        }
                        className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-xs font-bold text-white"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 border-t border-[var(--accent)]/15 p-3">
                  {selectedFile.type.startsWith("image/") && (
                    <button
                      type="button"
                      onClick={openMediaEditor}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-xs font-bold text-white"
                    >
                      ✎ Edit
                    </button>
                  )}

                  <input
                    value={
                      mediaCaption
                    }
                    onChange={(
                      e
                    ) =>
                      setMediaCaption(
                        e.target
                          .value
                      )
                    }
                    placeholder="Add a caption (optional)"
                    className="min-w-0 flex-1 rounded-full border border-[var(--accent)]/25 bg-[#fffaf5] px-4 py-2.5 text-xs text-[#071F49] outline-none focus:border-[var(--accent)]"
                  />

                  <button
                    type="button"
                    onClick={
                      handleSend
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-md"
                  >
                    ➤
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VOICE PREVIEW */}

        {selectedVoice &&
          !recording && (
            <div
              className={`mx-2 mb-2 flex items-center gap-3 rounded-2xl border p-3 sm:mx-3 ${
                darkMode
                  ? "border-white/10 bg-[#10203a]"
                  : "border-[var(--accent)]/20 bg-white"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white" aria-label="Voice message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="11" rx="3"/>
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>
                </svg>
              </div>

              <div className="min-w-0">
                <strong className="block text-xs">
                  Voice message
                </strong>

                <span className="text-[10px] opacity-55">
                  {formatDuration(
                    selectedVoice.duration
                  )}
                </span>
              </div>

              <audio
                controls
                src={
                  selectedVoice.data
                }
                className="min-w-0 flex-1"
              />

              <button
                type="button"
                onClick={() =>
                  setSelectedVoice(
                    null
                  )
                }
                className="opacity-55"
              >
                ×
              </button>
            </div>
          )}

        {/* =================================================
            BOTTOM COMPOSER
        ================================================= */}

        <footer
          className={`relative shrink-0 border-t px-2 py-2 ${
            darkMode
              ? "border-white/10 bg-[#071F49]"
              : "border-[#c94e0b] bg-[var(--accent)]"
          }`}
        >
          {recording ? (
            <VoiceRecorder
              darkMode={
                darkMode
              }
              time={
                recordingTime
              }
              onCancel={
                cancelRecording
              }
              onStop={
                stopRecording
              }
            />
          ) : (
            <form
              onSubmit={
                handleSend
              }
              className="mx-auto flex w-full items-end gap-1.5"
            >
              <button
                type="button"
                onClick={() =>
                  setShowEmojiPicker(
                    (v) => !v
                  )
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--accent)] shadow-sm"
              >
                ☺
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowAttachmentMenu(
                    (v) => !v
                  )
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--accent)] shadow-sm"
              >
                +
              </button>

              <div className="relative flex min-h-11 flex-1 items-center rounded-full bg-white px-4">

                {replyTo && (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-xl border border-[var(--accent)]/20 border-l-4 border-l-[var(--accent)] bg-[#fff7ed] px-3 py-2 text-[#071F49] shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <strong className="block text-xs text-[var(--accent)]">
                          Replying
                          to{" "}
                          {
                            replyTo.username
                          }
                        </strong>

                        <p className="truncate text-[11px] opacity-65">
                          {
                            replyTo.text
                          }
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setReplyTo(
                            null
                          )
                        }
                        className="text-lg opacity-55"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                <input
                  value={
                    message
                  }
                  onChange={(e) =>
                    setMessage(
                      e.target
                        .value
                    )
                  }
                  placeholder={
                    replyTo
                      ? "Type your reply..."
                      : "Type a message"
                  }
                  className="w-full bg-transparent py-2 text-sm text-[#071F49] outline-none placeholder:text-[#071F49]/45"
                />

                <button
                  type="button"
                  onClick={
                    startRecording
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent text-[var(--accent)] text-lg"
                aria-label="Record voice"
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="3" width="6" height="11" rx="3"/>
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/>
                  </svg>
                </button>
              </div>

              <button
                type="submit"
                disabled={
                  !message.trim() &&
                  !selectedFile &&
                  !selectedVoice
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--accent)] shadow-md disabled:opacity-45"
              >
                ➤
              </button>
            </form>
          )}
        </footer>

        {/* =================================================
            DISAPPEARING
        ================================================= */}

        {showDisappearPicker && (
          <div
            data-floating-menu
            className={`absolute right-4 top-20 z-[160] w-72 rounded-2xl border p-4 shadow-2xl ${
              darkMode
                ? "border-white/10 bg-[#0b1629]"
                : "border-[var(--accent)]/20 bg-white"
            }`}
          >
            <div className="mb-3">
              <strong>
                Disappearing
                Messages
              </strong>

              <p className="mt-1 text-xs opacity-55">
                New messages will
                automatically
                disappear.
              </p>
            </div>

            <div className="space-y-1">
              <button
                onClick={() =>
                  setDisappearing(
                    86400000
                  )
                }
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--accent)]/10"
              >
                24 hours
              </button>

              <button
                onClick={() =>
                  setDisappearing(
                    7 *
                      86400000
                  )
                }
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--accent)]/10"
              >
                7 days
              </button>

              <button
                onClick={() =>
                  setDisappearing(
                    30 *
                      86400000
                  )
                }
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--accent)]/10"
              >
                1 month
              </button>

              <button
                onClick={() =>
                  setDisappearing(
                    null
                  )
                }
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
              >
                Off
              </button>
            </div>
          </div>
        )}

        {/* =================================================
            GROUP INFO
        ================================================= */}

        {showGroupInfo && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
            onClick={() =>
              setShowGroupInfo(
                false
              )
            }
          >
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              className={`w-full max-w-md overflow-hidden rounded-3xl shadow-2xl ${
                darkMode
                  ? "bg-[#0b1629] text-white"
                  : "bg-white text-[#071F49]"
              }`}
            >
              <div className="flex items-center justify-between bg-[var(--accent)] px-5 py-4 text-white">
                <div>
                  <div className="text-[9px] font-bold tracking-[.2em] text-white/70">
                    GROUP INFO
                  </div>

                  <h2 className="text-base font-bold">
                    {room}
                  </h2>

                  <p className="text-[10px] text-white/75">
                    {
                      members.length
                    }{" "}
                    members
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowGroupInfo(
                      false
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-2xl text-white"
                >
                  ×
                </button>
              </div>

              <div className="px-5 py-4">
                <input
                  value={
                    memberSearch
                  }
                  onChange={(e) =>
                    setMemberSearch(
                      e.target
                        .value
                    )
                  }
                  placeholder="Search members..."
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm outline-none focus:border-[var(--accent)] ${
                    darkMode
                      ? "border-white/10 bg-white/5"
                      : "border-[var(--accent)]/45 bg-[#fffaf5]"
                  }`}
                />
              </div>

              <div className="max-h-[420px] overflow-y-auto px-5 pb-5">
                {filteredMembers.map(
                  (member) => (
                    <div
                      key={
                        member
                      }
                      className="flex items-center gap-3 rounded-xl px-2 py-2.5"
                    >
                      <Avatar
                        name={
                          member
                        }
                      />

                      <div>
                        <strong className="block text-sm">
                          {
                            member
                          }
                        </strong>

                        {member
                          .toLowerCase() ===
                          username
                            .trim()
                            .toLowerCase() && (
                          <span className="text-[9px] font-bold text-[var(--accent)]">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            FAVORITES
        ================================================= */}

        {showFavorites && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/55 p-4"
            onClick={() =>
              setShowFavorites(
                false
              )
            }
          >
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              className={`w-full max-w-md overflow-hidden rounded-3xl shadow-2xl ${
                darkMode
                  ? "bg-[#0b1629] text-white"
                  : "bg-white text-[#071F49]"
              }`}
            >
              <div className="bg-[var(--accent)] px-5 py-4 text-white">
                <h2 className="font-bold">
                  Favorite
                  Messages
                </h2>
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-5">
                {favoriteMessages.length ===
                0 ? (
                  <p className="py-10 text-center text-sm opacity-55">
                    No favorite
                    messages
                  </p>
                ) : (
                  favoriteMessages.map(
                    (index) => (
                      <button
                        key={
                          index
                        }
                        onClick={() => {
                          setShowFavorites(
                            false
                          );

                          jumpTo(
                            index
                          );
                        }}
                        className={`mb-2 block w-full rounded-xl p-3 text-left ${
                          darkMode
                            ? "bg-white/5"
                            : "bg-[#fff7ed]"
                        }`}
                      >
                        <strong className="block text-xs text-[var(--accent)]">
                          {
                            messages[
                              index
                            ]
                              ?.username
                          }
                        </strong>

                        <span className="block truncate text-sm">
                          {messages[
                            index
                          ]?.text ||
                            messages[
                              index
                            ]
                              ?.fileName ||
                            "Media message"}
                        </span>

                        <span className="text-[10px] opacity-50">
                          {
                            messages[
                              index
                            ]?.time
                          }
                        </span>
                      </button>
                    )
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            MESSAGE INFO
        ================================================= */}

        {messageInfo && infoMessage && (
          <div
            className="fixed inset-0 z-[210] flex items-center justify-center bg-black/55 p-4"
            onClick={() => setMessageInfo(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl ${
                darkMode
                  ? "bg-[#0b1629] text-white"
                  : "bg-white text-[#071F49]"
              }`}
            >
              <div className="bg-[var(--accent)] px-5 py-4 text-white">
                <h2 className="font-bold">
                  Message Info
                </h2>
              </div>

              <div className="p-5">
                <div className="rounded-xl bg-black/5 p-3 text-sm">
                  {infoMessage.text ||
                    infoMessage.fileName ||
                    "Media message"}
                </div>

                <div className="mt-4 space-y-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        Delivered
                      </span>
                      <strong className="text-[var(--accent)]">
                        {firstDelivered?.time || "Waiting..."}
                      </strong>
                    </div>
                    <p className="mt-1 opacity-55">
                      {infoReceipt.delivered.length
                        ? `${infoReceipt.delivered.length} member${
                            infoReceipt.delivered.length === 1 ? "" : "s"
                          } delivered`
                        : "No member delivery receipt yet"}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        Read
                      </span>
                      <strong className="text-[var(--accent)]">
                        {firstRead?.time || "Waiting..."}
                      </strong>
                    </div>
                    <p className="mt-1 opacity-55">
                      {infoReceipt.read.length
                        ? `${infoReceipt.read.length} member${
                            infoReceipt.read.length === 1 ? "" : "s"
                          } read`
                        : "No read receipt yet"}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 font-semibold">
                      Seen by
                    </div>

                    {infoReceipt.read.length ? (
                      <div className="space-y-2">
                        {infoReceipt.read.map((entry) => (
                          <div
                            key={entry.username}
                            className="flex items-center gap-2"
                          >
                            <Avatar name={entry.username} />
                            <span className="min-w-0 flex-1 truncate">
                              {entry.username}
                            </span>
                            <span className="text-[10px] opacity-55">
                              Read by {entry.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="opacity-55">
                        No one has seen this message yet.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 font-semibold">
                      Not seen by
                    </div>

                    {notSeenMembers.length ? (
                      <div className="space-y-2">
                        {notSeenMembers.map((member) => (
                          <div
                            key={member}
                            className="flex items-center gap-2"
                          >
                            <Avatar name={member} />
                            <span className="min-w-0 flex-1 truncate">
                              {member}
                            </span>
                            <span className="text-[10px] opacity-55">
                              Not seen
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="opacity-55">
                        All current group members have seen it.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between border-t border-black/10 pt-3">
                    <span className="opacity-55">
                      Sent
                    </span>
                    <strong>
                      {infoMessage.time}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <span className="opacity-55">
                      Sender
                    </span>
                    <strong>
                      {infoMessage.username}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={() => setMessageInfo(null)}
                  className="mt-5 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-bold text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}