from pathlib import Path
p=Path('/tmp/chatfix/src/components/ChatRoom.jsx')
s=p.read_text()
# camera timer state/ref
s=s.replace('  const [cameraRecording, setCameraRecording] =\n    useState(false);', '  const [cameraRecording, setCameraRecording] =\n    useState(false);\n\n  const [cameraRecordingTime, setCameraRecordingTime] =\n    useState(0);')
s=s.replace('  const cameraChunksRef =\n    useRef([]);', '  const cameraChunksRef =\n    useRef([]);\n\n  const cameraRecordingTimerRef =\n    useRef(null);\n\n  const cameraRecordingTimeRef =\n    useRef(0);')
# helper cleanup camera
s=s.replace('  const stopCamera = () => {', '  const stopCamera = () => {')
# insert pin handler before user joined
needle='''      if (\n        msg.type ===\n        "user-joined"\n      ) {'''
insert='''      if (\n        msg.type === "message-pin"\n      ) {\n        const targetIndex = messages.findIndex(\n          (item) => item?.id === msg.messageId\n        );\n\n        if (targetIndex !== -1) {\n          setPinnedMessages((prev) =>\n            msg.action === "unpin"\n              ? prev.filter((i) => i !== targetIndex)\n              : prev.includes(targetIndex)\n                ? prev\n                : [...prev, targetIndex]\n          );\n\n          setMessages((prev) => [\n            ...prev,\n            normalize({\n              type: "system",\n              text: `${incomingUsername || "Someone"} ${msg.action === "unpin" ? "unpinned" : "pinned"} ${msg.messageText || "this message"} at ${msg.time || getCurrentTime()}`,\n              username: incomingUsername || "Someone",\n              time: msg.time || getCurrentTime(),\n            }),\n          ]);\n        }\n        return;\n      }\n\n      if (\n        msg.type ===\n        "user-joined"\n      ) {'''
s=s.replace(needle,insert)
# outside close handler
old='''        setSelectedMessage(null);\n        setShowChatMenu(false);\n        setShowEmojiPicker(false);\n        setShowAttachmentMenu(false);\n        setShowDisappearPicker(\n          false\n        );'''
new='''        setSelectedMessage(null);\n        setShowChatMenu(false);\n        setShowEmojiPicker(false);\n        setShowAttachmentMenu(false);\n        setShowDisappearPicker(false);\n\n        if (selectionMode && selectedMessages.length === 0) {\n          setSelectionMode(false);\n        }'''
s=s.replace(old,new)
# dependency effect
s=s.replace('''  }, []);\n\n  useEffect(() => {\n    disappearingRef.current =''','''  }, [selectionMode, selectedMessages.length]);\n\n  useEffect(() => {\n    disappearingRef.current =''',1)
# togglePin function
old='''  const togglePin =\n    (index) => {\n      setPinnedMessages(\n        (prev) =>\n          prev.includes(index)\n            ? prev.filter(\n                (i) =>\n                  i !== index\n              )\n            : [\n                ...prev,\n                index,\n              ]\n      );\n\n      setSelectedMessage(\n        null\n      );\n    };'''
new='''  const togglePin =\n    (index) => {\n      const target = messages[index];\n      if (!target?.id) return;\n\n      const isPinned = pinnedMessages.includes(index);\n      const action = isPinned ? "unpin" : "pin";\n      const time = getCurrentTime();\n\n      setPinnedMessages((prev) =>\n        isPinned\n          ? prev.filter((i) => i !== index)\n          : [...prev, index]\n      );\n\n      setMessages((prev) => [\n        ...prev,\n        {\n          id: uid(),\n          type: "system",\n          text: `${username?.trim() || "You"} ${action === "pin" ? "pinned" : "unpinned"} ${target.text || target.fileName || "this message"} at ${time}`,\n          username: username?.trim() || "You",\n          time,\n          createdAt: Date.now(),\n        },\n      ]);\n\n      socket?.emit("send", {\n        type: "message-pin",\n        action,\n        messageId: target.id,\n        messageText: target.text || target.fileName || "this message",\n        username: username?.trim() || "You",\n        room: room?.trim(),\n        time,\n      });\n\n      setSelectedMessage(null);\n    };'''
if old not in s: print('togglePin not found')
s=s.replace(old,new)
# clearSelected should close immediately, okay. clearChat selection mode false
s=s.replace('''    setSelectedMessages(\n      []\n    );\n\n    setShowChatMenu(\n      false\n    );''','''    setSelectedMessages([]);\n    setSelectionMode(false);\n    setShowChatMenu(false);''',1)
# select attachment remove audio add video same menu callback later
# Camera recorder replacement add timer
old='''    if (cameraRecording) {\n      cameraRecorderRef.current?.stop();\n      setCameraRecording(false);\n      return;\n    }'''
new='''    if (cameraRecording) {\n      cameraRecorderRef.current?.stop();\n      if (cameraRecordingTimerRef.current) {\n        window.clearInterval(cameraRecordingTimerRef.current);\n        cameraRecordingTimerRef.current = null;\n      }\n      setCameraRecording(false);\n      return;\n    }'''
s=s.replace(old,new)
old='''      recorder.start();\n      setCameraRecording(true);'''
new='''      recorder.start();\n      cameraRecordingTimeRef.current = 0;\n      setCameraRecordingTime(0);\n      setCameraRecording(true);\n      cameraRecordingTimerRef.current = window.setInterval(() => {\n        cameraRecordingTimeRef.current += 1;\n        setCameraRecordingTime(cameraRecordingTimeRef.current);\n      }, 1000);'''
s=s.replace(old,new)
# onstop timer cleanup before prepare
s=s.replace('''      recorder.onstop = () => {\n        const blob = new Blob''','''      recorder.onstop = () => {\n        if (cameraRecordingTimerRef.current) {\n          window.clearInterval(cameraRecordingTimerRef.current);\n          cameraRecordingTimerRef.current = null;\n        }\n        setCameraRecordingTime(cameraRecordingTimeRef.current);\n\n        const blob = new Blob''')
# cleanup unmount
s=s.replace('''      cameraStreamRef.current\n        ?.getTracks()\n        .forEach((track) => track.stop());''','''      cameraStreamRef.current\n        ?.getTracks()\n        .forEach((track) => track.stop());\n      if (cameraRecordingTimerRef.current) {\n        window.clearInterval(cameraRecordingTimerRef.current);\n      }''')
# camera timer UI
s=s.replace('''                    {cameraRecording ? "STOP" : "REC"}\n                  </button>''','''                    {cameraRecording ? formatDuration(cameraRecordingTime) : "REC"}\n                  </button>''')
# attachment menu callbacks
s=s.replace('''            onPhoto={() =>\n              selectAttachment(\n                "image"\n              )\n            }\n            onCamera={\n              handleCamera\n            }\n            onAudio={() =>\n              selectAttachment(\n                "audio"\n              )\n            }''','''            onPhoto={() => selectAttachment("image")}\n            onVideo={() => selectAttachment("video")}\n            onCamera={handleCamera}''')
# remove audio input block
start='''        <input\n          ref={audioInputRef}\n          type="file"\n          hidden\n          accept="audio/*"\n          onChange={(e) => {\n            readFile(\n              e.target.files?.[0]\n            );\n\n            e.target.value =\n              "";\n          }}\n        />\n\n'''
s=s.replace(start,'')
# voice preview icon
s=s.replace('''<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-white">\n                ●\n              </div>''','''<div className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent text-[var(--accent)]">\n                ▶\n              </div>''')
# footer voice icon triangle
s=s.replace('''className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white"\n                >\n                  🎙\n                </button>''','''className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-transparent text-[var(--accent)] text-lg"\n                aria-label="Record voice"\n                >\n                  ▶\n                </button>''')
# selection action clear chat styling and selection outside behavior done. Make dark visible.
s=s.replace('''className="rounded-lg px-3 py-1.5 text-xs font-semibold text-[#071F49] disabled:opacity-40"''','''className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${darkMode ? "text-blue-300 hover:bg-blue-400/10" : "text-[#071F49] hover:bg-[var(--accent)]/10"} disabled:opacity-40` }''')
# selection clear chat should call clearSelected? It currently clears whole chat; leave semantics.
# pass canDelete/info through MessageBubble via isOwn
s=s.replace('''                        onInfo={() =>\n                          showInfo(\n                            msg,\n                            index\n                          )\n                        }''','''                        onInfo={\n                          isOwn\n                            ? () => showInfo(msg, index)\n                            : undefined\n                        }''')
p.write_text(s)
