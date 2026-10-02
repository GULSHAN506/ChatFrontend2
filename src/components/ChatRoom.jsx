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

  const [viewOnce, setViewOnce] =
    useState(false);

  const [mediaCaption, setMediaCaption] =
    useState("");

  // View Once opened tracker per user for each message ID
  const [openedViewOnceIds, setOpenedViewOnceIds] = useState({});

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

  const [drawStrokes, setDrawStrokes] =
    useState([]);

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
     READ FILE (Fixed for Videos and Files Payload)
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
     SEND MESSAGE HANDLER (Ensures ViewOnce and Video Data are passed)
  ===================================================== */

  const handleSendMessage = (overrideFile = null, overrideVoice = null) => {
    const fileToSend = overrideFile || selectedFile;
    const voiceToSend = overrideVoice || selectedVoice;

    if (!message.trim() && !fileToSend && !voiceToSend) return;

    const newMessage = {
      id: uid(),
      username: username.trim(),
      room: room.trim(),
      text: message.trim(),
      file: fileToSend ? { ...fileToSend } : null,
      voice: voiceToSend ? { ...voiceToSend } : null,
      viewOnce: Boolean(viewOnce),
      caption: mediaCaption.trim(),
      time: getCurrentTime(),
      createdAt: Date.now(),
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, username: replyTo.username } : null,
    };

    if (socket && socket.connected) {
      socket.emit("send", {
        type: "message",
        ...newMessage,
      });
    }

    setMessages((prev) => [...prev, newMessage]);

    // Reset input states
    setMessage("");
    setSelectedFile(null);
    setSelectedVoice(null);
    setViewOnce(false);
    setMediaCaption("");
    setReplyTo(null);
    closeMediaBox();
  };

  /* =====================================================
     EDITOR POINT & DRAWING
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

  return (
    <div className="flex h-full w-full flex-col">
      {/* Chat Room UI Elements */}
    </div>
  );
}