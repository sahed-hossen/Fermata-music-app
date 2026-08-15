import React, { useState, useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  Send,
  Music,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Sparkles,
  ChevronDown,
  Terminal,
  Bot,
  User as UserIcon,
} from 'lucide-react'
import {
  searchSongCandidates,
  submitCandidateSelection,
  simulateAdminApproval,
} from '@/api/agenticIngest'
import type { CandidateSong } from '@/api/agenticIngest'
import { usePlayerStore } from '@/store/playerStore'
import { useAuthStore } from '@/store/authStore'
import logo from '@/assets/logo.svg'

interface Message {
  id: string
  sender: 'bot' | 'user'
  text: string
  type?: 'text' | 'candidates' | 'logs' | 'admin_simulation' | 'status'
  candidates?: CandidateSong[]
  logs?: string[]
  statusType?: 'success' | 'error' | 'warning'
  selected?: boolean
}

export default function ReportMissingPage() {
  const location = useLocation()
  const prefilledQuery = (location.state as any)?.prefilledQuery || ''

  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)

  const [messages, setMessages] = useState<Message[]>([])
  const [songName, setSongName] = useState('')
  const [artist, setArtist] = useState('')
  const [movieName, setMovieName] = useState('')
  const [threadId, setThreadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [ingestionLogs, setIngestionLogs] = useState<string[]>([])
  const [isComplete, setIsComplete] = useState<boolean>(false)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const setTrack = usePlayerStore((s) => s.setTrack)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const lastProcessedQuery = useRef<string | null>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Initialize and load chat state from sessionStorage on mount
  useEffect(() => {
    if (!user) return

    const cacheKey = `fermata-chatbot-state-${user.id}`
    const cached = sessionStorage.getItem(cacheKey)

    if (prefilledQuery) {
      if (lastProcessedQuery.current === prefilledQuery) return
      lastProcessedQuery.current = prefilledQuery

      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed.isComplete) {
            sessionStorage.removeItem(cacheKey)
          }
        } catch (e) {}
      }

      const welcomeId = Math.random().toString()
      const welcomeMsg: Message = {
        id: welcomeId,
        sender: 'bot',
        text: "Hi! I'm Fermata AI Ingestion Engine. What missing track or song would you like me to find and ingest for you today?",
        type: 'text',
      }
      setMessages([welcomeMsg])
      handleSearch(prefilledQuery)
      return
    }

    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setMessages(parsed.messages || [])
        setThreadId(parsed.threadId || null)
        setIngestionLogs(parsed.ingestionLogs || [])
        setIsComplete(parsed.isComplete || false)
        if (parsed.loading) {
          setLoading(true)
        }
        return
      } catch (e) {
        console.error('Failed to parse cached chatbot state', e)
      }
    }

    const welcomeId = Math.random().toString()
    setMessages([
      {
        id: welcomeId,
        sender: 'bot',
        text: "Hi! I'm Fermata AI Ingestion Engine. What missing track or song would you like me to find and ingest for you today?",
        type: 'text',
      },
    ])
  }, [user, prefilledQuery])

  // Save chat state to sessionStorage on state changes
  useEffect(() => {
    if (!user) return
    if (messages.length > 0) {
      const cacheKey = `fermata-chatbot-state-${user.id}`
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          messages,
          threadId,
          ingestionLogs,
          isComplete,
          loading,
        })
      )
    }
  }, [messages, threadId, ingestionLogs, isComplete, loading, user])

  const isCompleteRef = useRef(isComplete)
  useEffect(() => {
    isCompleteRef.current = isComplete
  }, [isComplete])

  useEffect(() => {
    return () => {
      if (isCompleteRef.current && user) {
        const cacheKey = `fermata-chatbot-state-${user.id}`
        sessionStorage.removeItem(cacheKey)
      }
    }
  }, [user])

  // Core Search Ingestion Function
  const handleSearch = async (
    songQuery: string,
    artistQuery?: string,
    movieQuery?: string,
    displayMessage?: string
  ) => {
    if (!songQuery.trim() || !user) return
    setLoading(true)
    setIsComplete(false)

    const cacheKey = `fermata-chatbot-state-${user.id}`
    const userMsgId = Math.random().toString()
    const userMsg: Message = { id: userMsgId, sender: 'user', text: displayMessage || songQuery }

    let currentMsgs: Message[] = []
    let currentThread: string | null = null
    let currentLogs: string[] = []
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        currentMsgs = parsed.messages || []
        currentThread = parsed.threadId || null
        currentLogs = parsed.ingestionLogs || []
      } catch (e) {}
    }

    const messagesWithUser = [...currentMsgs, userMsg]
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        messages: messagesWithUser,
        threadId: currentThread,
        ingestionLogs: currentLogs,
        isComplete: false,
        loading: true,
      })
    )
    setMessages(messagesWithUser)

    try {
      const response = await searchSongCandidates(songQuery, artistQuery, movieQuery)
      const botMsgId = Math.random().toString()
      let finalBotMsg: Message
      let newIsComplete = false
      let newThreadId = response.thread_id

      if (response.status === 'not_found' || response.candidates.length === 0) {
        newIsComplete = true
        finalBotMsg = {
          id: botMsgId,
          sender: 'bot',
          text: `Searched registries for "${songQuery}" but found no candidate tracks. The missing track report has been filed cleanly.`,
          type: 'status',
          statusType: 'warning',
        }
      } else {
        finalBotMsg = {
          id: botMsgId,
          sender: 'bot',
          text: `Found ${response.candidates.length} potential matches for "${songQuery}". Select the exact track version to ingest:`,
          type: 'candidates',
          candidates: response.candidates,
        }
      }

      let latestCachedMsgs = messagesWithUser
      const currentCached = sessionStorage.getItem(cacheKey)
      if (currentCached) {
        try {
          const parsed = JSON.parse(currentCached)
          latestCachedMsgs = parsed.messages || messagesWithUser
        } catch (e) {}
      }

      const finalMessages = [...latestCachedMsgs, finalBotMsg]
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          messages: finalMessages,
          threadId: newThreadId,
          ingestionLogs: currentLogs,
          isComplete: newIsComplete,
          loading: false,
        })
      )

      setIsComplete(newIsComplete)
      setThreadId(newThreadId)
      setMessages(finalMessages)
    } catch (err: any) {
      console.error(err)
      const errorMsgId = Math.random().toString()
      const errorMsg: Message = {
        id: errorMsgId,
        sender: 'bot',
        text: `Error during search: ${err.message || 'Server connection failed.'}`,
        type: 'status',
        statusType: 'error',
      }

      let latestCachedMsgs = messagesWithUser
      const currentCached = sessionStorage.getItem(cacheKey)
      if (currentCached) {
        try {
          const parsed = JSON.parse(currentCached)
          latestCachedMsgs = parsed.messages || messagesWithUser
        } catch (e) {}
      }

      const finalMessages = [...latestCachedMsgs, errorMsg]
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          messages: finalMessages,
          threadId: currentThread,
          ingestionLogs: currentLogs,
          isComplete: true,
          loading: false,
        })
      )

      setIsComplete(true)
      setMessages(finalMessages)
    } finally {
      setLoading(false)
    }
  }

  // Handle Candidate Selection
  const handleSelectSong = async (candidateId: string, songName: string) => {
    if (!threadId || !user) return
    setLoading(true)

    const userMsgId = Math.random().toString()
    const selectionName =
      candidateId === 'report_missing' ? 'None of these - File Missing Track Report' : songName

    const choiceMsg: Message = { id: userMsgId, sender: 'user', text: `Selected: ${selectionName}` }

    const cacheKey = `fermata-chatbot-state-${user.id}`
    let currentMsgs: Message[] = []
    let currentLogs: string[] = []
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        currentMsgs = parsed.messages || []
        currentLogs = parsed.ingestionLogs || []
      } catch (e) {}
    }

    const filteredMsgs = currentMsgs.map((m) => {
      if (m.type === 'candidates' && m.candidates) {
        if (candidateId === 'report_missing') {
          if (m.candidates.some((c) => c.title !== 'Ingested Track')) {
            return { ...m, candidates: [], selected: true }
          }
        } else {
          if (m.candidates.some((c) => c.id === candidateId)) {
            return {
              ...m,
              candidates: m.candidates.filter((c) => c.id === candidateId),
              selected: true,
            }
          }
        }
      }
      return m
    })

    const messagesWithChoice = [...filteredMsgs, choiceMsg]
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        messages: messagesWithChoice,
        threadId: threadId,
        ingestionLogs: currentLogs,
        isComplete: false,
        loading: true,
      })
    )
    setMessages(messagesWithChoice)

    try {
      const response = await submitCandidateSelection(threadId, candidateId)
      const botMsgId = Math.random().toString()
      const successMsg: Message = {
        id: botMsgId,
        sender: 'bot',
        text: 'Request submitted successfully. The track will be ingested and available in your library soon.',
        type: 'status',
        statusType: 'success',
      }

      let latestCachedMsgs = messagesWithChoice
      const currentCached = sessionStorage.getItem(cacheKey)
      if (currentCached) {
        try {
          const parsed = JSON.parse(currentCached)
          latestCachedMsgs = parsed.messages || messagesWithChoice
        } catch (e) {}
      }

      const reFilteredMsgs = latestCachedMsgs.map((m) => {
        if (m.type === 'candidates' && m.candidates) {
          if (candidateId === 'report_missing') {
            if (m.candidates.some((c) => c.title !== 'Ingested Track')) {
              return { ...m, candidates: [], selected: true }
            }
          } else {
            if (m.candidates.some((c) => c.id === candidateId)) {
              return {
                ...m,
                candidates: m.candidates.filter((c) => c.id === candidateId),
                selected: true,
              }
            }
          }
        }
        return m
      })

      const finalMessages = [...reFilteredMsgs, successMsg]
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          messages: finalMessages,
          threadId: threadId,
          ingestionLogs: currentLogs,
          isComplete: true,
          loading: false,
        })
      )

      setIsComplete(true)
      setMessages(finalMessages)
    } catch (err: any) {
      console.error(err)
      const errorMsgId = Math.random().toString()
      const errorMsg: Message = {
        id: errorMsgId,
        sender: 'bot',
        text: `Failed to submit selection: ${err.message || 'Server error.'}`,
        type: 'status',
        statusType: 'error',
      }

      let latestCachedMsgs = messagesWithChoice
      const currentCached = sessionStorage.getItem(cacheKey)
      if (currentCached) {
        try {
          const parsed = JSON.parse(currentCached)
          latestCachedMsgs = parsed.messages || messagesWithChoice
        } catch (e) {}
      }

      const finalMessages = [...latestCachedMsgs, errorMsg]
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          messages: finalMessages,
          threadId: threadId,
          ingestionLogs: currentLogs,
          isComplete: true,
          loading: false,
        })
      )

      setIsComplete(true)
      setMessages(finalMessages)
    } finally {
      setLoading(false)
    }
  }

  // Simulate Admin Review Decision
  const handleAdminReview = async (approved: boolean) => {
    if (!threadId) return
    setLoading(true)

    const botMsgId = Math.random().toString()
    setMessages((prev) => [
      ...prev,
      {
        id: botMsgId,
        sender: 'bot',
        text: 'Starting agentic pipeline... Resolving audio streams and preparing track...',
        type: 'text',
      },
    ])

    try {
      const response = await simulateAdminApproval(threadId, approved, 'Simulated from AI Chatbot Interface')
      const finalMsgId = Math.random().toString()

      if (response.status === 'completed') {
        setIsComplete(true)
        setMessages((prev) => [
          ...prev,
          {
            id: finalMsgId,
            sender: 'bot',
            text: 'Ingestion Successful! Track extracted, metadata attached, and saved to library.',
            type: 'status',
            statusType: 'success',
            logs: response.logs,
          },
        ])

        if (response.track_id && response.audio_url) {
          const playMsgId = Math.random().toString()
          setMessages((prev) => [
            ...prev,
            {
              id: playMsgId,
              sender: 'bot',
              text: `Ingested Track ID: ${response.track_id}. Ready to play immediately!`,
              type: 'candidates',
              candidates: [
                {
                  id: String(response.track_id),
                  title: 'Ingested Track',
                  artist: 'Ready',
                  album: 'Fermata Library',
                  duration_seconds: 200,
                  source_url: response.audio_url || '',
                  cover_url: response.cover_url || '',
                },
              ],
            },
          ])
        }
      } else {
        setIsComplete(true)
        setMessages((prev) => [
          ...prev,
          {
            id: finalMsgId,
            sender: 'bot',
            text: 'Ingestion request rejected by administrator.',
            type: 'status',
            statusType: 'error',
            logs: response.logs,
          },
        ])
      }
    } catch (err: any) {
      console.error(err)
      const errorMsgId = Math.random().toString()
      setMessages((prev) => [
        ...prev,
        {
          id: errorMsgId,
          sender: 'bot',
          text: `Pipeline error: ${err.message || 'Check logs for S3 credentials or connection.'}`,
          type: 'status',
          statusType: 'error',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Play ingested track
  const handlePlayIngested = (cand: CandidateSong) => {
    const trackObj = {
      id: Number(cand.id),
      title: cand.title === 'Ingested Track' ? 'Ingested Song' : cand.title,
      album_id: null,
      duration_seconds: cand.duration_seconds,
      audio_url: cand.source_url,
      cover_url: cand.cover_url || null,
      album_title: cand.album,
      artist_id: null,
      artist_name: cand.artist,
    }
    setQueue([trackObj])
    setTrack(trackObj)
  }

  const handleSend = () => {
    if (!songName.trim()) return

    const s = songName.trim()
    const a = artist.trim()
    const m = movieName.trim()

    setSongName('')
    setArtist('')
    setMovieName('')

    const displayMsg = `${s}` + (a ? ` — ${a}` : '') + (m ? ` (${m})` : '')
    handleSearch(s, a, m, displayMsg)
  }

  const handleQuickChip = (s: string, a?: string) => {
    setSongName(s)
    if (a) setArtist(a)
  }

  if (!user || !token) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-subtext">Authenticating AI Engine...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-3xl mx-auto space-y-4 font-sans">
      {/* Sleek Minimal AI Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 px-1">
        <div className="flex items-center gap-3">
          <Link
            to="/search"
            className="p-2 hover:bg-white/10 rounded-full text-subtext hover:text-primary transition-colors"
            title="Back to Search"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0e0e16] border border-purple-500/30 p-1.5 shadow-md flex items-center justify-center relative overflow-hidden group hover:border-spotify-green/50 transition-all cursor-pointer">
              <img
                src={logo}
                alt="Fermata Logo"
                className="w-full h-full object-contain group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 animate-[pulse_3s_ease-in-out_infinite]"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-primary tracking-tight">Fermata AI Ingestion</h1>
                <span className="text-[9px] font-extrabold bg-spotify-green/15 text-spotify-green border border-spotify-green/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  ONLINE
                </span>
              </div>
              <p className="text-[11px] text-subtext">Smart track discovery & automatic library ingestion</p>
            </div>
          </div>
        </div>

        {/* Clear / New Session Button */}
        <button
          onClick={() => {
            if (user) {
              sessionStorage.removeItem(`fermata-chatbot-state-${user.id}`)
              setMessages([
                {
                  id: Math.random().toString(),
                  sender: 'bot',
                  text: "Session cleared. What missing track would you like me to find and ingest?",
                  type: 'text',
                },
              ])
              setThreadId(null)
              setIsComplete(false)
            }
          }}
          className="text-xs text-subtext hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 border border-white/5 transition-all"
        >
          <RefreshCw size={13} />
          <span>New Session</span>
        </button>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-[#0e0e14]/60 border border-white/[0.08] p-4 sm:p-5 space-y-4 min-h-0 scrollbar-thin shadow-2xl backdrop-blur-xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            } animate-in fade-in duration-200`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center shadow-sm text-xs font-bold ${
                msg.sender === 'user'
                  ? 'bg-spotify-green text-black'
                  : 'bg-[#0f0f18] border border-white/15 p-1'
              }`}
            >
              {msg.sender === 'user' ? <UserIcon size={14} /> : <img src={logo} alt="Fermata AI" className="w-full h-full object-contain" />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-spotify-green/15 border border-spotify-green/30 text-white font-medium rounded-tr-none shadow-md'
                  : 'bg-[#151520] border border-white/10 text-white/90 rounded-tl-none shadow-md'
              }`}
            >
              {/* Normal Text */}
              {(!msg.type || msg.type === 'text') && <p className="whitespace-pre-wrap">{msg.text}</p>}

              {/* Status Banner */}
              {msg.type === 'status' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5">
                    {msg.statusType === 'success' && <CheckCircle size={17} className="text-spotify-green mt-0.5 shrink-0" />}
                    {msg.statusType === 'error' && <XCircle size={17} className="text-red-400 mt-0.5 shrink-0" />}
                    {msg.statusType === 'warning' && <AlertCircle size={17} className="text-amber-400 mt-0.5 shrink-0" />}
                    <p className="font-semibold text-xs text-white">{msg.text}</p>
                  </div>

                  {msg.logs && msg.logs.length > 0 && (
                    <div className="mt-3 bg-[#0a0a0f] rounded-xl p-3 border border-white/10">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-spotify-green border-b border-white/10 pb-1 mb-2">
                        <Terminal size={12} />
                        <span>Execution Pipeline Logs:</span>
                      </div>
                      <div className="max-h-40 overflow-y-auto scrollbar-thin text-[11px] font-mono text-white/70 space-y-1">
                        {msg.logs.map((log, i) => (
                          <div key={i} className="whitespace-pre-wrap leading-tight">{log}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Ingestion Candidates Cards */}
              {msg.type === 'candidates' && msg.candidates && (
                <div className="space-y-3 mt-1">
                  <p className="text-xs font-medium text-white/90">{msg.text}</p>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                    {msg.candidates.map((cand) => {
                      const isPlayCard = cand.title === 'Ingested Track'
                      return (
                        <div
                          key={cand.id}
                          className="flex items-center gap-3 p-3 bg-[#1a1a24] hover:bg-[#222230] rounded-xl border border-white/10 hover:border-spotify-green/40 transition-all text-left group shadow-md"
                        >
                          <div className="w-10 h-10 bg-black/40 rounded-lg shrink-0 overflow-hidden flex items-center justify-center border border-white/10">
                            {cand.cover_url ? (
                              <img src={cand.cover_url} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <Music size={16} className="text-white/40" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white group-hover:text-spotify-green truncate text-xs">
                              {cand.title}
                            </p>
                            <p className="text-[10px] text-white/50 truncate mt-0.5">
                              {cand.artist} • {cand.album} ({cand.duration_seconds}s)
                            </p>
                          </div>

                          {isPlayCard ? (
                            <button
                              onClick={() => handlePlayIngested(cand)}
                              className="px-3.5 py-1.5 bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0 shadow transition-all hover:scale-105"
                            >
                              <Play size={11} fill="black" /> Play
                            </button>
                          ) : msg.selected ? null : (
                            <button
                              onClick={() => handleSelectSong(cand.id, cand.title)}
                              className="px-3.5 py-1.5 bg-spotify-green hover:bg-spotify-green-hover text-black text-xs font-bold rounded-full shrink-0 shadow transition-all hover:scale-105 cursor-pointer"
                            >
                              Ingest
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {!msg.selected && msg.candidates[0]?.title !== 'Ingested Track' && (
                      <button
                        onClick={() => handleSelectSong('report_missing', 'Report Missing Song')}
                        className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 text-xs font-semibold rounded-xl transition-all text-center mt-2 cursor-pointer"
                      >
                        None of these match — File Missing Track Report
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Simulation Node */}
              {msg.type === 'admin_simulation' && (
                <div className="space-y-3">
                  <p className="font-medium text-xs text-white flex items-center gap-2">
                    <AlertCircle size={16} className="text-spotify-green shrink-0" />
                    {msg.text}
                  </p>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2">
                    <p className="text-[11px] text-white/60">
                      Simulate administrator verification decision:
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdminReview(true)}
                        className="flex-1 py-1.5 bg-spotify-green text-black text-xs font-bold rounded-lg hover:brightness-110 transition-all"
                      >
                        Approve & Ingest
                      </button>
                      <button
                        onClick={() => handleAdminReview(false)}
                        className="flex-1 py-1.5 bg-white/10 text-white text-xs font-semibold rounded-lg hover:bg-white/20 transition-all border border-white/10"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 text-xs text-white/50 pl-1">
            <div className="w-5 h-5 rounded-full bg-spotify-green/20 flex items-center justify-center">
              <Sparkles size={11} className="text-spotify-green animate-spin" />
            </div>
            <span>Fermata AI is searching registries...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none text-[11px]">
        <span className="text-white/40 font-semibold shrink-0">Quick Prompt:</span>
        <button
          onClick={() => handleQuickChip('Blinding Lights', 'The Weeknd')}
          className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all shrink-0 cursor-pointer"
        >
          🎵 Blinding Lights (The Weeknd)
        </button>
        <button
          onClick={() => handleQuickChip('Starboy', 'Daft Punk')}
          className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all shrink-0 cursor-pointer"
        >
          🎧 Starboy (Daft Punk)
        </button>
        <button
          onClick={() => handleQuickChip('Interstellar Theme', 'Hans Zimmer')}
          className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all shrink-0 cursor-pointer"
        >
          🎬 Interstellar Theme
        </button>
      </div>

      {/* Floating AI Input Bar */}
      <div className="bg-[#12121c] border border-white/15 rounded-2xl p-3 shadow-2xl space-y-3 shrink-0">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          {/* Song Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
              Song Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Song title (mandatory)..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-spotify-green/50 placeholder:text-white/30 transition-colors"
              disabled={loading}
            />
          </div>

          {/* Artist / Singer */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
              Artist / Singer
            </label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Singer name (optional)..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-spotify-green/50 placeholder:text-white/30 transition-colors"
              disabled={loading}
            />
          </div>

          {/* Movie / Album */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
              Movie / Album
            </label>
            <input
              type="text"
              value={movieName}
              onChange={(e) => setMovieName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Movie or Album (optional)..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-spotify-green/50 placeholder:text-white/30 transition-colors"
              disabled={loading}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={loading || !songName.trim()}
            className="w-9 h-9 rounded-full bg-spotify-green disabled:bg-white/10 text-black disabled:text-white/30 flex items-center justify-center transition-all shadow-md hover:scale-105 active:scale-95 disabled:scale-100 cursor-pointer shrink-0 mb-[1px]"
            title="Send request"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
