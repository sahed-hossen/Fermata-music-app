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
  ChevronDown,
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

  // Animated mount/unmount lifecycle state
  const [shouldRender, setShouldRender] = useState(isExpanded)
  const [isClosing, setIsClosing] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const touchStartY = useRef(0)
  const isDraggingHeader = useRef(false)

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

  // Smooth open & close transition management
  useEffect(() => {
    if (isExpanded) {
      setShouldRender(true)
      setIsClosing(false)
      setDragOffset(0)
    } else if (shouldRender) {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setShouldRender(false)
        setIsClosing(false)
        setDragOffset(0)
      }, 320)
      return () => clearTimeout(timer)
    }
  }, [isExpanded, shouldRender])

  const handleClose = useCallback(() => {
    setIsClosing(true)
    setTimeout(() => {
      usePlayerStore.setState({ isExpanded: false })
    }, 300)
  }, [])

  // Swipe-to-dismiss gesture handling on mobile header / drag pill
  const handleTouchStartHeader = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    isDraggingHeader.current = true
  }

  const handleTouchMoveHeader = (e: React.TouchEvent) => {
    if (!isDraggingHeader.current) return
    const deltaY = e.touches[0].clientY - touchStartY.current
    if (deltaY > 0) {
      setDragOffset(deltaY)
    }
  }

  const handleTouchEndHeader = () => {
    if (!isDraggingHeader.current) return
    isDraggingHeader.current = false
    if (dragOffset > 85) {
      handleClose()
    } else {
      setDragOffset(0)
    }
  }

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isMobileScreen = window.innerWidth < 1024
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

  if (!shouldRender || !currentTrack) return null

  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0
  const hasLyrics = !!(currentTrack.lyrics && currentTrack.lyrics.trim())
  const rawLyrics = showTransliteration && transliteration ? transliteration : currentTrack.lyrics || ''

  return (
    <div
      className={`fixed inset-0 z-50 bg-base/95 backdrop-blur-3xl text-primary flex flex-col overflow-hidden font-sans select-none transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isClosing
          ? 'translate-y-full opacity-0 scale-[0.96] pointer-events-none'
          : 'translate-y-0 opacity-100 scale-100'
        }`}
      style={{
        transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
        transition: isDraggingHeader.current ? 'none' : undefined,
      }}
    >
      {/* Dynamic Ambient Background Blur Aurora */}
      <div className="absolute top-1/6 left-1/6 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-purple-600/20 dark:bg-purple-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/6 right-1/6 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-spotify-green/20 dark:bg-spotify-green/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />

      {/* Top Mobile Swipe-down Grab Bar (Interactive Handle) */}
      <div
        className="w-full flex flex-col items-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing shrink-0 z-20 md:hidden touch-none"
        onTouchStart={handleTouchStartHeader}
        onTouchMove={handleTouchMoveHeader}
        onTouchEnd={handleTouchEndHeader}
        onClick={handleClose}
      >
        <div className="w-12 h-1.5 rounded-full bg-subtext/30 hover:bg-subtext/60 active:bg-spotify-green transition-all" />
      </div>

      {/* Header Bar */}
      <header
        className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-3.5 border-b border-border-theme shrink-0 bg-surface/75 backdrop-blur-xl"
        onTouchStart={handleTouchStartHeader}
        onTouchMove={handleTouchMoveHeader}
        onTouchEnd={handleTouchEndHeader}
      >
        <button
          onClick={() => {
            if (isLyricsExpanded) {
              setIsLyricsExpanded(false)
            } else {
              handleClose()
            }
          }}
          className="p-2.5 bg-surface-highlight/70 hover:bg-surface-highlight rounded-full text-subtext hover:text-primary transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-border-theme shadow-sm"
          title="Minimize player"
        >
          {isLyricsExpanded ? <ChevronDown size={19} /> : <X size={19} />}
        </button>

        <div className="text-center flex-1 min-w-0 px-4">
          {isLyricsExpanded ? (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-spotify-green">Live Karaoke Lyrics</p>
              <p className="text-sm font-bold text-primary truncate max-w-[280px] mx-auto mt-0.5">
                {currentTrack.title}
              </p>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-highlight/70 border border-border-theme text-[11px] font-extrabold tracking-wider uppercase text-subtext shadow-sm">
              <Disc3 size={14} className={`text-spotify-green ${isPlaying ? 'animate-spin' : ''}`} />
              <span>Now Playing</span>
            </div>
          )}
        </div>

        <div className="w-10 h-10 flex items-center justify-end">
          {/* Subtle live eq pulse icon */}
          {isPlaying && (
            <div className="flex items-end gap-1 h-3.5 px-2 py-1 rounded-full bg-spotify-green/10 border border-spotify-green/20">
              <span className="w-1 bg-spotify-green rounded-full animate-eq-1" />
              <span className="w-1 bg-spotify-green rounded-full animate-eq-2" />
              <span className="w-1 bg-spotify-green rounded-full animate-eq-3" />
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 overflow-y-auto max-w-6xl mx-auto w-full p-5 sm:p-8 flex flex-col lg:flex-row gap-6 sm:gap-8 items-center lg:items-stretch min-h-0">
        {/* Left Panel: Album Art & Controls */}
        <div
          className={`flex-1 flex flex-col justify-center items-center max-w-md w-full gap-6 shrink-0 transition-all duration-300 ${isLyricsExpanded ? 'hidden lg:flex' : 'flex'
            }`}
        >
          {/* 3D Floating Glassmorphic Album Cover Card */}
          <div className="relative group w-64 h-64 sm:w-76 sm:h-76 lg:w-80 lg:h-80 rounded-[2rem] overflow-hidden shadow-2xl border border-border-theme bg-surface-elevated flex items-center justify-center shrink-0 transition-transform duration-500 hover:scale-[1.02]">
            {currentTrack.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-100' : 'scale-95 opacity-90'
                  }`}
              />
            ) : (
              <Music size={96} className="text-subtext/40" />
            )}
            {/* Ambient Radial Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

            {/* Glowing Equalizer Pulse Ring when Playing */}
            {isPlaying && (
              <div className="absolute inset-0 rounded-[2rem] border-2 border-spotify-green/30 animate-pulse pointer-events-none" />
            )}
          </div>

          {/* Track Info */}
          <div className="text-center w-full min-w-0 px-2 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-primary truncate tracking-tight">{currentTrack.title}</h1>
            <p className="text-spotify-green text-sm sm:text-base font-bold truncate">{currentTrack.artist_name || 'Unknown Artist'}</p>
          </div>

          {/* Minimal Liquid Controls Card */}
          <div className="w-full max-w-sm flex flex-col gap-4 bg-surface-elevated/90 dark:bg-surface-elevated/75 backdrop-blur-2xl border border-border-theme p-4.5 rounded-[2rem] shadow-xl">
            {/* Buttons Row */}
            <div className="flex items-center justify-between px-2">
              {/* Shuffle */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setShuffle(!shuffle)}
                  className={`p-2 rounded-full transition-all cursor-pointer ${shuffle ? 'text-spotify-green scale-110' : 'text-subtext hover:text-primary'
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
                className="p-2.5 text-subtext hover:text-primary hover:bg-surface-highlight rounded-full transition-all cursor-pointer active:scale-90"
                title="Previous Track"
              >
                <SkipBack size={22} fill="currentColor" />
              </button>

              {/* Play/Pause Button with Liquid Pulse Aura */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-14 h-14 bg-spotify-green hover:bg-spotify-green-hover text-accent-text rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shrink-0 ${isPlaying ? 'shadow-[0_0_28px_rgba(124,58,237,0.45)] ring-4 ring-spotify-green/20' : ''
                  }`}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>

              {/* Next */}
              <button
                onClick={() => playNext(true)}
                className="p-2.5 text-subtext hover:text-primary hover:bg-surface-highlight rounded-full transition-all cursor-pointer active:scale-90"
                title="Next Track"
              >
                <SkipForward size={22} fill="currentColor" />
              </button>

              {/* Repeat */}
              <div className="flex flex-col items-center">
                <button
                  onClick={cycleRepeat}
                  className={`p-2 rounded-full transition-all cursor-pointer ${repeatMode !== 'off' ? 'text-spotify-green scale-110' : 'text-subtext hover:text-primary'
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
                <div className="h-1.5 bg-surface-highlight rounded-full w-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-spotify-green rounded-full transition-colors"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {/* Thumb */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-full bg-primary shadow-md
                    w-4 h-4 lg:w-3.5 lg:h-3.5
                    opacity-100 lg:opacity-0 lg:group-hover:opacity-100
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
              <div className="hidden lg:flex items-center gap-3 w-full px-1 mt-1 justify-start">
                <button
                  onClick={() => setVolume(volume === 0 ? 50 : 0)}
                  className="text-subtext hover:text-primary transition-colors cursor-pointer"
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
                  className="w-full accent-spotify-green h-1 cursor-pointer bg-surface-highlight rounded-full"
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
          className={`relative w-full lg:flex-1 flex flex-col min-w-0 bg-surface-elevated/90 dark:bg-surface-elevated/75 backdrop-blur-2xl rounded-[2rem] border border-border-theme p-5 sm:p-7 shadow-2xl transition-all duration-300 ease-in-out shrink-0 lg:shrink ${isLyricsExpanded ? 'flex-1 min-h-0' : 'h-[300px] sm:h-[340px] overflow-hidden cursor-pointer hover:border-spotify-green/40 hover:bg-surface-elevated'
            }`}
        >
          {/* Lyrics header with action buttons */}
          <div className="flex items-center justify-between shrink-0 mb-4 border-b border-border-theme pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-spotify-green/15 border border-spotify-green/30 flex items-center justify-center text-spotify-green">
                <Music size={16} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-primary flex items-center gap-2 tracking-tight">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-full border transition-all cursor-pointer select-none ${showTransliteration
                      ? 'bg-spotify-green/20 border-spotify-green text-spotify-green shadow-sm'
                      : 'bg-surface-highlight border-border-theme text-subtext hover:text-primary'
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
                className="p-2 rounded-full bg-surface-highlight/70 hover:bg-surface-highlight text-subtext hover:text-primary transition-colors cursor-pointer border border-border-theme"
                title={isLyricsExpanded ? 'Collapse Lyrics' : 'Expand Lyrics'}
              >
                {isLyricsExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>

          {/* Lyrics text stream with karaoke line styling */}
          <div
            className={`flex-1 scrollbar-thin text-primary/90 font-semibold text-base sm:text-lg leading-relaxed pr-2 select-text space-y-3.5 ${isLyricsExpanded ? 'overflow-y-auto' : 'overflow-hidden'
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
                      className="transition-all duration-300 hover:text-spotify-green hover:translate-x-1 cursor-pointer text-primary/80 hover:text-primary"
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
            <div className="lg:hidden border-t border-border-theme pt-4 mt-4 shrink-0 flex flex-col gap-3">
              {/* Progress bar */}
              <div className="w-full flex flex-col gap-1.5">
                <div
                  ref={lyricsProgressBarRef}
                  className="relative w-full py-2 cursor-pointer group"
                  onMouseDown={handleLyricsMouseDown}
                >
                  <div className="h-1 bg-surface-highlight rounded-full w-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-spotify-green rounded-full transition-colors"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
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
                  className={`p-2 rounded-full transition-colors cursor-pointer ${shuffle ? 'text-spotify-green' : 'text-subtext hover:text-primary'
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
                  className="p-2 text-subtext hover:text-primary hover:bg-surface-highlight rounded-full transition-colors cursor-pointer active:scale-90"
                  title="Previous Track"
                >
                  <SkipBack size={22} fill="currentColor" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsPlaying(!isPlaying)
                  }}
                  className="w-12 h-12 bg-spotify-green text-accent-text rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg shrink-0 shadow-[0_0_20px_rgba(124,58,237,0.35)]"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    playNext(true)
                  }}
                  className="p-2 text-subtext hover:text-primary hover:bg-surface-highlight rounded-full transition-colors cursor-pointer active:scale-90"
                  title="Next Track"
                >
                  <SkipForward size={22} fill="currentColor" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    cycleRepeat()
                  }}
                  className={`p-2 rounded-full transition-colors cursor-pointer ${repeatMode !== 'off' ? 'text-spotify-green' : 'text-subtext hover:text-primary'
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
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-surface via-surface/90 to-transparent pointer-events-none rounded-b-[2rem]" />
          )}
        </div>
      </div>
    </div>
  )
}
