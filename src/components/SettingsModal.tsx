import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Settings,
  Headphones,
  Sliders,
  Moon,
  Sun,
  Disc3,
  ChevronRight,
  User,
  Wifi,
  HardDrive,
  Sparkles,
  Trash2,
  Check,
  Palette,
  Coffee,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { usePlayerStore } from '@/store/playerStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { theme, toggleTheme, accentColor, setAccentColor } = useThemeStore()

  const is3DEnabled = usePlayerStore((s) => s.is3DEnabled)
  const isEQEnabled = usePlayerStore((s) => s.isEQEnabled)
  const eqPreset = usePlayerStore((s) => s.eqPreset)
  const isLofiEnabled = usePlayerStore((s) => s.isLofiEnabled)
  const set3DEnabled = usePlayerStore((s) => s.set3DEnabled)
  const set3DModalOpen = usePlayerStore((s) => s.set3DModalOpen)
  const setEQEnabled = usePlayerStore((s) => s.setEQEnabled)
  const setEQModalOpen = usePlayerStore((s) => s.setEQModalOpen)
  const setLofiEnabled = usePlayerStore((s) => s.setLofiEnabled)

  const [audioQuality, setAudioQuality] = useState<'very-high' | 'high' | 'normal'>('very-high')
  const [cacheCleared, setCacheCleared] = useState(false)

  const PRESET_ACCENTS = ['#1ed760', '#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b', '#10b981']

  const handleClearCache = () => {
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200 select-none font-sans">
      <div
        className="relative bg-surface-elevated border border-border-theme rounded-3xl p-6 w-full max-w-lg shadow-2xl text-left mx-4 flex flex-col max-h-[85vh] overflow-y-auto scrollbar-thin space-y-6 text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-theme pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-surface-highlight border border-border-theme flex items-center justify-center text-spotify-green">
              <Settings size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">Settings & Preferences</h2>
              <p className="text-[11px] text-subtext">Audio, insights, appearance, and cache</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-highlight text-subtext hover:text-primary transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* SECTION 2: SOUND CAPSULE */}
        <div className="space-y-2">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-subtext px-1 flex items-center gap-1">
            <Disc3 size={12} className="text-spotify-green animate-spin" />
            <span>Sound Capsule</span>
          </div>

          <div
            onClick={() => {
              onClose()
              navigate('/sound-capsule')
            }}
            className="group flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-border-theme hover:bg-surface-highlight transition-all cursor-pointer shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-surface-highlight border border-border-theme flex items-center justify-center text-spotify-green shrink-0 group-hover:scale-105 transition-transform">
                <Disc3 size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-primary group-hover:text-spotify-green transition-colors flex items-center gap-1.5">
                  <span>Your Sound Capsule</span>
                  <span className="text-[8px] font-extrabold text-spotify-green bg-spotify-green/10 border border-spotify-green/20 px-1.5 py-0.2 rounded-full uppercase">
                    Ready
                  </span>
                </h3>
                <p className="text-[10px] text-subtext truncate mt-0.5">
                  Monthly listening metrics & music persona
                </p>
              </div>
            </div>

            <ChevronRight size={15} className="text-subtext group-hover:text-primary transition-colors shrink-0 ml-2" />
          </div>
        </div>

        {/* SECTION 3: AUDIO QUALITY */}
        <div className="space-y-2">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-subtext px-1 flex items-center gap-1">
            <Wifi size={12} className="text-spotify-green" />
            <span>Audio Quality</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-theme flex items-center justify-between shadow-sm">
            <div>
              <h4 className="text-xs font-bold text-primary">Streaming Bitrate</h4>
              <p className="text-[10px] text-subtext mt-0.5">Audio playback stream quality</p>
            </div>

            <select
              value={audioQuality}
              onChange={(e) => setAudioQuality(e.target.value as any)}
              className="bg-surface-highlight border border-border-theme rounded-xl px-2.5 py-1 text-[11px] font-bold text-primary outline-none focus:border-spotify-green cursor-pointer"
            >
              <option value="very-high" className="bg-surface text-primary">320 kbps (Very High)</option>
              <option value="high" className="bg-surface text-primary">160 kbps (High)</option>
              <option value="normal" className="bg-surface text-primary">96 kbps (Normal)</option>
            </select>
          </div>
        </div>

        {/* SECTION 4: PLAYBACK ACCESSORIES */}
        <div className="space-y-2">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-subtext px-1 flex items-center gap-1">
            <Sliders size={12} className="text-spotify-green" />
            <span>Audio Tuning</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 3D Audio */}
            <div className="p-3 rounded-2xl bg-surface border border-border-theme flex flex-col justify-between space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 dark:text-purple-400 shrink-0">
                    <Headphones size={15} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-primary truncate">3D Spatial</h4>
                    <p className="text-[9px] text-subtext truncate">{is3DEnabled ? 'Active' : 'Disabled'}</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={is3DEnabled}
                    onChange={(e) => set3DEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-surface-highlight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              <button
                onClick={() => {
                  onClose()
                  set3DModalOpen(true)
                }}
                className="w-full py-1.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 hover:bg-purple-500/20 font-bold text-[10px] transition-all border border-purple-500/25 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sparkles size={11} />
                <span>3D Radar</span>
              </button>
            </div>

            {/* Equalizer */}
            <div className="p-3 rounded-2xl bg-surface border border-border-theme flex flex-col justify-between space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-spotify-green/10 border border-spotify-green/20 flex items-center justify-center text-spotify-green shrink-0">
                    <Sliders size={15} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-primary truncate">Equalizer</h4>
                    <p className="text-[9px] text-subtext truncate capitalize">{isEQEnabled ? eqPreset : 'Disabled'}</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isEQEnabled}
                    onChange={(e) => setEQEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-surface-highlight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-spotify-green" />
                </label>
              </div>

              <button
                onClick={() => {
                  onClose()
                  setEQModalOpen(true)
                }}
                className="w-full py-1.5 rounded-xl bg-spotify-green/10 text-spotify-green hover:bg-spotify-green/20 font-bold text-[10px] transition-all border border-spotify-green/25 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Sliders size={11} />
                <span>Tune EQ</span>
              </button>
            </div>

            {/* Lofi Mode */}
            <div className="p-3 rounded-2xl bg-surface border border-border-theme flex flex-col justify-between space-y-2 sm:col-span-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
                    <Coffee size={15} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-primary truncate">Lofi Mode</h4>
                    <p className="text-[9px] text-subtext truncate">{isLofiEnabled ? 'Vintage cassette active' : 'Disabled'}</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isLofiEnabled}
                    onChange={(e) => setLofiEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-surface-highlight peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500" />
                </label>
              </div>

              <p className="text-[10px] text-subtext leading-relaxed">
                Warm tape saturation, gentle wobble & slowed playback for a cozy vintage vibe
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 5: APPEARANCE */}
        <div className="space-y-2">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-subtext px-1 flex items-center gap-1">
            <Palette size={12} className="text-spotify-green" />
            <span>Appearance</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface border border-border-theme space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-primary">Color Mode</h4>
                <p className="text-[10px] text-subtext mt-0.5">Theme mode</p>
              </div>

              <div className="flex items-center p-0.5 rounded-xl bg-surface-highlight border border-border-theme gap-0.5">
                <button
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    theme === 'dark' ? 'bg-surface text-primary shadow-sm' : 'text-subtext hover:text-primary'
                  }`}
                >
                  <Moon size={11} />
                  <span>Dark</span>
                </button>
                <button
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    theme === 'light' ? 'bg-surface text-primary shadow-sm' : 'text-subtext hover:text-primary'
                  }`}
                >
                  <Sun size={11} />
                  <span>Light</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border-theme flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-primary">Accent Highlight</h4>
                <p className="text-[10px] text-subtext mt-0.5">Brand color</p>
              </div>

              <div className="flex items-center gap-1.5">
                {PRESET_ACCENTS.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setAccentColor(hex)}
                    className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                      accentColor.toLowerCase() === hex.toLowerCase()
                        ? 'border-primary ring-2 ring-primary/20 scale-110 shadow-sm'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
