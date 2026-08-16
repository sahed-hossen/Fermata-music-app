import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, Library, X, Sun, Moon, User, Plus, ChevronLeft, ChevronRight, ChevronDown, Settings, LogOut, Radio, Shield, Sparkles } from 'lucide-react'
import Sidebar from './Sidebar'
import NowPlayingBar from './NowPlayingBar'
import ExpandedPlayer from './ExpandedPlayer'
import SpatialAudioModal from './SpatialAudioModal'
import EqualizerModal from './EqualizerModal'
import SettingsModal from './SettingsModal'
import NotificationCenter from './NotificationCenter'
import ToastProvider from './ToastProvider'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { createPlaylist } from '@/api/playlists'
import { listArtists } from '@/api/artists'
import type { Artist } from '@/types'

export default function Layout() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { theme, toggleTheme } = useThemeStore()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // User Dropdown Menu & Settings Modal states
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsModalOpen(true)
    window.addEventListener('open-settings-modal', handleOpenSettings)
    return () => window.removeEventListener('open-settings-modal', handleOpenSettings)
  }, [])

  // Playlist creation dialog states in Layout
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDesc, setPlaylistDesc] = useState('')
  const [artistId, setArtistId] = useState('')
  const [artistSearch, setArtistSearch] = useState('')
  const [artistsList, setArtistsList] = useState<Artist[]>([])
  const [showArtistDropdown, setShowArtistDropdown] = useState(false)
  const artistDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true)
    window.addEventListener('open-create-playlist-modal', handleOpenModal)
    return () => window.removeEventListener('open-create-playlist-modal', handleOpenModal)
  }, [])

  useEffect(() => {
    if (isModalOpen) {
      listArtists(0, 200)
        .then(setArtistsList)
        .catch(console.error)
    }
  }, [isModalOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (artistDropdownRef.current && !artistDropdownRef.current.contains(event.target as Node)) {
        setShowArtistDropdown(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    try {
      const selectedArtistName =
        artistId === 'unknown'
          ? 'Unknown Artist'
          : artistsList.find((a) => a.id === Number(artistId))?.name || 'Unknown Artist'

      const serializedName = JSON.stringify({
        name: playlistName.trim() || `My Playlist`,
        artist: selectedArtistName,
        description: playlistDesc.trim(),
      })

      const pl = await createPlaylist(serializedName)
      window.dispatchEvent(new Event('playlist-updated'))
      setIsModalOpen(false)
      setPlaylistName('')
      setPlaylistDesc('')
      setArtistId('')
      navigate(`/playlist/${pl.id}`)
    } catch {
      // silent
    }
  }

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!token) {
      navigate('/login')
      return
    }
    // Dispatch the custom event to open the modal in Sidebar
    window.dispatchEvent(new Event('open-create-playlist-modal'))
  }

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-base text-primary overflow-hidden">
      {/* Mobile Top Header Bar */}
      <header className="flex md:hidden items-center justify-between px-4 h-14 bg-base border-b border-surface-highlight shrink-0">
        {/* Left: Profile / Account Icon to Open Sidebar */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="w-8 h-8 rounded-full bg-surface-highlight flex items-center justify-center text-xs font-bold text-spotify-green hover:scale-105 transition-transform cursor-pointer"
          title="Open Menu"
        >
          {token && user ? (
            (user.full_name || user.username).charAt(0).toUpperCase()
          ) : (
            <User size={18} className="text-subtext" />
          )}
        </button>

        <span className="text-md font-bold tracking-tight">Fermata</span>

        {/* Right: Theme Toggle & Settings */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-surface-highlight text-subtext hover:text-primary transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 rounded-full hover:bg-surface-highlight text-subtext hover:text-primary transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex w-72 shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-y-auto bg-surface relative flex flex-col">
          {/* Desktop Top Header Bar with Spotify-style Top Right User Menu */}
          <header className="hidden md:flex items-center justify-between px-6 py-3 bg-surface/85 backdrop-blur-md border-b border-surface-highlight/40 sticky top-0 z-30 shrink-0">
            {/* Left: Navigation back/forward controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(-1)}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-primary transition-all cursor-pointer"
                title="Go back"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => navigate(1)}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-primary transition-all cursor-pointer"
                title="Go forward"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Right: Theme Toggle & Spotify-Style Top Right User Menu */}
            <div className="flex items-center gap-3 relative" ref={userMenuRef}>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-surface-highlight text-subtext hover:text-primary transition-colors cursor-pointer"
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notification Center */}
              <NotificationCenter />

              {token && user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2.5 p-1.5 pl-2.5 pr-3 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 text-primary transition-all cursor-pointer shadow-md hover:scale-[1.02]"
                  >
                    <div className="w-7 h-7 rounded-full bg-spotify-green flex items-center justify-center text-xs font-bold text-black shadow">
                      {(user.full_name || user.username).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold truncate max-w-[120px]">{user.full_name || user.username}</span>
                    <ChevronDown size={14} className={`text-subtext transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Floating Glassmorphic Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-surface-elevated/95 backdrop-blur-xl border border-surface-highlight/80 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-2 border-b border-surface-highlight/50 mb-1">
                        <p className="text-xs font-bold text-primary truncate">{user.full_name || user.username}</p>
                        <p className="text-[10px] text-subtext truncate">{user.email}</p>
                      </div>

                      <NavLink
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-subtext hover:text-primary hover:bg-surface-highlight transition-colors cursor-pointer"
                      >
                        <User size={15} />
                        <span>Profile</span>
                      </NavLink>

                      <NavLink
                        to="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-subtext hover:text-primary hover:bg-surface-highlight transition-colors cursor-pointer"
                      >
                        <Settings size={15} />
                        <span>Settings</span>
                      </NavLink>

                      {(user.role === 'artist' || user.role === 'admin' || user.role === 'master_admin') && (
                        <NavLink
                          to="/artist-studio"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-subtext hover:text-primary hover:bg-surface-highlight transition-colors cursor-pointer"
                        >
                          <Radio size={15} className="text-spotify-green" />
                          <span>Artist Studio</span>
                        </NavLink>
                      )}

                      {(user.role === 'admin' || user.role === 'master_admin') && (
                        <NavLink
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-subtext hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Shield size={15} />
                          <span>Admin Console</span>
                        </NavLink>
                      )}

                      <div className="border-t border-surface-highlight/50 my-1" />

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          logout()
                          navigate('/login')
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-subtext hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                      >
                        <LogOut size={15} className="text-subtext group-hover:text-red-400" />
                        <span>Log out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  to="/login"
                  className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:scale-105 transition-all shadow cursor-pointer"
                >
                  Log in
                </NavLink>
              )}
            </div>
          </header>

          {/* Key on path forces re-trigger of entry animation on navigation */}
          <div
            key={location.pathname}
            className="p-4 md:p-6 pb-40 md:pb-32 page-transition flex-1"
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Drawer Overlay (Transitions smooth sliding and backdrop fading) */}
      <div
        className={`fixed inset-0 z-50 flex md:hidden transition-all duration-300 ${isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
      >
        {/* Backdrop blur overlay */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(false)}
        />

        {/* Drawer Content */}
        <div
          className={`z-10 relative flex flex-col w-72 h-full bg-base shadow-2xl overflow-hidden transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          {/* Close Button */}
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 rounded-full hover:bg-surface-highlight text-subtext hover:text-primary transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sidebar content (closes menu on actual item click) */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <Sidebar onItemClick={() => setIsMobileSidebarOpen(false)} />
          </div>
        </div>
      </div>

      {/* Footer controls & Mobile navigation container */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col bg-base shrink-0">
        <NowPlayingBar />

        {/* Mobile Bottom Navigation Bar */}
        <nav className="flex md:hidden items-center justify-around h-16 bg-base border-t border-surface-highlight pb-safe">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-medium w-20 transition-colors ${isActive ? 'text-spotify-green' : 'text-subtext'
              }`
            }
            end
          >
            <Home size={20} />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-medium w-20 transition-colors ${isActive ? 'text-spotify-green' : 'text-subtext'
              }`
            }
          >
            <Search size={20} />
            <span>Search</span>
          </NavLink>

          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-[10px] font-medium w-20 transition-colors ${isActive ? 'text-spotify-green' : 'text-subtext'
              }`
            }
            onClick={(e) => {
              if (!token) {
                e.preventDefault()
                navigate('/login')
              }
            }}
          >
            <Library size={20} />
            <span>Your Library</span>
          </NavLink>

          <button
            onClick={handleCreateClick}
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-medium w-20 text-subtext hover:text-primary transition-colors cursor-pointer"
          >
            <Plus size={20} />
            <span>Create</span>
          </button>
        </nav>
      </div>
      <ExpandedPlayer />
      <SpatialAudioModal />
      <EqualizerModal />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
      <ToastProvider />

      {/* Custom Playlist Creation Modal (Global) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-surface-elevated rounded-xl p-6 w-full max-w-md shadow-2xl border border-surface-highlight space-y-4 text-left mx-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary">Create New Playlist</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-subtext hover:text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-subtext mb-1.5">
                Playlist Name
              </label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="My Playlist"
                className="w-full px-3 py-2 rounded-lg bg-surface-highlight text-sm text-primary outline-none border-2 border-transparent focus:border-spotify-green/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-subtext mb-1.5">
                Preferences / Description
              </label>
              <input
                type="text"
                value={playlistDesc}
                onChange={(e) => setPlaylistDesc(e.target.value)}
                placeholder="Chill hits, high energy..."
                className="w-full px-3 py-2 rounded-lg bg-surface-highlight text-sm text-primary outline-none border-2 border-transparent focus:border-spotify-green/50 transition-colors"
              />
            </div>

            {/* Searchable Artist Dropdown */}
            <div className="relative" ref={artistDropdownRef}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-subtext mb-1.5">
                Artist
              </label>
              <div
                onClick={() => setShowArtistDropdown(!showArtistDropdown)}
                className="w-full px-3 py-2 rounded-lg bg-surface-highlight text-sm text-primary cursor-pointer border-2 border-transparent hover:border-spotify-green/50 flex justify-between items-center transition-colors"
              >
                <span className="truncate">
                  {artistId === 'unknown'
                    ? 'Unknown Artist'
                    : artistId
                      ? artistsList.find((a) => a.id === Number(artistId))?.name || 'Select Artist...'
                      : 'Select Artist...'}
                </span>
                <span className="text-xs text-subtext select-none">▼</span>
              </div>

              {showArtistDropdown && (
                <div className="absolute left-0 right-0 mt-1 bg-surface-elevated border border-surface-highlight rounded-lg shadow-2xl z-50 p-2 space-y-2 max-h-60 overflow-hidden flex flex-col">
                  <input
                    type="text"
                    placeholder="Search artist..."
                    value={artistSearch}
                    onChange={(e) => setArtistSearch(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-surface-highlight text-xs text-primary outline-none border border-transparent focus:border-spotify-green/30"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-thin">
                    <div
                      onClick={() => {
                        setArtistId('unknown')
                        setShowArtistDropdown(false)
                        setArtistSearch('')
                      }}
                      className="px-3 py-2 text-xs hover:bg-surface-highlight rounded-md cursor-pointer truncate text-primary flex justify-between items-center border-b border-surface-highlight/30 font-bold text-spotify-green"
                    >
                      <span>Unknown Artist (Choose)</span>
                    </div>

                    {artistsList
                      .filter((a) =>
                        a.name.toLowerCase().includes(artistSearch.toLowerCase())
                      )
                      .map((a) => (
                        <div
                          key={a.id}
                          onClick={() => {
                            setArtistId(String(a.id))
                            setShowArtistDropdown(false)
                            setArtistSearch('')
                          }}
                          className="px-3 py-2 text-xs hover:bg-surface-highlight rounded-md cursor-pointer truncate text-primary flex justify-between items-center"
                        >
                          <span className="truncate mr-2">{a.name}</span>
                          <span className="text-[10px] text-subtext shrink-0">ID: {a.id}</span>
                        </div>
                      ))}
                    {artistsList.filter((a) =>
                      a.name.toLowerCase().includes(artistSearch.toLowerCase())
                    ).length === 0 && (
                        <div className="px-3 py-2 text-xs text-subtext text-center">
                          No matches found
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-full border border-surface-highlight text-sm font-medium hover:bg-surface-highlight transition-colors text-primary cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 rounded-full bg-spotify-green text-accent-text text-sm font-bold hover:bg-spotify-green-hover transition-colors cursor-pointer"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
