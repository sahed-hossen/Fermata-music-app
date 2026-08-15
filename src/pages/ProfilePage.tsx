import { useEffect, useState } from 'react'
import { User, Crown, Music, Sparkles, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import { getMe } from '@/api/auth'
import { getTopItems } from '@/api/users'
import type { TopItem } from '@/types'

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [topArtists, setTopArtists] = useState<TopItem[]>([])
  const [topTracks, setTopTracks] = useState<TopItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const me = await getMe()
        setUser(me)

        const [artists, tracks] = await Promise.all([
          getTopItems('artists', 'medium_term', 10).catch(() => []),
          getTopItems('tracks', 'medium_term', 10).catch(() => []),
        ])
        setTopArtists(artists)
        setTopTracks(tracks)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [setUser])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Profile Header */}
      <div className="flex items-center gap-6">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-surface-elevated border border-border-theme flex items-center justify-center shadow-2xl ring-4 ring-spotify-green/20">
          <User size={52} className="text-subtext/40" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-subtext mb-1">Profile</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-primary">{user?.username || 'User'}</h1>
          <p className="text-sm text-subtext mt-1">{user?.email}</p>
          {user?.role && (
            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-bold bg-spotify-green/10 text-spotify-green border border-spotify-green/20">
              <Crown size={12} />
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </span>
          )}
        </div>
      </div>



      <div className="grid md:grid-cols-2 gap-8">
        {/* Top Artists */}
        <section className="bg-surface border border-border-theme rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-primary flex items-center gap-2">
            <User size={18} className="text-spotify-green" />
            Top Artists
          </h2>
          {topArtists.length === 0 ? (
            <p className="text-sm text-subtext py-4 text-center">No data yet — keep listening!</p>
          ) : (
            <div className="space-y-1.5">
              {topArtists.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-highlight transition-colors"
                >
                  <span className="text-sm text-subtext w-6 text-center tabular-nums font-bold">
                    {i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-theme flex items-center justify-center shadow-sm">
                    <User size={16} className="text-subtext" />
                  </div>
                  <span className="text-sm font-semibold text-primary">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Tracks */}
        <section className="bg-surface border border-border-theme rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold mb-4 text-primary flex items-center gap-2">
            <Music size={18} className="text-spotify-green" />
            Top Tracks
          </h2>
          {topTracks.length === 0 ? (
            <p className="text-sm text-subtext py-4 text-center">No data yet — keep listening!</p>
          ) : (
            <div className="space-y-1.5">
              {topTracks.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-highlight transition-colors"
                >
                  <span className="text-sm text-subtext w-6 text-center tabular-nums font-bold">
                    {i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border-theme flex items-center justify-center shadow-sm">
                    <Music size={16} className="text-subtext" />
                  </div>
                  <span className="text-sm font-semibold text-primary">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
