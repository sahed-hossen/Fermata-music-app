import { useState, useEffect, useRef } from 'react'
import { Search, X, Play, Music, Flame, TrendingUp, User, Disc } from 'lucide-react'
import { search } from '@/api/search'
import { usePlayerStore } from '@/store/playerStore'
import type { Track, Artist, Album } from '@/types'

interface Props {
  value?: string
  onChange?: (value: string) => void
  onSearch?: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
  autoFocus?: boolean
}

const PLACEHOLDERS = [
  'What do you want to listen to?',
  'Search songs, artists, or albums...',
  'Discover trending music & hits...',
  'Find your favorite tracks...',
]

const FALLBACK_SONGS: Track[] = [
  {
    id: 901,
    title: 'Tum Prem Ho Tum Preet Ho',
    artist_name: 'Surya Raj Kamal',
    album_title: 'RadhaKrishn',
    duration_seconds: 245,
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80',
    album_id: null,
    artist_id: null,
  },
  {
    id: 902,
    title: 'Blinding Lights',
    artist_name: 'The Weeknd',
    album_title: 'After Hours',
    duration_seconds: 200,
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    cover_url: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=300&q=80',
    album_id: null,
    artist_id: null,
  },
  {
    id: 903,
    title: 'Starboy',
    artist_name: 'Daft Punk & The Weeknd',
    album_title: 'Starboy',
    duration_seconds: 230,
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80',
    album_id: null,
    artist_id: null,
  },
  {
    id: 904,
    title: 'Midnight Echoes',
    artist_name: 'Fermata 3D Audio',
    album_title: 'Binaural Sessions',
    duration_seconds: 210,
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=300&q=80',
    album_id: null,
    artist_id: null,
  },
  {
    id: 905,
    title: 'Cruel Summer',
    artist_name: 'Taylor Swift',
    album_title: 'Lover',
    duration_seconds: 178,
    audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    cover_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=300&q=80',
    album_id: null,
    artist_id: null,
  },
]

export default function SearchInput({
  value = '',
  onChange,
  onSearch,
  placeholder,
  debounceMs = 200,
  className = '',
  autoFocus = false,
}: Props) {
  const [localValue, setLocalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [placeholderAnim, setPlaceholderAnim] = useState(true)

  // Live suggestions state
  const [suggestedTracks, setSuggestedTracks] = useState<Track[]>([])
  const [suggestedArtists, setSuggestedArtists] = useState<Artist[]>([])
  const [suggestedAlbums, setSuggestedAlbums] = useState<Album[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const setTrack = usePlayerStore((s) => s.setTrack)
  const setQueue = usePlayerStore((s) => s.setQueue)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Close suggestions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Rotating placeholder reel
  useEffect(() => {
    if (placeholder) return
    const interval = setInterval(() => {
      setPlaceholderAnim(false)
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length)
        setPlaceholderAnim(true)
      }, 200)
    }, 3200)
    return () => clearInterval(interval)
  }, [placeholder])

  // Global Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsFocused(true)
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Fetch or filter live search suggestions
  useEffect(() => {
    const query = localValue.trim().toLowerCase()
    if (!query) {
      setSuggestedTracks([])
      setSuggestedArtists([])
      setSuggestedAlbums([])
      setLoadingSuggestions(false)
      return
    }

    setLoadingSuggestions(true)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)

    suggestTimerRef.current = setTimeout(() => {
      search(query, 5)
        .then((res) => {
          let tracks = res.tracks || []
          let artists = res.artists || []
          let albums = res.albums || []

          if (tracks.length === 0) {
            tracks = FALLBACK_SONGS.filter(
              (s) =>
                s.title.toLowerCase().includes(query) ||
                (s.artist_name && s.artist_name.toLowerCase().includes(query))
            )
          }

          setSuggestedTracks(tracks)
          setSuggestedArtists(artists)
          setSuggestedAlbums(albums)
        })
        .catch(() => {
          const matched = FALLBACK_SONGS.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              (s.artist_name && s.artist_name.toLowerCase().includes(query))
          )
          setSuggestedTracks(matched)
          setSuggestedArtists([])
          setSuggestedAlbums([])
        })
        .finally(() => setLoadingSuggestions(false))
    }, 120)

    return () => {
      if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    }
  }, [localValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setLocalValue(v)
    if (onChange) onChange(v)
  }

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    setLocalValue('')
    setSuggestedTracks([])
    setSuggestedArtists([])
    setSuggestedAlbums([])
    if (onChange) onChange('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsFocused(false)
      if (onSearch) onSearch(localValue)
    }
    if (e.key === 'Escape') {
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  const handlePlayTrack = (e: React.MouseEvent, track: Track) => {
    e.preventDefault()
    e.stopPropagation()
    setQueue(suggestedTracks.length > 0 ? suggestedTracks : [track])
    setTrack(track)
    setIsFocused(false)
  }

  const handleSelectSuggestion = (e: React.MouseEvent, title: string) => {
    e.preventDefault()
    e.stopPropagation()
    setLocalValue(title)
    if (onChange) onChange(title)
    if (onSearch) onSearch(title)
    setIsFocused(false)
  }

  const activePlaceholder = placeholder || PLACEHOLDERS[placeholderIndex]
  const showDropdown = isFocused

  return (
    <div className={`relative group w-full ${className}`} ref={containerRef}>
      {/* Jitter Animated Gradient Glow Border */}
      <div
        className={`absolute -inset-[2px] rounded-full bg-gradient-to-r from-spotify-green via-purple-500 to-blue-500 transition-all duration-500 blur-[3px] ${
          isFocused ? 'opacity-90 scale-[1.01] animate-pulse' : 'opacity-25 group-hover:opacity-45'
        }`}
      />

      {/* Main Bar Wrapper */}
      <div
        className={`relative flex items-center w-full rounded-full bg-[#121218]/95 backdrop-blur-md border transition-all duration-300 shadow-lg ${
          isFocused
            ? 'border-spotify-green/60 bg-black/90 shadow-spotify-green/20 ring-4 ring-spotify-green/15 scale-[1.01]'
            : 'border-white/10 hover:border-white/25 bg-surface-highlight/60'
        }`}
      >
        {/* Search Icon */}
        <div
          className="pl-4 flex items-center justify-center shrink-0 cursor-pointer"
          onMouseDown={(e) => {
            e.preventDefault()
            if (onSearch) onSearch(localValue)
          }}
        >
          <Search
            size={19}
            className={`transition-all duration-300 ${
              isFocused ? 'text-spotify-green scale-110' : 'text-subtext group-hover:text-primary'
            }`}
          />
        </div>

        {/* Text Input Container */}
        <div className="relative flex-1 flex items-center min-w-0">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            autoFocus={autoFocus}
            className="w-full pl-3 pr-10 py-3.5 bg-transparent text-sm text-primary placeholder-transparent outline-none font-medium z-10"
          />

          {/* Animated Placeholder Overlay */}
          {!localValue && (
            <div
              className={`absolute left-3 pointer-events-none text-sm text-subtext/60 truncate transition-all duration-300 ${
                placeholderAnim ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
              }`}
            >
              {activePlaceholder}
            </div>
          )}
        </div>

        {/* Right side controls */}
        <div className="pr-3 flex items-center gap-1.5 shrink-0 z-10">
          {localValue ? (
            <button
              onMouseDown={handleClear}
              className="p-1.5 rounded-full text-subtext hover:text-primary hover:bg-white/10 transition-all transform hover:rotate-90 duration-200 cursor-pointer"
              title="Clear search"
            >
              <X size={15} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold text-subtext/70 bg-white/5 border border-white/10 rounded-md font-mono select-none">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* LIVE AUTOMATIC SONG SUGGESTION DROPDOWN OVERLAY */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-2.5 bg-[#0f0f18]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 p-2 space-y-2 max-h-[380px] overflow-y-auto scrollbar-thin">
          {/* State 1: Input empty — show Trending Search Suggestions */}
          {!localValue.trim() && (
            <div className="p-2 space-y-2">
              <div className="flex items-center gap-1.5 px-2 text-[11px] font-bold text-subtext uppercase tracking-wider select-none">
                <Flame size={13} className="text-spotify-green animate-pulse" />
                <span>Trending Search Suggestions</span>
              </div>

              <div className="space-y-1">
                {FALLBACK_SONGS.map((song) => (
                  <div
                    key={song.id}
                    onMouseDown={(e) => handleSelectSuggestion(e, song.title)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-surface border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {song.cover_url ? (
                          <img src={song.cover_url} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                          <TrendingUp size={14} className="text-spotify-green" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-primary group-hover:text-spotify-green truncate">
                          {song.title}
                        </p>
                        <p className="text-[11px] text-subtext truncate">{song.artist_name}</p>
                      </div>
                    </div>

                    <button
                      onMouseDown={(e) => handlePlayTrack(e, song)}
                      className="w-7 h-7 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-105 shadow-md cursor-pointer ml-2"
                      title="Play now"
                    >
                      <Play size={12} fill="black" className="ml-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* State 2: Searching indicator */}
          {localValue.trim() && loadingSuggestions && (
            <div className="py-6 text-center text-xs text-subtext flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
              <span>Finding matching tracks...</span>
            </div>
          )}

          {/* State 3: Matching Search Suggestions */}
          {localValue.trim() && !loadingSuggestions && (
            <div className="space-y-3 p-1">
              {/* Songs Suggestions */}
              {suggestedTracks.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-subtext uppercase tracking-wider select-none">
                    <Music size={13} className="text-spotify-green" />
                    <span>Songs ({suggestedTracks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {suggestedTracks.map((tr) => (
                      <div
                        key={tr.id}
                        onMouseDown={(e) => handlePlayTrack(e, tr)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-surface border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {tr.cover_url ? (
                              <img src={tr.cover_url} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <Music size={15} className="text-subtext" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-primary group-hover:text-spotify-green truncate">
                              {tr.title}
                            </p>
                            <p className="text-[11px] text-subtext truncate">
                              {tr.artist_name || 'Track'} {tr.album_title ? `· ${tr.album_title}` : ''}
                            </p>
                          </div>
                        </div>

                        {/* Direct Play Button */}
                        <button
                          onMouseDown={(e) => handlePlayTrack(e, tr)}
                          className="w-7 h-7 rounded-full bg-spotify-green hover:bg-spotify-green-hover text-black flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-105 shadow-md cursor-pointer ml-2"
                          title="Play now"
                        >
                          <Play size={12} fill="black" className="ml-0.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Artists Suggestions */}
              {suggestedArtists.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-subtext uppercase tracking-wider select-none">
                    <User size={13} className="text-purple-400" />
                    <span>Artists</span>
                  </div>
                  <div className="space-y-1">
                    {suggestedArtists.map((art) => (
                      <div
                        key={art.id}
                        onMouseDown={(e) => handleSelectSuggestion(e, art.name)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-full bg-surface border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                          <User size={14} className="text-subtext" />
                        </div>
                        <p className="text-xs font-bold text-primary group-hover:text-purple-300 truncate">
                          {art.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Albums Suggestions */}
              {suggestedAlbums.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-bold text-subtext uppercase tracking-wider select-none">
                    <Disc size={13} className="text-blue-400" />
                    <span>Albums</span>
                  </div>
                  <div className="space-y-1">
                    {suggestedAlbums.map((alb) => (
                      <div
                        key={alb.id}
                        onMouseDown={(e) => handleSelectSuggestion(e, alb.title)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-surface border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {alb.cover_url ? (
                            <img src={alb.cover_url} alt="Cover" className="w-full h-full object-cover" />
                          ) : (
                            <Disc size={14} className="text-subtext" />
                          )}
                        </div>
                        <p className="text-xs font-bold text-primary group-hover:text-blue-300 truncate">
                          {alb.title}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results fallback */}
              {suggestedTracks.length === 0 &&
                suggestedArtists.length === 0 &&
                suggestedAlbums.length === 0 && (
                  <div className="py-6 text-center text-xs text-subtext">
                    <p>No matching song suggestions found for "{localValue}"</p>
                    <p className="text-[10px] text-subtext/60 mt-1">Press Enter to run deep search</p>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
