import { useRef, useEffect, useCallback, useState } from 'react'
import { usePlayerStore } from '@/store/playerStore'
import {
  X,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Music,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Languages,
  Loader2,
  Maximize2,
  Minimize2,
  Sparkles,
  Disc3,
} from 'lucide-react'
import { transliterateTrackLyrics } from '@/api/tracks'

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function ExpandedPlayer() {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isExpanded = usePlayerStore((s) => s.isExpanded)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const progressMs = usePlayerStore((s) => s.progressMs)
  const durationMs = usePlayerStore((s) => s.durationMs)
  const volume = usePlayerStore((s) => s.volume)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeatMode = usePlayerStore((s) => s.repeatMode)

  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)
  const setProgressMs = usePlayerStore((s) => s.setProgressMs)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const setShuffle = usePlayerStore((s) => s.setShuffle)
  const setRepeatMode = usePlayerStore((s) => s.setRepeatMode)
  const playNext = usePlayerStore((s) => s.playNext)
  const playPrevious = usePlayerStore((s) => s.playPrevious)

  const progressBarRef = useRef<HTMLDivElement>(null)
  const lyricsProgressBarRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const isLyricsDragging = useRef(false)

  // Transliteration states
  const [transliterating, setTransliterating] = useState(false)
  const [transliteration, setTransliteration] = useState<string | null>(null)
  const [showTransliteration, setShowTransliteration] = useState(false)
  const [translitError, setTranslitError] = useState<string | null>(null)
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isMobileScreen = window.innerWidth < 768
      setIsMobile(isMobileUA || isMobileScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Reset per-track state on track change
  useEffect(() => {
    setTransliteration(null)
    setShowTransliteration(false)
    setTranslitError(null)
    setIsLyricsExpanded(false)
  }, [currentTrack?.id])

  const handleSeek = useCallback(
    (clientX: number) => {
      const bar = progressBarRef.current
      if (!bar || !durationMs) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newMs = ratio * durationMs
      if ((window as any).fermataSeek) {
        (window as any).fermataSeek(newMs)
      }
      setProgressMs(newMs)
    },
    [durationMs, setProgressMs],
  )

  const handleLyricsSeek = useCallback(
    (clientX: number) => {
      const bar = lyricsProgressBarRef.current
      if (!bar || !durationMs) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newMs = ratio * durationMs
      if ((window as any).fermataSeek) {
        (window as any).fermataSeek(newMs)
      }
      setProgressMs(newMs)
    },
    [durationMs, setProgressMs],
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    handleSeek(e.clientX)
  }, [handleSeek])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    isDragging.current = true
    handleSeek(e.touches[0].clientX)
  }, [handleSeek])

  const handleLyricsMouseDown = useCallback((e: React.MouseEvent) => {
    isLyricsDragging.current = true
    handleLyricsSeek(e.clientX)
  }, [handleLyricsSeek])

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (isDragging.current) {
        handleSeek(e.clientX)
      }
      if (isLyricsDragging.current) {
        handleLyricsSeek(e.clientX)
      }
    }

    const handleMouseUpGlobal = () => {
      isDragging.current = false
      isLyricsDragging.current = false
    }

    const handleTouchMoveGlobal = (e: TouchEvent) => {
      if (isDragging.current) {
        e.preventDefault()
        handleSeek(e.touches[0].clientX)
      }
      if (isLyricsDragging.current) {
        e.preventDefault()
        handleLyricsSeek(e.touches[0].clientX)
      }
    }

    const handleTouchEndGlobal = () => {
      isDragging.current = false
      isLyricsDragging.current = false
    }

    window.addEventListener('mousemove', handleMouseMoveGlobal)
    window.addEventListener('mouseup', handleMouseUpGlobal)
    window.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false })
    window.addEventListener('touchend', handleTouchEndGlobal)

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal)
      window.removeEventListener('mouseup', handleMouseUpGlobal)
      window.removeEventListener('touchmove', handleTouchMoveGlobal)
      window.removeEventListener('touchend', handleTouchEndGlobal)
    }
  }, [handleSeek, handleLyricsSeek])

  const cycleRepeat = () => {
    const modes: Array<'off' | 'context' | 'track'> = ['off', 'context', 'track']
    const idx = modes.indexOf(repeatMode)
    setRepeatMode(modes[(idx + 1) % modes.length])
  }

  const handleTransliterate = async () => {
    if (!currentTrack) return
    if (transliteration) {
      setShowTransliteration((prev) => !prev)
      return
    }
    setTransliterating(true)
    setTranslitError(null)
    try {
      const result = await transliterateTrackLyrics(currentTrack.id)
      setTransliteration(result.transliteration)
      setShowTransliteration(true)
    } catch {
      setTranslitError('Transliteration failed. Please try again.')
    } finally {
      setTransliterating(false)
    }
  }

  if (!isExpanded || !currentTrack) return null

  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0
  const hasLyrics = !!(currentTrack.lyrics && currentTrack.lyrics.trim())
  const rawLyrics = showTransliteration && transliteration ? transliteration : currentTrack.lyrics || ''

  return (
    <div className="fixed inset-0 z-50 bg-[#09090e] text-white flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden font-sans select-none">
      {/* Dynamic Ambient Background Blur Glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-spotify-green/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-black/40 backdrop-blur-xl">
        <button
          onClick={() => {
            if (isLyricsExpanded) {
              setIsLyricsExpanded(false)
            } else {
              usePlayerStore.setState({ isExpanded: false })
            }
          }}
          className="p-2.5 bg-white/5 hover:bg-white/15 rounded-full text-subtext hover:text-white transition-all transform hover:scale-105 cursor-pointer border border-white/10"
          title="Minimize player"
        >
          <X size={20} />
        </button>
        <div className="text-center flex-1 min-w-0 px-4">
          {isLyricsExpanded ? (
            <>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-spotify-green">Live Karaoke Lyrics</p>
              <p className="text-sm font-bold text-white truncate max-w-[280px] mx-auto mt-0.5">
                {currentTrack.title}
              </p>
            </>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-extrabold tracking-wider uppercase text-subtext">
              <Disc3 size={14} className={`text-spotify-green ${isPlaying ? 'animate-spin' : ''}`} />
              <span>Now Playing</span>
            </div>
          )}
        </div>
        <div className="w-10 h-10" />
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto max-w-6xl mx-auto w-full p-6 flex flex-col md:flex-row gap-8 items-center md:items-stretch min-h-0">
        {/* Left Panel: Album Art & Controls */}
        <div
          className={`flex-1 flex flex-col justify-center items-center max-w-md w-full gap-7 shrink-0 ${
            isLyricsExpanded ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Glassmorphic Album Cover Card */}
          <div className="relative group w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-[#12121c] flex items-center justify-center shrink-0">
            {currentTrack.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <Music size={96} className="text-white/20" />
            )}
            {/* Soft Ambient Shadow Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Track Info */}
          <div className="text-center w-full min-w-0 px-2">
            <h1 className="text-2xl font-black text-white truncate tracking-tight">{currentTrack.title}</h1>
            <p className="text-spotify-green/90 text-sm font-semibold mt-1 truncate">{currentTrack.artist_name || 'Unknown Artist'}</p>
          </div>

          {/* Player controls */}
          <div className="w-full max-w-sm flex flex-col gap-4 bg-white/[0.03] border border-white/10 p-4 rounded-3xl backdrop-blur-md shadow-xl">
            {/* Buttons Row */}
            <div className="flex items-center justify-between px-2">
              {/* Shuffle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setShuffle(!shuffle)}
                  className={`p-2 rounded-full transition-all cursor-pointer ${
                    shuffle ? 'text-spotify-green scale-110' : 'text-subtext hover:text-white'
                  }`}
                  title={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
                >
                  <Shuffle size={18} />
                </button>
                {shuffle && <span className="w-1.5 h-1.5 bg-spotify-green rounded-full mt-0.5 animate-ping" />}
              </div>

              {/* Previous */}
              <button
                onClick={() => playPrevious()}
                className="p-2.5 text-subtext hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
                title="Previous Track"
              >
                <SkipBack size={22} fill="currentColor" />
              </button>

              {/* Play/Pause Button with Pulse Aura */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-14 h-14 bg-spotify-green hover:bg-spotify-green-hover text-black rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shrink-0 ${
                  isPlaying ? 'shadow-[0_0_25px_rgba(30,215,96,0.5)]' : ''
                }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />}
              </button>

              {/* Next */}
              <button
                onClick={() => playNext(true)}
                className="p-2.5 text-subtext hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
                title="Next Track"
              >
                <SkipForward size={22} fill="currentColor" />
              </button>

              {/* Repeat */}
              <div className="flex flex-col items-center">
                <button
                  onClick={cycleRepeat}
                  className={`p-2 rounded-full transition-all cursor-pointer ${
                    repeatMode !== 'off' ? 'text-spotify-green scale-110' : 'text-subtext hover:text-white'
                  }`}
                  title={`Repeat mode: ${repeatMode}`}
                >
                  {repeatMode === 'track' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
                {repeatMode !== 'off' && <span className="w-1.5 h-1.5 bg-spotify-green rounded-full mt-0.5" />}
              </div>
            </div>

            {/* Skipbar (Progress Bar with Timings Below) */}
            <div className="w-full flex flex-col gap-1.5 px-1">
              <div
                ref={progressBarRef}
                className="relative w-full py-2.5 cursor-pointer group touch-none"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
              >
                <div className="h-1.5 bg-white/10 rounded-full w-full overflow-hidden">
                  <div
                    className="h-full bg-spotify-green rounded-full transition-colors"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-md
                    w-4 h-4 md:w-3.5 md:h-3.5
                    opacity-100 md:opacity-0 md:group-hover:opacity-100
                    transition-opacity"
                  style={{ left: `${progress}%`, marginLeft: isMobile ? '-8px' : '-7px' }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-subtext font-mono tabular-nums px-0.5">
                <span>{formatTime(progressMs)}</span>
                <span>{formatTime(durationMs)}</span>
              </div>
            </div>

            {/* Volume Control */}
            {!isMobile && (
              <div className="hidden md:flex items-center gap-3 w-full px-1 mt-1 justify-start">
                <button
                  onClick={() => setVolume(volume === 0 ? 50 : 0)}
                  className="text-subtext hover:text-white transition-colors cursor-pointer"
                  title="Mute / Unmute"
                >
                  {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-spotify-green h-1 cursor-pointer bg-white/10 rounded-full"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Synchronized Karaoke Lyrics */}
        <div
          onClick={() => {
            if (!isLyricsExpanded) setIsLyricsExpanded(true)
          }}
          className={`relative w-full md:flex-1 flex flex-col min-w-0 bg-[#12121a]/85 backdrop-blur-2xl rounded-3xl border border-white/10 p-5 md:p-8 shadow-2xl transition-all duration-300 ease-in-out shrink-0 md:shrink ${
            isLyricsExpanded ? 'flex-1 min-h-0' : 'h-[320px] overflow-hidden cursor-pointer hover:border-spotify-green/40 hover:bg-[#161622]/90'
          }`}
        >
          {/* Lyrics header with action buttons */}
          <div className="flex items-center justify-between shrink-0 mb-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-spotify-green/15 border border-spotify-green/30 flex items-center justify-center text-spotify-green">
                <Music size={16} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2 tracking-tight">
                  <span>Lyrics</span>
                  {showTransliteration && (
                    <span className="text-xs font-medium text-spotify-green">(transliterated)</span>
                  )}
                </h2>
              </div>
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-3 ml-2">
                  <div className="w-0.5 h-3 bg-spotify-green rounded-full animate-[bounce_1s_infinite_100ms]" />
                  <div className="w-0.5 h-3 bg-spotify-green rounded-full animate-[bounce_1s_infinite_300ms]" />
                  <div className="w-0.5 h-3 bg-spotify-green rounded-full animate-[bounce_1s_infinite_200ms]" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Transliterate pill button */}
              {hasLyrics && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTransliterate()
                  }}
                  disabled={transliterating}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-full border transition-all cursor-pointer select-none ${
                    showTransliteration
                      ? 'bg-spotify-green/20 border-spotify-green text-spotify-green shadow-sm'
                      : 'bg-white/5 border-white/10 text-subtext hover:bg-white/10 hover:text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={showTransliteration ? 'Show original lyrics' : 'Transliterate to English phonetics'}
                >
                  {transliterating ? (
                    <Loader2 size={13} className="animate-spin text-spotify-green" />
                  ) : (
                    <Sparkles size={13} className="text-spotify-green" />
                  )}
                  {transliterating ? 'Transliterating…' : showTransliteration ? 'Original' : 'Transliterate'}
                </button>
              )}

              {/* Expand/Collapse toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsLyricsExpanded(!isLyricsExpanded)
                }}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-subtext hover:text-white transition-colors cursor-pointer border border-white/10"
                title={isLyricsExpanded ? 'Collapse Lyrics' : 'Expand Lyrics'}
              >
                {isLyricsExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Lyrics text stream with karaoke line styling */}
          <div
            className={`flex-1 scrollbar-thin text-white/90 font-semibold text-base sm:text-lg leading-relaxed pr-2 select-text space-y-3 ${
              isLyricsExpanded ? 'overflow-y-auto' : 'overflow-hidden'
            }`}
          >
            {hasLyrics ? (
              <div className="space-y-4">
                {rawLyrics.split('\n').map((line, idx) => {
                  const trimmed = line.trim()
                  const isHeader = trimmed.startsWith('[') && trimmed.endsWith(']')

                  if (isHeader) {
                    return (
                      <div key={idx} className="pt-3 pb-1">
                        <span className="text-[11px] font-black tracking-widest text-spotify-green uppercase bg-spotify-green/10 border border-spotify-green/30 px-2.5 py-1 rounded-full">
                          {trimmed}
                        </span>
                      </div>
                    )
                  }

                  if (!trimmed) return <div key={idx} className="h-2" />

                  return (
                    <p
                      key={idx}
                      className="transition-all duration-300 hover:text-spotify-green hover:translate-x-1 cursor-pointer text-white/80 hover:text-white"
                    >
                      {trimmed}
                    </p>
                  )
                })}

                {translitError && <p className="mt-4 text-xs text-red-400 font-bold">{translitError}</p>}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-subtext py-12">
                <Music size={32} className="text-subtext/40" />
                <p className="text-sm font-semibold italic">Lyrics not available for this song.</p>
                <p className="text-xs text-subtext/60">Lyrics can be fetched or updated from the Admin Console.</p>
              </div>
            )}
          </div>

          {/* Bottom compact player controls on full-screen expanded lyrics (mobile only) */}
          {isLyricsExpanded && (
            <div className="md:hidden border-t border-white/10 pt-4 mt-4 shrink-0 flex flex-col gap-3">
              {/* Progress bar */}
              <div className="w-full flex flex-col gap-1.5">
                <div
                  ref={lyricsProgressBarRef}
                  className="relative w-full py-2 cursor-pointer group"
                  onMouseDown={handleLyricsMouseDown}
                >
                  <div className="h-1 bg-white/10 rounded-full w-full overflow-hidden">
                    <div
                      className="h-full bg-spotify-green rounded-full transition-colors"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    style={{ left: `${progress}%`, marginLeft: '-6px' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-subtext font-mono tabular-nums px-0.5">
                  <span>{formatTime(progressMs)}</span>
                  <span>{formatTime(durationMs)}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShuffle(!shuffle)
                  }}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    shuffle ? 'text-spotify-green' : 'text-subtext hover:text-white'
                  }`}
                  title={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
                >
                  <Shuffle size={18} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    playPrevious()
                  }}
                  className="p-2 text-subtext hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Previous Track"
                >
                  <SkipBack size={22} fill="currentColor" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsPlaying(!isPlaying)
                  }}
                  className="w-12 h-12 bg-spotify-green text-black rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-lg shrink-0"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    playNext(true)
                  }}
                  className="p-2 text-subtext hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
                  title="Next Track"
                >
                  <SkipForward size={22} fill="currentColor" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    cycleRepeat()
                  }}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${
                    repeatMode !== 'off' ? 'text-spotify-green' : 'text-subtext hover:text-white'
                  }`}
                  title={`Repeat mode: ${repeatMode}`}
                >
                  {repeatMode === 'track' ? <Repeat1 size={18} /> : <Repeat size={18} />}
                </button>
              </div>
            </div>
          )}

          {/* Bottom gradient fade mask for collapsed preview */}
          {!isLyricsExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#12121a] via-[#12121a]/90 to-transparent pointer-events-none rounded-b-3xl" />
          )}
        </div>
      </div>
    </div>
  )
}
