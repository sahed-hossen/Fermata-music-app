import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { User, BadgeCheck, Play, Pause, MoreHorizontal, Clock, Music } from 'lucide-react'
import { getArtist, getArtistAlbums } from '@/api/artists'
import { getAlbumTracks } from '@/api/albums'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'
import type { Artist, Album, Track } from '@/types'
import CardGrid from '@/components/CardGrid'
import Card from '@/components/Card'

// Beautiful concert backdrop images to match artist vibes
const BANNERS = [
  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop',
]

const styleTag = (
  <style>{`
    .line-clamp-3 {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `}</style>
)

export default function ArtistPage() {
  const { id } = useParams<{ id: string }>()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [albums, setAlbums] = useState<Album[]>([])
  const [popularTracks, setPopularTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [showAllPopular, setShowAllPopular] = useState(false)

  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const setTrack = usePlayerStore((s) => s.setTrack)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)

  const toast = useToastStore()

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const [artistData, albumData] = await Promise.all([
          getArtist(Number(id)),
          getArtistAlbums(Number(id), 0, 50),
        ])
        setArtist(artistData)
        setAlbums(albumData)

        // Load tracks of the first 3 albums to build the popular tracks list
        if (albumData.length > 0) {
          const firstAlbums = albumData.slice(0, 3)
          const tracksPromises = firstAlbums.map((album) =>
            getAlbumTracks(album.id, 0, 10).catch(() => []),
          )
          const albumsTracks = await Promise.all(tracksPromises)

          const allTracks = albumsTracks.flatMap((t, idx) =>
            t.map((track) => ({
              ...track,
              album_title: firstAlbums[idx].title,
              artist_name: artistData.name,
              artist_id: artistData.id,
            })),
          )
          setPopularTracks(allTracks)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="py-20 text-center text-subtext">
        <p className="text-lg">Artist not found</p>
      </div>
    )
  }

  const isCurrentArtistPlaying =
    popularTracks.some((t) => t.id === currentTrack?.id) && isPlaying

  const handlePlayArtist = () => {
    if (popularTracks.length === 0) return

    if (isCurrentArtistPlaying) {
      setIsPlaying(false)
    } else {
      const activeIndex = popularTracks.findIndex((t) => t.id === currentTrack?.id)
      const trackToPlay = activeIndex !== -1 ? popularTracks[activeIndex] : popularTracks[0]
      setQueue(popularTracks)
      setTrack(trackToPlay)
      setIsPlaying(true)
    }
  }

  const handleFollowToggle = () => {
    const nextState = !isFollowing
    setIsFollowing(nextState)
    if (nextState) {
      toast.success(`Following ${artist.name}`)
    } else {
      toast.info(`Unfollowed ${artist.name}`)
    }
  }

  const bannerUrl = BANNERS[Number(id) % BANNERS.length]
  const mockListeners = Number(id) * 382490 + 1204928
  const displayedTracks = showAllPopular ? popularTracks.slice(0, 10) : popularTracks.slice(0, 5)

  return (
    <div className="relative min-h-screen text-primary -m-6 pb-32 overflow-hidden bg-base transition-colors duration-200">
      {styleTag}

      {/* Hero Header Section */}
      <div
        className="relative h-[42vh] min-h-[320px] max-h-[440px] px-8 py-12 flex flex-col justify-end bg-cover bg-center"
        style={{ backgroundImage: `url(${bannerUrl})` }}
      >
        {/* Rich dark overlay to ensure readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0c] via-black/45 to-black/30" />

        {/* Parallax glass glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-spotify-green/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-400 drop-shadow-md select-none bg-blue-500/10 border border-blue-500/20 w-fit px-3 py-1 rounded-full backdrop-blur-md mb-3">
            <BadgeCheck size={16} className="fill-blue-400 text-black" />
            <span>Verified Artist</span>
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black tracking-tight mt-1 mb-6 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] select-text">
            {artist.name}
          </h1>
          <div className="flex items-center gap-2 drop-shadow-md">
            <span className="w-2.5 h-2.5 bg-spotify-green rounded-full animate-pulse" />
            <p className="text-sm font-semibold text-white/90">
              {mockListeners.toLocaleString()} monthly listeners
            </p>
          </div>
        </div>
      </div>

      <div className="px-8 py-8 space-y-12 relative z-10">

        {/* Action Controls Bar */}
        <div className="flex items-center gap-6">
          <button
            onClick={handlePlayArtist}
            disabled={popularTracks.length === 0}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xl ${
              popularTracks.length === 0
                ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                : 'bg-spotify-green text-accent-text hover:scale-105 hover:bg-spotify-green-hover active:scale-95 shadow-spotify-green/20'
            }`}
            title={isCurrentArtistPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentArtistPlaying ? (
              <Pause size={26} className="fill-current" />
            ) : (
              <Play size={26} className="fill-current ml-1" />
            )}
          </button>

          <button
            onClick={handleFollowToggle}
            className={`px-6 py-2.5 rounded-full text-sm font-bold border transition-all duration-200 cursor-pointer ${
              isFollowing
                ? 'border-white text-white bg-white/10 hover:bg-white/20'
                : 'border-white/40 text-white hover:border-white hover:scale-105 active:scale-95'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>

          <button
            className="p-2.5 rounded-full text-subtext hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="More Options"
          >
            <MoreHorizontal size={24} />
          </button>
        </div>

        {/* Popular Tracks Grid */}
        {popularTracks.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black tracking-tight">Popular</h2>
            <div className="border-b border-white/5 pb-2 grid grid-cols-[32px_1fr_120px_80px_40px] gap-4 px-4 text-xs text-subtext font-bold uppercase tracking-wider">
              <span className="text-center">#</span>
              <span>Title</span>
              <span className="text-right">Plays</span>
              <span className="text-right"><Clock size={14} className="inline-block" /></span>
              <span></span>
            </div>

            <div className="space-y-0.5">
              {displayedTracks.map((track, i) => {
                const isActive = currentTrack?.id === track.id
                const isCurrent = isActive && isPlaying
                // Deterministic mock play count based on track ID
                const playCount = ((track.id * 14209 + 284102) % 9482103) + 12049

                const handlePlayTrack = () => {
                  if (isActive) {
                    setIsPlaying(!isPlaying)
                  } else {
                    setQueue(popularTracks)
                    setTrack(track)
                    setIsPlaying(true)
                  }
                }

                return (
                  <div
                    key={track.id}
                    onDoubleClick={handlePlayTrack}
                    className={`group grid grid-cols-[32px_1fr_120px_80px_40px] gap-4 items-center px-4 py-2.5 rounded-xl transition-colors cursor-pointer ${
                      isActive ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <span className={`text-sm tabular-nums font-medium ${isActive ? 'text-spotify-green' : 'text-subtext'} group-hover:hidden`}>
                        {i + 1}
                      </span>
                      <button onClick={handlePlayTrack} className="hidden group-hover:block text-white cursor-pointer">
                        {isCurrent ? <Pause size={14} className="fill-white" /> : <Play size={14} className="fill-white ml-0.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/20 flex items-center justify-center shrink-0 border border-white/5">
                        <Music size={16} className="text-white/60" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-spotify-green' : 'text-white'}`}>
                          {track.title}
                        </p>
                        <p className="text-xs text-subtext truncate">{artist.name}</p>
                      </div>
                    </div>

                    <span className="text-sm text-subtext text-right font-medium tabular-nums">
                      {playCount.toLocaleString()}
                    </span>

                    <span className="text-sm text-subtext text-right font-medium tabular-nums">
                      {track.duration_seconds
                        ? `${Math.floor(track.duration_seconds / 60)}:${(track.duration_seconds % 60).toString().padStart(2, '0')}`
                        : '--:--'}
                    </span>

                    <div className="flex justify-center">
                      <button className="opacity-0 group-hover:opacity-100 p-1 text-subtext hover:text-white transition-opacity cursor-pointer">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {popularTracks.length > 5 && (
              <button
                onClick={() => setShowAllPopular(!showAllPopular)}
                className="text-sm font-bold text-subtext hover:text-white px-4 py-2 hover:underline cursor-pointer select-none"
              >
                {showAllPopular ? 'Show less' : 'See more'}
              </button>
            )}
          </div>
        )}

        {/* Discography */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight">Discography</h2>
          {albums.length > 0 ? (
            <CardGrid>
              {albums.map((album) => (
                <Card
                  key={album.id}
                  title={album.title}
                  subtitle="Album"
                  href={`/album/${album.id}`}
                />
              ))}
            </CardGrid>
          ) : (
            <div className="py-12 text-center text-subtext bg-white/[0.02] border border-white/5 rounded-2xl">
              <p className="text-sm">No albums found</p>
            </div>
          )}
        </div>

        {/* About Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight">About</h2>
          <div
            className="group relative rounded-3xl overflow-hidden h-[300px] flex flex-col justify-end p-10 cursor-pointer border border-white/5 shadow-2xl"
            style={{
              backgroundImage: `url(${bannerUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 30%',
            }}
          >
            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/50 transition-colors duration-300" />
            <div className="relative z-10 max-w-xl space-y-3">
              <span className="text-3xl font-black text-white tracking-tight">
                {mockListeners.toLocaleString()}
              </span>
              <p className="text-xs uppercase tracking-widest text-spotify-green font-bold">
                Monthly Listeners
              </p>
              <p className="text-sm text-white/80 leading-relaxed font-medium line-clamp-3">
                From underground project to globally streamed soundscapes, {artist.name} crafts immersive, genre-defying audio journeys. Defining modern sonic spaces, their live shows attract crowds worldwide.
              </p>
            </div>
            {/* Subtle light leak shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
          </div>
        </div>

      </div>
    </div>
  )
}
