import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import logo from '@/assets/logo.svg'

interface LoginWelcomeSplashProps {
  onComplete: () => void
}

export default function LoginWelcomeSplash({ onComplete }: LoginWelcomeSplashProps) {
  const user = useAuthStore((s) => s.user)
  const [progress, setProgress] = useState(0)
  const [isFadingOut, setIsFadingOut] = useState(false)

  useEffect(() => {
    // Fill progress bar over 1.6s
    const startTime = Date.now()
    const duration = 1600

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const current = Math.min(Math.round((elapsed / duration) * 100), 100)
      setProgress(current)

      if (current >= 100) {
        clearInterval(interval)
        setIsFadingOut(true)
        setTimeout(() => {
          onComplete()
        }, 550)
      }
    }, 20)

    return () => clearInterval(interval)
  }, [onComplete])

  const userName = user?.full_name || user?.username || 'Music Listener'

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#07070d] text-white overflow-hidden select-none transition-all duration-550 cubic-bezier(0.4,0,0.2,1) ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes blobDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 40px) scale(1.1); }
        }
        @keyframes ringSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes eqBounce {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        @keyframes markGlow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(139,107,240,0.4), 0 0 20px rgba(139,107,240,0.2); }
          50% { box-shadow: 0 0 0 1px rgba(139,107,240,0.8), 0 0 45px rgba(139,107,240,0.6); }
        }
        .anim-blob-1 {
          position: absolute; width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(109,79,214,0.4), transparent 70%);
          top: -150px; right: -100px; filter: blur(90px);
          animation: blobDrift 18s ease-in-out infinite;
        }
        .anim-blob-2 {
          position: absolute; width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(30,215,96,0.3), transparent 70%);
          bottom: -150px; left: -100px; filter: blur(90px);
          animation: blobDrift 22s ease-in-out infinite reverse;
        }
      `}</style>

      {/* Ambient background glowing blobs */}
      <div className="anim-blob-1 pointer-events-none" />
      <div className="anim-blob-2 pointer-events-none" />

      {/* Background Orbital Rings */}
      <div className="absolute w-[500px] h-[500px] rounded-full border border-white/5 animate-[ringSpin_50s_linear_infinite] pointer-events-none" />
      <div className="absolute w-[360px] h-[360px] rounded-full border border-purple-500/10 animate-[ringSpin_35s_linear_infinite_reverse] pointer-events-none" />

      {/* Central Animated Brand & Equalizer Soundstage */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-md px-6 space-y-6">
        {/* Glowing Logo Icon */}
        <div className="relative group">
          <div className="w-20 h-20 rounded-2xl bg-[#0f0f1a] border border-white/10 flex items-center justify-center p-3 shadow-2xl animate-[markGlow_3.5s_ease-in-out_infinite]">
            <img src={logo} alt="Fermata Logo" className="w-full h-full object-contain animate-[pulse_2s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* Live Equalizer Visual */}
        <div className="flex items-end justify-center gap-1.5 h-12 my-1">
          {[40, 75, 30, 90, 60, 100, 45, 80, 35, 95, 50, 70, 40, 85].map((h, i) => (
            <span
              key={i}
              className="w-1.5 rounded-full bg-gradient-to-t from-purple-600 to-spotify-green origin-bottom"
              style={{
                height: `${h}%`,
                animation: `eqBounce 1.2s ease-in-out infinite`,
                animationDelay: `-${(i * 0.15).toFixed(2)}s`,
              }}
            />
          ))}
        </div>

        {/* Welcome Messages */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
            Soundstage Initialized
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-subtext/80">
            Tuning 3D spatial audio & loading your personal recommendations...
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="w-full space-y-2 pt-2">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-spotify-green rounded-full transition-all duration-75 shadow-[0_0_12px_rgba(30,215,96,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-subtext">
            <span>READY</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
