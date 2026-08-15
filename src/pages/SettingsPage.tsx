import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings,
  Headphones,
  Sliders,
  Palette,
  Sun,
  Moon,
  Disc3,
  ChevronRight,
  User,
  ShieldCheck,
  Volume2,
  Wifi,
  HardDrive,
  Sparkles,
  Trash2,
  Check,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { usePlayerStore } from '@/store/playerStore'

export default function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { theme, toggleTheme, accentColor, setAccentColor } = useThemeStore()

  const is3DEnabled = usePlayerStore((s) => s.is3DEnabled)
  const isEQEnabled = usePlayerStore((s) => s.isEQEnabled)
  const eqPreset = usePlayerStore((s) => s.eqPreset)
  const set3DEnabled = usePlayerStore((s) => s.set3DEnabled)
  const set3DModalOpen = usePlayerStore((s) => s.set3DModalOpen)
  const setEQEnabled = usePlayerStore((s) => s.setEQEnabled)
  const setEQModalOpen = usePlayerStore((s) => s.setEQModalOpen)

  // Local feature toggles
  const [audioQuality, setAudioQuality] = useState<'very-high' | 'high' | 'normal'>('very-high')
  const [autoAdjustQuality, setAutoAdjustQuality] = useState(true)
  const [normalizeVolume, setNormalizeVolume] = useState(true)
  const [crossfadeSeconds, setCrossfadeSeconds] = useState(3)
  const [cacheCleared, setCacheCleared] = useState(false)

  const PRESET_ACCENTS = ['#1ed760', '#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b', '#10b981']

  const handleClearCache = () => {
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2500)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-9 animate-in fade-in duration-200 pb-24 font-sans text-primary select-none">
      {/* Settings Header */}
      <div className="border-b border-white/[0.08] pb-5">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
          <Settings size={26} className="text-spotify-green" />
          <span>Settings</span>
        </h1>
        <p className="text-xs text-subtext/70 mt-1">Manage your account, listening report, playback, and appearance</p>
      </div>

      <div className="space-y-9">
        {/* SECTION 2: YOUR SOUND CAPSULE */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-subtext/60 px-1 flex items-center gap-1.5">
            <Disc3 size={13} className="text-spotify-green animate-spin" />
            <span>Sound Capsule & Insights</span>
          </h2>

          <div
            onClick={() => navigate('/sound-capsule')}
            className="group flex items-center justify-between p-4 rounded-2xl bg-[#12121a]/60 border border-white/[0.08] hover:border-white/20 hover:bg-[#161622] transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-spotify-green shrink-0 group-hover:scale-105 transition-transform">
                <Disc3 size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white group-hover:text-spotify-green transition-colors flex items-center gap-2">
                  <span>Your Monthly Sound Capsule</span>
                  <span className="text-[9px] font-extrabold text-spotify-green bg-spotify-green/10 border border-spotify-green/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Report Ready
                  </span>
                </h3>
                <p className="text-xs text-subtext/70 truncate mt-0.5">
                  Monthly listening report, top repeated tracks, and music lover persona (*The Genre Hopper*)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-subtext group-hover:text-white transition-colors shrink-0 ml-3">
              <span>Open</span>
              <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </section>

        {/* SECTION 3: AUDIO QUALITY & STREAMING */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-subtext/60 px-1 flex items-center gap-1.5">
            <Wifi size={13} className="text-spotify-green" />
            <span>Audio Quality & Streaming</span>
          </h2>

          <div className="p-5 rounded-2xl bg-[#12121a]/60 border border-white/[0.08] space-y-4">
            {/* Streaming Quality Selector */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Streaming Quality</h4>
                <p className="text-xs text-subtext/70 mt-0.5">Select audio stream bitrate</p>
              </div>

              <select
                value={audioQuality}
                onChange={(e) => setAudioQuality(e.target.value as any)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-spotify-green cursor-pointer"
              >
                <option value="very-high" className="bg-[#12121a] text-white">Very High (320 kbps Lossless)</option>
                <option value="high" className="bg-[#12121a] text-white">High (160 kbps)</option>
                <option value="normal" className="bg-[#12121a] text-white">Normal (96 kbps)</option>
              </select>
            </div>

            {/* Auto Adjust Quality switch */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Auto Adjust Quality</h4>
                <p className="text-xs text-subtext/70 mt-0.5">Automatically adjust stream when internet is slow</p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoAdjustQuality}
                  onChange={(e) => setAutoAdjustQuality(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-spotify-green" />
              </label>
            </div>

            {/* Normalize Volume switch */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Normalize Volume</h4>
                <p className="text-xs text-subtext/70 mt-0.5">Set the same volume level for all tracks</p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={normalizeVolume}
                  onChange={(e) => setNormalizeVolume(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-spotify-green" />
              </label>
            </div>
          </div>
        </section>

        {/* SECTION 4: PLAYBACK & AUDIO ACCESSORIES */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-subtext/60 px-1 flex items-center gap-1.5">
            <Sliders size={13} className="text-spotify-green" />
            <span>Playback & Audio Tuning</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 3D Spatial Audio */}
            <div className="p-4 rounded-2xl bg-[#12121a]/60 border border-white/[0.08] flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-purple-400">
                    <Headphones size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">3D Spatial Audio</h4>
                    <p className="text-xs text-subtext/70 mt-0.5">HRTF Binaural Orbit</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={is3DEnabled}
                    onChange={(e) => set3DEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              <button
                onClick={() => set3DModalOpen(true)}
                className="w-full py-1.5 rounded-xl bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 font-bold text-xs transition-all border border-purple-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Open 3D Radar Studio</span>
              </button>
            </div>

            {/* Graphic Equalizer */}
            <div className="p-4 rounded-2xl bg-[#12121a]/60 border border-white/[0.08] flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-spotify-green">
                    <Sliders size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">10-Band Equalizer</h4>
                    <p className="text-xs text-subtext/70 mt-0.5 capitalize">{isEQEnabled ? `Preset: ${eqPreset}` : 'Disabled'}</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEQEnabled}
                    onChange={(e) => setEQEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-spotify-green" />
                </label>
              </div>

              <button
                onClick={() => setEQModalOpen(true)}
                className="w-full py-1.5 rounded-xl bg-spotify-green/15 text-spotify-green hover:bg-spotify-green/25 font-bold text-xs transition-all border border-spotify-green/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sliders size={13} />
                <span>Tune Frequencies</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 5: APPEARANCE & DISPLAY */}
        <section className="space-y-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-subtext/60 px-1 flex items-center gap-1.5">
            <Palette size={13} className="text-spotify-green" />
            <span>Appearance & Theme</span>
          </h2>

          <div className="p-5 rounded-2xl bg-[#12121a]/60 border border-white/[0.08] space-y-4">
            {/* Theme Mode Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Color Mode</h4>
                <p className="text-xs text-subtext/70 mt-0.5">Select light or dark interface theme</p>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-white/[0.05] border border-white/10 gap-1">
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-white/15 text-white shadow-sm' : 'text-subtext hover:text-white'
                  }`}
                >
                  <Moon size={13} />
                  <span>Dark</span>
                </button>
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    theme === 'light' ? 'bg-white/15 text-white shadow-sm' : 'text-subtext hover:text-white'
                  }`}
                >
                  <Sun size={13} />
                  <span>Light</span>
                </button>
              </div>
            </div>

            {/* Accent Color Palette Presets */}
            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">Accent Highlight</h4>
                <p className="text-xs text-subtext/70 mt-0.5">Custom active brand color</p>
              </div>

              <div className="flex items-center gap-2">
                {PRESET_ACCENTS.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setAccentColor(hex)}
                    className={`w-6 h-6 rounded-full border transition-all cursor-pointer transform hover:scale-110 ${
                      accentColor.toLowerCase() === hex.toLowerCase()
                        ? 'border-white ring-2 ring-white/20 scale-110'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
