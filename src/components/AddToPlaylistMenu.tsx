import { useEffect, useState, useRef } from 'react'
import { getMyPlaylists, addPlaylistItem, deletePlaylistItem, getPlaylistItems } from '@/api/playlists'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'
import type { Playlist } from '@/types'
import { ListMusic, Check, Plus, X, Trash2 } from 'lucide-react'
import { parsePlaylistName } from './Sidebar'

interface Props {
  trackId: number
  onClose: () => void
  playlistId?: number
  onRemove?: () => void
}

export default function AddToPlaylistMenu({ trackId, onClose, playlistId, onRemove }: Props) {
  const token = useAuthStore((s) => s.token)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [addedTo, setAddedTo] = useState<number | null>(null)
  const [containedInPlaylists, setContainedInPlaylists] = useState<Record<number, boolean>>({})
  const menuRef = useRef<HTMLDivElement>(null)
  const toast = useToastStore()

  useEffect(() => {
    if (token) {
      getMyPlaylists()
        .then(async (pls) => {
          setPlaylists(pls)

          // Check which playlists already contain this track
          const containedMap: Record<number, boolean> = {}
          await Promise.all(
            pls.map(async (pl) => {
              try {
                const items = await getPlaylistItems(pl.id)
                const exists = items.some((item) => item.track.id === trackId)
                if (exists) {
                  containedMap[pl.id] = true
                }
              } catch {
                // silent
              }
            })
          )
          setContainedInPlaylists(containedMap)
        })
        .catch(() => {})
    }
  }, [token, trackId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleAdd = async (targetPlaylistId: number, playlistName: string) => {
    try {
      await addPlaylistItem(targetPlaylistId, trackId)
      setAddedTo(targetPlaylistId)
      setContainedInPlaylists((prev) => ({ ...prev, [targetPlaylistId]: true }))
      window.dispatchEvent(new Event('playlist-updated'))
      toast.success(`Added to "${playlistName}"`)
      setTimeout(onClose, 800)
    } catch {
      toast.error('Failed to add to playlist')
    }
  }

  const handleRemoveFromPlaylist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      if (playlistId) {
        await deletePlaylistItem(playlistId, trackId)
        window.dispatchEvent(new Event('playlist-updated'))
      }
      onRemove?.()
      onClose()
    } catch (err: any) {
      toast.error('Failed to remove: ' + (err.message || String(err)))
    }
  }

  if (!token) return null

  return (
    <div
      ref={menuRef}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-0 top-8 z-50 w-64 bg-surface border border-border-theme rounded-xl shadow-xl py-2 animate-in fade-in text-primary"
    >
      {/* Remove from current playlist */}
      {(playlistId || onRemove) && (
        <div className="px-1.5 pb-1.5 border-b border-border-theme">
          <button
            onClick={handleRemoveFromPlaylist}
            className="flex items-center gap-3 w-full px-3 py-2 text-xs text-left hover:bg-red-500/10 text-red-500 font-bold rounded-lg transition-all cursor-pointer"
          >
            <X size={14} className="text-red-500 shrink-0" />
            <span className="truncate flex-1">Remove from playlist</span>
          </button>
        </div>
      )}

      <p className="px-4 py-2 text-[10px] font-extrabold text-subtext uppercase tracking-widest bg-surface-elevated">
        Add to playlist
      </p>

      {/* Playlist List */}
      <div className="max-h-48 overflow-y-auto divide-y divide-border-theme scrollbar-thin py-1">
        {playlists.length === 0 && (
          <p className="px-4 py-3 text-xs text-subtext text-center font-medium">
            No playlists yet
          </p>
        )}
        {playlists.map((pl) => {
          const info = parsePlaylistName(pl.name)
          const isAlreadyAdded = containedInPlaylists[pl.id] || addedTo === pl.id
          return (
            <button
              key={pl.id}
              onClick={() => handleAdd(pl.id, info.name)}
              className="flex items-center gap-3.5 w-full px-4 py-2.5 text-xs text-left hover:bg-surface-highlight transition-all text-primary group font-medium cursor-pointer"
            >
              <ListMusic size={14} className="text-subtext group-hover:text-spotify-green shrink-0 transition-colors" />
              <span className="truncate flex-1 group-hover:text-spotify-green transition-colors">{info.name}</span>
              {isAlreadyAdded && <Check size={14} className="text-spotify-green shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
