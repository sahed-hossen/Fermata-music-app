import { useEffect, useState, useCallback } from 'react'
import { Library as LibraryIcon, Heart, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getLibrary } from '@/api/library'
import { getTrack } from '@/api/tracks'
import { usePlayerStore } from '@/store/playerStore'
import type { Track } from '@/types'
import TrackList from '@/components/TrackList'

export default function LibraryPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)

  const setTrack = usePlayerStore((s) => s.setTrack)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)

  const navigate = useNavigate()

  const loadTracks = useCallback(async () => {
    setLoading(true)
    try {
      const items = await getLibrary(0, 50)
      const trackDetails = await Promise.all(
        items.map((item) => getTrack(item.track_id).catch(() => null)),
      )
      setTracks(trackDetails.filter(Boolean) as Track[])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTracks()
    // Refresh on library updates
    window.addEventListener('library-updated', loadTracks)
    return () => window.removeEventListener('library-updated', loadTracks)
  }, [loadTracks])

  const handlePlayAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (tracks.length > 0) {
      setQueue(tracks)
      setTrack(tracks[0])
      setIsPlaying(true)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <LibraryIcon size={28} className="text-spotify-green" />
        <h1 className="text-3xl font-extrabold tracking-tight text-primary">Your Library</h1>
      </div>

      {/* Featured Favourites Banner */}
      <div
        onClick={() => navigate('/library')}
        className="group relative rounded-3xl p-6 bg-gradient-to-r from-emerald-600/30 via-teal-600/20 to-surface border border-border-theme hover:border-spotify-green/50 shadow-md transition-all duration-300 overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-spotify-green text-accent-text flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
            <Heart size={30} fill="currentColor" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-spotify-green">
              Your Collection
            </span>
            <h2 className="text-xl font-bold text-primary group-hover:text-spotify-green transition-colors">
              Liked Songs
            </h2>
            <p className="text-xs text-subtext mt-0.5">
              {tracks.length} song{tracks.length !== 1 ? 's' : ''} saved to your library
            </p>
          </div>
        </div>

        {tracks.length > 0 && (
          <button
            onClick={handlePlayAll}
            className="w-12 h-12 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-accent-text flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer shrink-0"
            title="Play All"
          >
            <Play size={20} className="ml-0.5" fill="currentColor" />
          </button>
        )}
      </div>

      {/* Track List */}
      <div>
        <h2 className="text-xl font-bold text-primary mb-4">All Library Tracks</h2>
        {tracks.length === 0 ? (
          <div className="py-16 text-center text-subtext bg-surface rounded-2xl border border-border-theme p-6">
            <LibraryIcon size={44} className="mx-auto mb-3 opacity-40" />
            <p className="text-base font-bold text-primary">Your library is empty</p>
            <p className="text-xs text-subtext mt-1">Like tracks to add them to your collection</p>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl p-4 border border-border-theme shadow-sm">
            <TrackList tracks={tracks} />
          </div>
        )}
      </div>
    </div>
  )
}
