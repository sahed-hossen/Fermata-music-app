import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  Search,
  Library,
  Plus,
  History,
  Trash2,
  HelpCircle,
  Download,
} from 'lucide-react'

import { useAuthStore } from '@/store/authStore'
import { getMyPlaylists, deletePlaylist } from '@/api/playlists'
import type { Playlist } from '@/types'
import logo from '@/assets/logo.svg'

export function parsePlaylistName(rawName: string) {
  try {
    const data = JSON.parse(rawName)
    return {
      name: data.name || 'Unnamed Playlist',
      artist: data.artist || '',
      description: data.description || '',
    }
  } catch {
    return {
      name: rawName || 'Unnamed Playlist',
      artist: '',
      description: '',
    }
  }
}

interface SidebarProps {
  onItemClick?: () => void
}

export default function Sidebar({ onItemClick }: SidebarProps) {
  const token = useAuthStore((s) => s.token)
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) {
      setDeferredPrompt(null)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[PWA Install] User choice outcome: ${outcome}`)
    setDeferredPrompt(null)
  }

  const fetchPlaylists = () => {
    if (token) {
      getMyPlaylists()
        .then(setPlaylists)
        .catch(() => { })
    }
  }

  useEffect(() => {
    fetchPlaylists()
    const handleRefresh = () => fetchPlaylists()
    window.addEventListener('playlist-updated', handleRefresh)
    return () => window.removeEventListener('playlist-updated', handleRefresh)
  }, [token])

  const handleDeleteSidebarPlaylist = async (e: React.MouseEvent, pl: Playlist) => {
    e.preventDefault()
    e.stopPropagation()
    const info = parsePlaylistName(pl.name)
    if (!confirm(`Are you sure you want to delete "${info.name}"?`)) return
    try {
      await deletePlaylist(pl.id)
      setPlaylists((prev) => prev.filter((p) => p.id !== pl.id))
      if (window.location.hash.includes(`/playlist/${pl.id}`)) {
        navigate('/')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete playlist')
    }
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center gap-3.5 mx-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
      isActive
        ? 'bg-spotify-green/10 text-spotify-green font-bold border-l-2 border-spotify-green shadow-sm'
        : 'text-subtext hover:text-primary hover:bg-surface-highlight/70 hover:translate-x-1 active:scale-[0.98]'
    }`

  return (
    <aside className="flex flex-col bg-base h-full w-full min-h-0 text-primary select-none">
      {/* Logo */}
      <div className="p-6 pb-2 shrink-0">
        <div
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          onClick={() => navigate('/')}
        >
          <img
            src={logo}
            alt="Fermata Logo"
            className="w-9 h-9 object-contain rounded-lg shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-300"
          />
          <span className="text-xl font-extrabold tracking-tight text-primary group-hover:text-spotify-green transition-colors duration-200">
            Fermata
          </span>
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col scrollbar-thin">
        {/* Main Nav with Minimal Animations */}
        <nav className="px-3 mt-4 space-y-1 shrink-0">
          <NavLink to="/" className={linkClass} onClick={onItemClick} end>
            <Home size={19} className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/search" className={linkClass} onClick={onItemClick}>
            <Search size={19} className="shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <span>Search</span>
          </NavLink>
          <NavLink to="/report-missing" className={linkClass} onClick={onItemClick}>
            <HelpCircle size={19} className="shrink-0 transition-transform duration-300 group-hover:rotate-[-12deg] group-hover:scale-110" />
            <span>Report Missing</span>
          </NavLink>
          {token && (
            <>
              <NavLink to="/library" className={linkClass} onClick={onItemClick}>
                <Library size={19} className="shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110" />
                <span>Your Library</span>
              </NavLink>
              <NavLink to="/recents" className={linkClass} onClick={onItemClick}>
                <History size={19} className="shrink-0 transition-transform duration-300 group-hover:rotate-[-36deg] group-hover:scale-110" />
                <span>Recently Played</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* PWA Install Prompt Button */}
        {deferredPrompt && (
          <div className="px-3 mt-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-semibold text-spotify-green bg-spotify-green/10 hover:bg-spotify-green/20 transition-all border border-spotify-green/20 cursor-pointer group"
            >
              <Download size={19} className="animate-pulse group-hover:scale-110 transition-transform" />
              <span>Install Fermata App</span>
            </button>
          </div>
        )}

        {/* Playlists */}
        {token && (
          <div className="flex-1 min-h-[160px] mt-6 px-3 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-subtext">
                Playlists
              </span>
              <button
                onClick={() => window.dispatchEvent(new Event('open-create-playlist-modal'))}
                className="p-1 rounded-md text-subtext hover:text-primary hover:bg-surface-highlight transition-all duration-300 hover:rotate-90 cursor-pointer"
                title="Create playlist"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-thin">
              {playlists.map((pl) => {
                const info = parsePlaylistName(pl.name)
                return (
                  <div key={pl.id} className="group/item flex items-center justify-between">
                    <NavLink
                      to={`/playlist/${pl.id}`}
                      className={({ isActive }) =>
                        `flex-1 px-3 py-2 rounded-lg text-sm truncate transition-all duration-200 hover:translate-x-1 ${isActive
                          ? 'bg-surface-highlight text-primary font-bold'
                          : 'text-subtext hover:text-primary hover:bg-surface-highlight/50'
                        }`
                      }
                      onClick={onItemClick}
                    >
                      {info.name}
                    </NavLink>
                    <button
                      onClick={(e) => handleDeleteSidebarPlaylist(e, pl)}
                      className="p-1.5 opacity-0 group-hover/item:opacity-100 text-subtext hover:text-red-400 transition-all rounded shrink-0 mr-1 hover:scale-110"
                      title="Delete Playlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </aside>
  )
}
