import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X, Search } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { usePlayerStore } from '@/store/playerStore'
import { getRecentlyPlayed, getMostPlayedTracks, getRecentlyPlayedAlbums, getMostPlayedAlbums } from '@/api/player'
import { getTrack } from '@/api/tracks'
import { getMyPlaylists } from '@/api/playlists'
import type { Track, Playlist, Album } from '@/types'
import CardGrid from '@/components/CardGrid'
import Card from '@/components/Card'
import TrackList from '@/components/TrackList'
import { parsePlaylistName } from '@/components/Sidebar'
import LoginWelcomeSplash from '@/components/LoginWelcomeSplash'
import SearchInput from '@/components/SearchInput'

/* ─── tiny hook: triggers true after mount for CSS entrance animations ─── */
function useMounted(delay = 60) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const t = setTimeout(() => setReady(true), delay); return () => clearTimeout(t) }, [delay])
  return ready
}

export default function HomePage() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const setTrack = usePlayerStore((s) => s.setTrack)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const navigate = useNavigate()
  const location = useLocation()
  const ready = useMounted()

  const [showSplash, setShowSplash] = useState(() => {
    return !!(location.state as any)?.justLoggedIn
  })

  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    if (val.trim()) navigate(`/search?q=${encodeURIComponent(val.trim())}`, { replace: true })
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    if (e.key === 'Escape') { setSearchQuery(''); searchInputRef.current?.blur() }
  }

  const [recentTracks, setRecentTracks] = useState<Track[]>([])
  const [mostPlayedTracks, setMostPlayedTracks] = useState<Track[]>([])
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([])
  const [mostPlayedAlbums, setMostPlayedAlbums] = useState<Album[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        if (token) {
          const [recent, mostPlayed, recentAlbs, mostPlayedAlbs, pls] = await Promise.all([
            getRecentlyPlayed(0, 12).catch(() => []),
            getMostPlayedTracks(5).catch(() => []),
            getRecentlyPlayedAlbums(6).catch(() => []),
            getMostPlayedAlbums(6).catch(() => []),
            getMyPlaylists().catch(() => []),
          ])
          const safeRecent = Array.isArray(recent) ? recent : []
          setPlaylists(Array.isArray(pls) ? pls : [])
          setMostPlayedTracks(Array.isArray(mostPlayed) ? mostPlayed : [])
          setRecentAlbums(Array.isArray(recentAlbs) ? recentAlbs : [])
          setMostPlayedAlbums(Array.isArray(mostPlayedAlbs) ? mostPlayedAlbs : [])

          const trackDetails = await Promise.all(
            safeRecent.slice(0, 8).map((r) => getTrack(r.track_id).catch(() => null)),
          )
          setRecentTracks(trackDetails.filter(Boolean) as Track[])
        } else {
          // Guests: just load recently played albums
          const recentAlbs = await getRecentlyPlayedAlbums(6).catch(() => [])
          setRecentAlbums(Array.isArray(recentAlbs) ? recentAlbs : [])
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  /* ── skeleton loading screen ── */
  if (loading) {
    return (
      <div className="relative min-h-screen bg-base -m-4 lg:-m-6 p-4 lg:p-6 pb-32 overflow-hidden">
        <style>{`
          @keyframes shimmer {
            0%   { background-position: -600px 0; }
            100% { background-position: 600px 0; }
          }
          .skel {
            border-radius: 10px;
            background: linear-gradient(90deg,
              var(--surface-highlight) 25%,
              var(--border-color) 50%,
              var(--surface-highlight) 75%);
            background-size: 600px 100%;
            animation: shimmer 1.4s infinite linear;
          }
        `}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div className="skel" style={{ height: 28, width: 200 }} />
          <div className="skel" style={{ height: 36, width: 280, borderRadius: 999, marginLeft: 'auto' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 36 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skel" style={{ height: 68, borderRadius: 16 }} />
          ))}
        </div>
        <div className="skel" style={{ height: 20, width: 180, marginBottom: 14 }} />
        <div className="skel" style={{ height: 200, borderRadius: 16, marginBottom: 36 }} />
        <div className="skel" style={{ height: 20, width: 160, marginBottom: 14 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <div className="skel" style={{ height: 110, borderRadius: 14, marginBottom: 8 }} />
              <div className="skel" style={{ height: 12, width: '70%', marginBottom: 5 }} />
              <div className="skel" style={{ height: 10, width: '50%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-base text-primary -m-4 lg:-m-6 p-4 lg:p-6 pb-40 lg:pb-32 overflow-hidden transition-colors duration-200">
      {/* Soundstage Login Transition Splash */}
      {showSplash && <LoginWelcomeSplash onComplete={() => setShowSplash(false)} />}
      <style>{`
        /* ── entrance ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* ── greeting shimmer ── */
        @keyframes greetingShine {
          0%   { background-position: -300px 0; }
          60%  { background-position: 300px 0; }
          100% { background-position: 300px 0; }
        }
        /* ── card hover lift ── */
        .hp-track-card {
          transition: transform 0.18s cubic-bezier(0.22,1,0.36,1),
                      box-shadow 0.18s ease,
                      background 0.15s ease;
        }
        .hp-track-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.28);
        }
        /* ── stagger sections ── */
        .sec-0 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 0.04s; }
        .sec-1 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 0.12s; }
        .sec-2 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 0.20s; }
        .sec-3 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 0.28s; }
        .sec-4 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 0.36s; }
        .sec-5 { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; animation-delay: 0.44s; }
        /* ── greeting text (Spotify Geometric Bold Style) ── */
        .greeting-text {
          font-family: 'Plus Jakarta Sans', 'Outfit', 'Inter', sans-serif;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: -0.03em;
        }
        /* ── search input ── */
        .hp-search:focus {
          box-shadow: 0 0 0 2px rgba(84,87,167,0.25);
        }
      `}</style>

      {/* Content */}
      <div className="relative z-10 space-y-8">

        {/* ── Top Header Bar with Right-Shifted Animated Search Bar ── */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${ready ? 'sec-0' : 'opacity-0'}`}>
          <div className="min-w-0 shrink-0">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-extrabold tracking-tight leading-none text-primary greeting-text">
              {token && user ? `${greeting()}, ${user.full_name || user.username}` : greeting()}
            </h1>
          </div>

          <div className="w-full sm:w-[440px] md:w-[520px] lg:w-[580px] ml-auto shrink-0">
            <SearchInput
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              onSearch={(val) => {
                if (val.trim()) navigate(`/search?q=${encodeURIComponent(val.trim())}`)
              }}
            />
          </div>
        </div>

        {/* ── Recently Played ── */}
        {recentTracks.length > 0 && (
          <section className={ready ? 'sec-1' : 'opacity-0'}>
            <h2 className="text-xl font-bold mb-4 text-primary">Recently Played</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentTracks.map((track, i) => (
                <button
                  key={track.id}
                  onClick={() => { setQueue(recentTracks); setTrack(track) }}
                  className="hp-track-card flex items-center gap-3 bg-surface hover:bg-surface-highlight rounded-2xl overflow-hidden text-left p-2 border border-border-theme cursor-pointer shadow-sm"
                  style={{ animationDelay: `${0.12 + i * 0.04}s` }}
                >
                  {track.cover_url ? (
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="w-12 h-12 shrink-0 rounded-xl object-cover border border-border-theme"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-surface-elevated flex items-center justify-center shrink-0 rounded-xl overflow-hidden border border-border-theme">
                      <span className="text-primary font-bold text-sm">
                        {track.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-bold truncate text-primary">{track.title}</p>
                    <p className="text-xs text-subtext truncate mt-0.5">{track.artist_name || 'Unknown Artist'}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Most Played Tracks ── */}
        {mostPlayedTracks.length > 0 && (
          <section className={ready ? 'sec-2' : 'opacity-0'}>
            <h2 className="text-xl font-bold mb-4 text-primary">Your Most Played Tracks</h2>
            <div className="bg-surface rounded-2xl p-4 border border-border-theme shadow-sm">
              <TrackList tracks={mostPlayedTracks} showHeader={false} />
            </div>
          </section>
        )}

        {/* ── Albums ── */}
        {recentAlbums.length > 0 && (
          <div className={ready ? 'sec-3' : 'opacity-0'}>
            <CardGrid title="Recently Played Albums">
              {recentAlbums.map((album) => (
                <Card
                  key={album.id}
                  title={album.title}
                  subtitle={album.artist_name || 'Various Artists'}
                  href={`/album/${album.id}`}
                />
              ))}
            </CardGrid>
          </div>
        )}

        {mostPlayedAlbums.length > 0 && (
          <div className={ready ? 'sec-4' : 'opacity-0'}>
            <CardGrid title="Most Played Albums">
              {mostPlayedAlbums.map((album) => (
                <Card
                  key={album.id}
                  title={album.title}
                  subtitle={album.artist_name || 'Various Artists'}
                  href={`/album/${album.id}`}
                />
              ))}
            </CardGrid>
          </div>
        )}

        {/* ── Playlists ── */}
        {playlists.length > 0 && (
          <div className={ready ? 'sec-5' : 'opacity-0'}>
            <CardGrid title="Your Playlists">
              {playlists.map((pl) => {
                const info = parsePlaylistName(pl.name)
                return (
                  <Card
                    key={pl.id}
                    title={info.name}
                    subtitle={info.artist ? `By ${info.artist}` : 'Playlist'}
                    href={`/playlist/${pl.id}`}
                  />
                )
              })}
            </CardGrid>
          </div>
        )}

        {/* ── Fallback Discovery / Welcome State when no history exists yet ── */}
        {recentTracks.length === 0 && mostPlayedTracks.length === 0 && recentAlbums.length === 0 && (
          <div className={`p-8 rounded-3xl bg-surface border border-border-theme text-center space-y-4 shadow-sm ${ready ? 'sec-1' : 'opacity-0'}`}>
            <div className="w-16 h-16 rounded-2xl bg-spotify-green/10 border border-spotify-green/20 flex items-center justify-center text-spotify-green mx-auto">
              <Search size={28} />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-lg font-bold text-primary">Discover & Play Your Favorite Music</h3>
              <p className="text-xs text-subtext leading-relaxed">
                Search for your favorite songs, artists, and albums using the search bar above or explore the library.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => navigate('/search')}
                className="px-6 py-2.5 rounded-full bg-spotify-green text-accent-text text-xs font-bold hover:bg-spotify-green-hover transition-all cursor-pointer shadow-md"
              >
                Start Exploring
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
