import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Play,
  Shuffle,
  Music2,
  MoreHorizontal,
  Pencil,
  Clock,
  X,
  Check,
  Trash2,
} from 'lucide-react'
import {
  getPlaylistItems,
  getMyPlaylists,
  deletePlaylistItem,
  updatePlaylist,
  deletePlaylist,
} from '@/api/playlists'
import { usePlayerStore } from '@/store/playerStore'
import { useToastStore } from '@/store/toastStore'
import type { Track, PlaylistItem } from '@/types'
import TrackList from '@/components/TrackList'
import ConfirmModal from '@/components/ConfirmModal'
import { parsePlaylistName } from '@/components/Sidebar'

// Deterministic gradient colors based on playlist id
const GRADIENTS = [
  ['#4f46e5', '#7c3aed'],
  ['#0ea5e9', '#6366f1'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#0ea5e9'],
  ['#ec4899', '#8b5cf6'],
  ['#f97316', '#ef4444'],
  ['#14b8a6', '#3b82f6'],
  ['#8b5cf6', '#ec4899'],
]

function getGradient(id: number) {
  const pair = GRADIENTS[id % GRADIENTS.length]
  return `linear-gradient(135deg, ${pair[0]}cc 0%, ${pair[1]}99 100%)`
}

function formatDuration(totalSec: number) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  if (h > 0) return `${h} hr ${m} min`
  return `${m} min`
}

export default function PlaylistPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [items, setItems] = useState<PlaylistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [playlistInfo, setPlaylistInfo] = useState({ name: '', description: '' })

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Confirm delete modal state
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)

  const setTrack = usePlayerStore((s) => s.setTrack)
  const setQueue = usePlayerStore((s) => s.setQueue)
  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)
  const setShuffle = usePlayerStore((s) => s.setShuffle)

  const toast = useToastStore()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const numId = Number(id) || 1

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [allItems, myPlaylists] = await Promise.all([
        getPlaylistItems(numId),
        getMyPlaylists(),
      ])
      setItems(allItems)
      const current = myPlaylists.find((p) => p.id === numId)
      if (current) {
        const parsed = parsePlaylistName(current.name)
        setPlaylistInfo(parsed)
      } else {
        setPlaylistInfo({ name: `Playlist #${id}`, description: '' })
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [id, numId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Refresh on external playlist updates
  useEffect(() => {
    const handler = () => loadData()
    window.addEventListener('playlist-updated', handler)
    return () => window.removeEventListener('playlist-updated', handler)
  }, [loadData])

  const tracks: Track[] = items.map((i) => i.track)

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      setQueue(tracks)
      setTrack(tracks[0])
      setIsPlaying(true)
    }
  }

  const handleShuffle = () => {
    if (tracks.length > 0) {
      setShuffle(true)
      const randomIndex = Math.floor(Math.random() * tracks.length)
      setQueue(tracks)
      setTrack(tracks[randomIndex])
      setIsPlaying(true)
    }
  }

  const handleRemoveTrack = async (trackId: number) => {
    try {
      await deletePlaylistItem(numId, trackId)
      setItems((prev) => prev.filter((i) => i.track.id !== trackId))
      toast.success('Removed track from playlist')
    } catch {
      toast.error('Failed to remove track')
    }
  }

  const openEdit = () => {
    setEditName(playlistInfo.name)
    setEditDesc(playlistInfo.description)
    setIsEditing(true)
    setTimeout(() => nameInputRef.current?.focus(), 100)
  }

  const handleSaveEdit = async () => {
    if (!editName.trim() || isSaving) return
    setIsSaving(true)
    try {
      const serializedName = JSON.stringify({
        name: editName.trim(),
        description: editDesc.trim(),
      })
      await updatePlaylist(numId, serializedName)
      setPlaylistInfo({ name: editName.trim(), description: editDesc.trim() })
      setIsEditing(false)
      window.dispatchEvent(new CustomEvent('playlists-updated'))
      toast.success('Playlist updated')
    } catch {
      toast.error('Failed to update playlist')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePlaylist = async () => {
    try {
      await deletePlaylist(numId)
      setIsConfirmDeleteOpen(false)
      setIsEditing(false)
      window.dispatchEvent(new CustomEvent('playlists-updated'))
      toast.success(`Playlist "${playlistInfo.name}" deleted`)
      navigate('/library')
    } catch {
      toast.error('Failed to delete playlist')
    }
  }

  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration_seconds || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-full">
      {/* ── Hero Header ── */}
      <div
        className="relative px-6 pt-10 pb-6 flex items-end gap-6"
        style={{ background: getGradient(numId) }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 pointer-events-none" />

        {/* Cover Art */}
        <div
          className="relative w-52 h-52 rounded-lg shadow-2xl shrink-0 flex items-center justify-center group cursor-pointer overflow-hidden"
          style={{ background: getGradient(numId) }}
          onClick={openEdit}
          title="Edit playlist"
        >
          <Music2 size={72} className="text-white/40 drop-shadow-lg" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
            <Pencil size={28} className="text-white drop-shadow" />
            <span className="text-white text-xs font-semibold">Edit</span>
          </div>
        </div>

        {/* Info */}
        <div className="relative z-10 min-w-0 flex-1 pb-1">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">Playlist</p>
          <h1
            className="text-4xl sm:text-5xl font-black text-white truncate cursor-pointer hover:underline decoration-white/30 mb-3"
            onClick={openEdit}
            title="Click to edit name"
          >
            {playlistInfo.name || `Playlist #${id}`}
          </h1>
          {playlistInfo.description && (
            <p className="text-sm text-white/60 mb-2 line-clamp-2">{playlistInfo.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-white/60 flex-wrap">
            <span className="font-semibold text-white">{tracks.length} songs</span>
            {totalDuration > 0 && (
              <>
                <span>•</span>
                <span>{formatDuration(totalDuration)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Actions Bar ── */}
      <div
        className="px-6 py-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)' }}
      >
        {/* Play */}
        <button
          onClick={handlePlayAll}
          disabled={tracks.length === 0}
          className="w-14 h-14 bg-spotify-green rounded-full flex items-center justify-center hover:scale-105 hover:bg-spotify-green-hover transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          title="Play all"
        >
          <Play size={24} className="text-accent-text ml-1" fill="currentColor" />
        </button>

        {/* Shuffle */}
        <button
          onClick={handleShuffle}
          disabled={tracks.length === 0}
          className="w-10 h-10 flex items-center justify-center text-subtext hover:text-spotify-green hover:scale-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          title="Shuffle"
        >
          <Shuffle size={22} />
        </button>

        {/* Edit details */}
        <button
          onClick={openEdit}
          className="w-10 h-10 flex items-center justify-center text-subtext hover:text-primary hover:scale-110 transition-all cursor-pointer"
          title="Edit playlist details"
        >
          <MoreHorizontal size={22} />
        </button>

        {/* Delete Playlist Button */}
        <button
          onClick={() => setIsConfirmDeleteOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-subtext hover:text-red-500 hover:scale-110 transition-all ml-auto cursor-pointer"
          title="Delete playlist"
        >
          <Trash2 size={22} />
        </button>
      </div>

      {/* ── Tracks ── */}
      <div className="px-4 pb-24">
        {tracks.length > 0 ? (
          <>
            <div className="grid grid-cols-[16px_1fr_auto] gap-4 px-4 py-2 border-b border-border-theme mb-1 text-xs font-semibold text-subtext uppercase tracking-wider">
              <span className="text-center">#</span>
              <span>Title</span>
              <span className="flex items-center gap-1"><Clock size={12} /></span>
            </div>
            <TrackList tracks={tracks} playlistId={numId} onRemoveTrack={handleRemoveTrack} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-28 h-28 rounded-full flex items-center justify-center mb-5 shadow-xl"
              style={{ background: getGradient(numId) }}
            >
              <Music2 size={52} className="text-white/50" />
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">Let's start building your playlist</h3>
            <p className="text-sm text-subtext max-w-xs">
              Browse songs and hit the <strong className="text-primary">⋯</strong> menu on any track to add it here.
            </p>
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      {isEditing && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsEditing(false) }}
        >
          <div className="bg-surface border border-border-theme rounded-3xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-primary">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2 border-b border-border-theme">
              <h2 className="text-lg font-bold text-primary">Edit details</h2>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-full text-subtext hover:text-primary hover:bg-surface-highlight transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Cover + Name */}
              <div className="flex gap-4 items-start">
                <div
                  className="w-20 h-20 rounded-xl shrink-0 flex items-center justify-center shadow-md"
                  style={{ background: getGradient(numId) }}
                >
                  <Music2 size={32} className="text-white/70" />
                </div>
                <div className="flex-1 pt-1">
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Playlist name"
                    maxLength={60}
                    className="w-full bg-surface-elevated border border-border-theme rounded-xl px-3 py-2 text-sm font-bold text-primary placeholder-subtext outline-none focus:border-spotify-green transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Add an optional description"
                maxLength={200}
                rows={3}
                className="w-full bg-surface-elevated border border-border-theme rounded-xl px-3 py-2 text-xs text-primary placeholder-subtext outline-none resize-none focus:border-spotify-green transition-colors"
              />

              {/* Delete Button inside edit modal */}
              <div className="pt-2 border-t border-border-theme flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setIsConfirmDeleteOpen(true)
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:underline cursor-pointer"
                >
                  <Trash2 size={14} />
                  Delete playlist
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2.5 rounded-full border border-border-theme text-xs font-bold text-subtext hover:text-primary hover:bg-surface-highlight transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 rounded-full bg-spotify-green text-accent-text text-xs font-extrabold hover:bg-spotify-green-hover transition-all cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : (
                    <span className="flex items-center justify-center gap-1.5">
                      <Check size={15} />
                      Save
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Delete Playlist?"
        description={`Are you sure you want to delete "${playlistInfo.name || 'this playlist'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep Playlist"
        variant="danger"
        onConfirm={handleDeletePlaylist}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  )
}
