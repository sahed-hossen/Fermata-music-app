import type { Track } from '@/types'
import TrackRow, { TrackListHeader } from './TrackRow'

interface Props {
  tracks: Track[]
  showHeader?: boolean
  onTrackPlay?: (track: Track) => void
  playlistId?: number
  onRemoveTrack?: (trackId: number) => void
}

export default function TrackList({ tracks, showHeader = true, onTrackPlay, playlistId, onRemoveTrack }: Props) {
  if (!tracks.length) {
    return (
      <div className="py-12 text-center text-subtext">
        <p className="text-sm">No tracks found</p>
      </div>
    )
  }

  return (
    <div>
      {showHeader && <TrackListHeader />}
      <div className="mt-1 space-y-0.5">
        {tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            index={i}
            tracks={tracks}
            onPlay={onTrackPlay}
            playlistId={playlistId}
            onRemove={onRemoveTrack}
          />
        ))}
      </div>
    </div>
  )
}
