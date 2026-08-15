import { useRef, useEffect, useCallback } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface Props {
  audioRef: React.RefObject<HTMLAudioElement | null>
}

export default function PlayerControls({ audioRef }: Props) {
  const {
    isPlaying,
    progressMs,
    durationMs,
    shuffle,
    repeatMode,
    setIsPlaying,
    setProgressMs,
    setShuffle,
    setRepeatMode,
    playNext,
    playPrevious,
  } = usePlayerStore()

  const progressBarRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      if (audio.ended || (durationMs > 0 && progressMs >= durationMs - 500)) {
        audio.currentTime = 0
        setProgressMs(0)
      }
      audio.play().catch((err) => {
        console.warn('Playback fail or auto-play blocked:', err)
      })
      setIsPlaying(true)
    }
  }, [audioRef, isPlaying, durationMs, progressMs, setIsPlaying, setProgressMs])

  const handleSeek = useCallback(
    (clientX: number) => {
      const bar = progressBarRef.current
      const audio = audioRef.current
      if (!bar || !audio || !durationMs) return
      const rect = bar.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newMs = ratio * durationMs
      try {
        audio.currentTime = newMs / 1000
      } catch (err) {
        console.warn('Seeking not supported by media source in current state:', err)
      }
      setProgressMs(newMs)
    },
    [audioRef, durationMs, setProgressMs],
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    handleSeek(e.clientX)
  }, [handleSeek])

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (!isDragging.current) return
      handleSeek(e.clientX)
    }

    const handleMouseUpGlobal = () => {
      isDragging.current = false
    }

    window.addEventListener('mousemove', handleMouseMoveGlobal)
    window.addEventListener('mouseup', handleMouseUpGlobal)

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal)
      window.removeEventListener('mouseup', handleMouseUpGlobal)
    }
  }, [handleSeek])

  const cycleRepeat = () => {
    const modes: Array<'off' | 'context' | 'track'> = ['off', 'context', 'track']
    const idx = modes.indexOf(repeatMode)
    setRepeatMode(modes[(idx + 1) % modes.length])
  }

  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-[560px]">
      {/* Buttons Bar */}
      <div className="flex items-center gap-5 md:gap-6">
        {/* Shuffle */}
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => setShuffle(!shuffle)}
            className={`relative p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
              shuffle
                ? 'text-spotify-green bg-spotify-green/10 shadow-[0_0_12px_rgba(124,58,237,0.25)]'
                : 'text-subtext hover:text-primary hover:bg-white/5'
            }`}
            title={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
          >
            <Shuffle size={16} />
            {shuffle && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-spotify-green rounded-full shadow-[0_0_6px_var(--spotify-green)]" />
            )}
          </button>
        </div>

        {/* Previous */}
        <button
          onClick={playPrevious}
          className="p-2 rounded-full text-subtext hover:text-primary hover:bg-white/5 hover:scale-110 active:scale-90 transition-all duration-200 cursor-pointer"
          title="Previous"
        >
          <SkipBack size={18} />
        </button>

        {/* Play / Pause with glowing pulse ring */}
        <button
          onClick={togglePlay}
          className="relative group w-10 h-10 rounded-full bg-primary text-inverted flex items-center justify-center shadow-lg shadow-black/40 hover:scale-110 hover:shadow-spotify-green/30 active:scale-95 transition-all duration-300 cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying && (
            <span className="absolute inset-0 rounded-full bg-spotify-green/30 animate-ping pointer-events-none opacity-60" />
          )}
          {isPlaying ? (
            <Pause size={17} className="fill-current" />
          ) : (
            <Play size={17} className="ml-0.5 fill-current" />
          )}
        </button>

        {/* Next */}
        <button
          onClick={() => playNext(true)}
          className="p-2 rounded-full text-subtext hover:text-primary hover:bg-white/5 hover:scale-110 active:scale-90 transition-all duration-200 cursor-pointer"
          title="Next"
        >
          <SkipForward size={18} />
        </button>

        {/* Repeat */}
        <div className="relative flex flex-col items-center">
          <button
            onClick={cycleRepeat}
            className={`relative p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer ${
              repeatMode !== 'off'
                ? 'text-spotify-green bg-spotify-green/10 shadow-[0_0_12px_rgba(124,58,237,0.25)]'
                : 'text-subtext hover:text-primary hover:bg-white/5'
            }`}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'track' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            {repeatMode !== 'off' && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-spotify-green rounded-full shadow-[0_0_6px_var(--spotify-green)]" />
            )}
          </button>
        </div>
      </div>

      {/* Progress Scrubber */}
      <div className="flex items-center gap-3 w-full">
        <span className="font-mono text-[11px] font-medium text-subtext/70 w-10 text-right tabular-nums select-none">
          {formatTime(progressMs)}
        </span>
        <div
          ref={progressBarRef}
          className="relative flex-1 py-2 cursor-pointer group"
          onMouseDown={handleMouseDown}
        >
          {/* Track background */}
          <div className="h-[3.5px] group-hover:h-[6px] bg-white/10 rounded-full w-full overflow-hidden transition-all duration-200 relative">
            <div
              className="h-full bg-gradient-to-r from-spotify-green via-purple-400 to-emerald-400 rounded-full transition-all duration-75 group-hover:brightness-110 relative"
              style={{ width: `${progress}%` }}
            >
              {/* Subtle glowing animated shimmer effect along progress line when playing */}
              {isPlaying && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-player-glow" />
              )}
            </div>
          </div>

          {/* Scrubber thumb handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full opacity-0 group-hover:opacity-100 group-hover:scale-110 shadow-[0_0_10px_rgba(255,255,255,0.9)] transition-all duration-150 pointer-events-none"
            style={{ left: `${progress}%`, marginLeft: '-7px' }}
          />
        </div>
        <span className="font-mono text-[11px] font-medium text-subtext/70 w-10 tabular-nums select-none">
          {formatTime(durationMs)}
        </span>
      </div>
    </div>
  )

}
