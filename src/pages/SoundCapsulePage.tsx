import { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Calendar,
  Clock,
  User,
  Music,
  Repeat,
  Flame,
  Share2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Download,
  Check,
  Zap,
  Award,
  Layers,
  HelpCircle,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  getSoundCapsule,
  getAvailableCapsuleMonths,
  type SoundCapsuleData,
} from '@/api/capsule'

export default function SoundCapsulePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const availableMonths = getAvailableCapsuleMonths()

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0].year_month)
  const [capsule, setCapsule] = useState<SoundCapsuleData | null>(null)
  const [loading, setLoading] = useState(true)

  // Card detail modal state
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null)

  // Share modal state
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    const fetchCapsule = async () => {
      setLoading(true)
      try {
        const data = await getSoundCapsule(selectedMonth)
        setCapsule(data)
      } catch {
        setCapsule(null)
      } finally {
        setLoading(false)
      }
    }
    fetchCapsule()
  }, [selectedMonth])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="w-10 h-10 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-subtext animate-pulse">
          Synthesizing your Sound Capsule...
        </p>
      </div>
    )
  }

  if (!capsule) {
    return (
      <div className="py-20 text-center space-y-4">
        <Sparkles size={48} className="mx-auto text-subtext/40" />
        <h2 className="text-xl font-bold text-primary">No Capsule Found</h2>
        <p className="text-sm text-subtext">Keep listening to unlock monthly Sound Capsule insights!</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-theme pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-500 to-pink-500 text-white uppercase tracking-wider shadow-sm">
              Premium Exclusive
            </span>
            <span className="text-xs text-subtext font-semibold">• Monthly Insights</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary flex items-center gap-3">
            <Sparkles size={32} className="text-purple-400 animate-pulse" />
            Your Sound Capsule
          </h1>
          <p className="text-sm text-subtext mt-1">
            Personalized listening breakdown, top repeated tracks, and music identity
          </p>
        </div>

        {/* Action controls: Month Picker & Share Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Month Selector */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-surface border border-border-theme text-xs font-bold text-primary outline-none focus:border-purple-500 cursor-pointer shadow-sm appearance-none pr-8"
            >
              {availableMonths.map((m) => (
                <option key={m.year_month} value={m.year_month}>
                  {m.label}
                </option>
              ))}
            </select>
            <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-subtext pointer-events-none" />
          </div>

          {/* Share Button */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold hover:brightness-110 transition-all shadow-md cursor-pointer shrink-0"
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Main Insights Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* CARD 1: Music Persona Badge */}
        <div
          onClick={() => setSelectedDetail('persona')}
          className="lg:col-span-2 relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-purple-900/60 via-indigo-900/40 to-surface border border-purple-500/30 hover:border-purple-500/60 transition-all cursor-pointer group shadow-xl flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-500/20 transition-all" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Award size={16} />
                Music Persona
              </span>
              <span className="text-[11px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full font-semibold border border-purple-500/30">
                {capsule.month_name}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white group-hover:text-purple-300 transition-colors">
              "{capsule.persona_tag}"
            </h2>
            <p className="text-xs sm:text-sm text-subtext mt-2 max-w-xl leading-relaxed">
              {capsule.persona_description}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-purple-500/20 flex items-center justify-between text-xs">
            <span className="text-purple-300 font-semibold flex items-center gap-1">
              <Sparkles size={14} />
              Tap to view full persona breakdown
            </span>
            <ChevronRight size={16} className="text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 2: Total Listening Time & National Comparison */}
        <div
          onClick={() => setSelectedDetail('time')}
          className="rounded-2xl p-6 bg-surface border border-border-theme hover:border-spotify-green/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-subtext flex items-center gap-1.5">
                <Clock size={16} className="text-spotify-green" />
                Listening Time
              </span>
              <span className="text-[10px] text-spotify-green bg-spotify-green/10 border border-spotify-green/20 px-2 py-0.5 rounded-full font-bold">
                TOP LISTENER
              </span>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight">
              {capsule.total_listening_minutes.toLocaleString()}{' '}
              <span className="text-sm font-semibold text-subtext">mins</span>
            </div>

            <p className="text-xs text-subtext mt-2 flex items-center gap-1">
              <TrendingUp size={14} className="text-spotify-green" />
              <strong className="text-spotify-green">
                +{Math.round(((capsule.total_listening_minutes - capsule.national_avg_minutes) / capsule.national_avg_minutes) * 100)}%
              </strong>{' '}
              above national average ({capsule.national_avg_minutes.toLocaleString()} mins)
            </p>
          </div>

          <div className="mt-6 pt-3 border-t border-border-theme flex items-center justify-between text-xs text-subtext group-hover:text-primary transition-colors">
            <span>Monthly time stats</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 3: Top Artist & Percentile */}
        <div
          onClick={() => setSelectedDetail('artists')}
          className="rounded-2xl p-6 bg-surface border border-border-theme hover:border-amber-500/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-subtext flex items-center gap-1.5">
                <User size={16} className="text-amber-400" />
                Top Artist
              </span>
              {capsule.top_artists[0] && (
                <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 font-extrabold px-2 py-0.5 rounded-full">
                  TOP {capsule.top_artists[0].percentile}%
                </span>
              )}
            </div>

            {capsule.top_artists[0] && (
              <div>
                <h3 className="text-2xl font-extrabold text-primary group-hover:text-amber-400 transition-colors">
                  {capsule.top_artists[0].name}
                </h3>
                <p className="text-xs text-subtext mt-1">
                  Played {capsule.top_artists[0].play_count} times this month
                </p>
              </div>
            )}

            {/* Sub-list of top 3 */}
            <div className="mt-4 space-y-2 text-xs">
              {capsule.top_artists.slice(1, 4).map((art, idx) => (
                <div key={art.id} className="flex items-center justify-between text-subtext">
                  <span className="truncate font-medium">
                    #{idx + 2} {art.name}
                  </span>
                  <span className="font-mono text-[11px]">{art.play_count} plays</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-border-theme flex items-center justify-between text-xs text-subtext group-hover:text-primary transition-colors">
            <span>View top 5 rankings</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 4: Top Tracks & Repeated Listens */}
        <div
          onClick={() => setSelectedDetail('tracks')}
          className="rounded-2xl p-6 bg-surface border border-border-theme hover:border-pink-500/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-subtext flex items-center gap-1.5">
                <Music size={16} className="text-pink-400" />
                Top Track
              </span>
              <span className="text-[10px] bg-pink-500/15 text-pink-400 border border-pink-500/30 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Repeat size={10} /> REPEATED
              </span>
            </div>

            {capsule.top_tracks[0] && (
              <div>
                <h3 className="text-xl font-extrabold text-primary group-hover:text-pink-400 transition-colors line-clamp-1">
                  {capsule.top_tracks[0].title}
                </h3>
                <p className="text-xs text-subtext mt-0.5">
                  {capsule.top_tracks[0].artist_name} · {capsule.top_tracks[0].play_count} plays
                </p>
              </div>
            )}

            <div className="mt-4 space-y-2 text-xs">
              {capsule.top_tracks.slice(1, 4).map((tr, idx) => (
                <div key={tr.id} className="flex items-center justify-between text-subtext">
                  <span className="truncate font-medium">
                    #{idx + 2} {tr.title}
                  </span>
                  <span className="font-mono text-[11px]">{tr.play_count} plays</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-border-theme flex items-center justify-between text-xs text-subtext group-hover:text-primary transition-colors">
            <span>View all top tracks</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 5: Listening Breakdown */}
        <div
          onClick={() => setSelectedDetail('breakdown')}
          className="rounded-2xl p-6 bg-surface border border-border-theme hover:border-blue-500/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-subtext flex items-center gap-1.5">
                <Layers size={16} className="text-blue-400" />
                Listening Breakdown
              </span>
            </div>

            <div className="space-y-3 mt-2">
              {capsule.breakdown.map((b) => (
                <div key={b.label} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-primary">
                    <span>{b.label}</span>
                    <span className="font-mono text-subtext">{b.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-highlight rounded-full overflow-hidden">
                    <div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.percentage}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-border-theme flex items-center justify-between text-xs text-subtext group-hover:text-primary transition-colors">
            <span>Detailed genre stats</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 6: Streak & Unlikely Pairings */}
        <div
          onClick={() => setSelectedDetail('streak')}
          className="rounded-2xl p-6 bg-surface border border-border-theme hover:border-orange-500/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-subtext flex items-center gap-1.5">
                <Flame size={16} className="text-orange-400" />
                Listening Streak
              </span>
              <span className="text-[10px] bg-orange-500/15 text-orange-400 border border-orange-500/30 font-bold px-2 py-0.5 rounded-full">
                {capsule.listening_streak_days} DAYS STREAK
              </span>
            </div>

            <h3 className="text-xl font-bold text-primary group-hover:text-orange-400 transition-colors">
              {capsule.streak_artist_name}
            </h3>
            <p className="text-xs text-subtext mt-1">
              You listened to {capsule.streak_artist_name} for {capsule.listening_streak_days} consecutive days!
            </p>

            {/* Unlikely Pairings snippet */}
            <div className="mt-4 p-3 rounded-xl bg-surface-highlight/50 border border-border-theme/40 text-xs space-y-1">
              <span className="font-extrabold text-spotify-green uppercase text-[10px] tracking-wider block">
                Unlikely Pairing
              </span>
              <p className="text-subtext leading-snug">
                {capsule.unlikely_pairings.description}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-border-theme flex items-center justify-between text-xs text-subtext group-hover:text-primary transition-colors">
            <span>Streak details</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 7: Throwback Taste */}
        <div
          onClick={() => setSelectedDetail('throwback')}
          className="rounded-2xl p-6 bg-surface border border-border-theme hover:border-teal-500/40 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-subtext flex items-center gap-1.5">
                <Zap size={16} className="text-teal-400" />
                Taste Throwback
              </span>
              <span className="text-[10px] bg-teal-500/15 text-teal-400 border border-teal-500/30 font-bold px-2 py-0.5 rounded-full">
                {capsule.throwback.period}
              </span>
            </div>

            <h3 className="text-xl font-bold text-primary group-hover:text-teal-400 transition-colors">
              {capsule.throwback.track_title}
            </h3>
            <p className="text-xs text-subtext mt-1">
              By {capsule.throwback.artist_name} · Heavily played {capsule.throwback.period}
            </p>
          </div>

          <div className="mt-6 pt-3 border-t border-border-theme flex items-center justify-between text-xs text-subtext group-hover:text-primary transition-colors">
            <span>View taste evolution</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* CARD DETAIL POPOVER MODAL */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-surface-elevated border border-surface-highlight rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 text-left relative max-h-[85vh] overflow-y-auto scrollbar-thin">
            <div className="flex items-center justify-between border-b border-surface-highlight pb-3">
              <h3 className="text-lg font-bold text-primary capitalize flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                {selectedDetail} Insights
              </h3>
              <button
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 rounded-full hover:bg-surface-highlight text-subtext hover:text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm text-subtext">
              {selectedDetail === 'persona' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                    <h4 className="text-xl font-bold text-white mb-1">"{capsule.persona_tag}"</h4>
                    <p className="text-xs leading-relaxed">{capsule.persona_description}</p>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Based on your playback data in {capsule.month_name}, your listening style exhibits high genre diversity, balanced tempo transitions, and late-night listening peaks.
                  </p>
                </div>
              )}

              {selectedDetail === 'time' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-spotify-green/10 border border-spotify-green/20 text-spotify-green">
                    <h4 className="text-2xl font-bold text-white mb-1">{capsule.total_listening_minutes.toLocaleString()} Minutes</h4>
                    <p className="text-xs">That's equivalent to approximately {Math.round(capsule.total_listening_minutes / 60)} hours of non-stop music!</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border-theme text-xs space-y-1">
                    <p className="text-primary font-bold">National Benchmark Comparison:</p>
                    <p>Average listener in your region logged {capsule.national_avg_minutes.toLocaleString()} minutes.</p>
                  </div>
                </div>
              )}

              {selectedDetail === 'artists' && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-primary mb-2">Top 5 Most Listened Artists in {capsule.month_name}:</p>
                  {capsule.top_artists.map((art, i) => (
                    <div key={art.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-theme">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-subtext text-xs">#{i + 1}</span>
                        <span className="font-bold text-primary text-xs">{art.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-amber-400 block">{art.play_count} plays</span>
                        <span className="text-[10px] text-subtext">Top {art.percentile}% listener</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedDetail === 'tracks' && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-primary mb-2">Top 5 Most Played Songs in {capsule.month_name}:</p>
                  {capsule.top_tracks.map((tr, i) => (
                    <div key={tr.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border-theme">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono font-bold text-subtext text-xs shrink-0">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-primary text-xs truncate">{tr.title}</p>
                          <p className="text-[11px] text-subtext truncate">{tr.artist_name}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-pink-400 shrink-0">{tr.play_count} plays</span>
                    </div>
                  ))}
                </div>
              )}

              {selectedDetail === 'breakdown' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-primary">Genre & Mood Allocation:</p>
                  {capsule.breakdown.map((b) => (
                    <div key={b.label} className="p-3 rounded-xl bg-surface border border-border-theme space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-primary">
                        <span>{b.label}</span>
                        <span>{b.percentage}%</span>
                      </div>
                      <div className="h-2 w-full bg-surface-highlight rounded-full overflow-hidden">
                        <div className={`h-full ${b.color} rounded-full`} style={{ width: `${b.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedDetail === 'streak' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300">
                    <h4 className="text-xl font-bold text-white mb-1">{capsule.listening_streak_days} Days Streak!</h4>
                    <p className="text-xs">You listened to {capsule.streak_artist_name} every single day for over two weeks!</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface border border-border-theme text-xs space-y-1">
                    <span className="text-spotify-green font-bold block">Unlikely Pairing Spotlight:</span>
                    <p className="text-subtext">{capsule.unlikely_pairings.description}</p>
                  </div>
                </div>
              )}

              {selectedDetail === 'throwback' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300">
                    <h4 className="text-xl font-bold text-white mb-1">{capsule.throwback.track_title}</h4>
                    <p className="text-xs">By {capsule.throwback.artist_name} ({capsule.throwback.period})</p>
                  </div>
                  <p className="text-xs text-subtext leading-relaxed">
                    This throwback track highlights how your taste evolved from synthpop retro into modern binaural spatial audio over the past few months.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-surface-elevated border border-surface-highlight rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-5 relative">
            <button
              onClick={() => setIsShareOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-highlight text-subtext hover:text-primary transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Shareable Card Canvas Preview */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-950 to-black border border-purple-500/40 text-left space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-purple-300 tracking-wider">
                  Fermata Sound Capsule
                </span>
                <span className="text-[10px] font-bold text-subtext">{capsule.month_name}</span>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-subtext font-bold">My Music Persona</p>
                <h4 className="text-xl font-black text-white">"{capsule.persona_tag}"</h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-purple-500/20">
                <div>
                  <p className="text-[10px] text-subtext">Total Minutes</p>
                  <p className="font-bold text-primary">{capsule.total_listening_minutes.toLocaleString()} mins</p>
                </div>
                <div>
                  <p className="text-[10px] text-subtext">Top Artist</p>
                  <p className="font-bold text-spotify-green truncate">{capsule.top_artists[0]?.name}</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-spotify-green text-black font-bold text-xs hover:bg-spotify-green-hover transition-all cursor-pointer shadow-md"
              >
                {copiedLink ? <Check size={16} /> : <Share2 size={16} />}
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Share Link'}</span>
              </button>

              <button
                onClick={() => {
                  alert('Sound Capsule summary image download initialized!')
                  setIsShareOpen(false)
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-surface-highlight hover:bg-white/10 text-primary font-bold text-xs transition-all cursor-pointer"
              >
                <Download size={16} />
                <span>Save Summary Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
