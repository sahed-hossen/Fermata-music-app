import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Music, Search, Disc3 } from 'lucide-react'
import CardGrid from '@/components/CardGrid'
import Card from '@/components/Card'
import TrackList from '@/components/TrackList'
import SearchInput from '@/components/SearchInput'
import { search } from '@/api/search'
import { usePlayerStore } from '@/store/playerStore'
import type { Track, SearchResponse } from '@/types'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [suggestions, setSuggestions] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [committed, setCommitted] = useState(false)
  const [recentSearchPlayed, setRecentSearchPlayed] = useState<Track[]>([])

  const setTrack = usePlayerStore((s) => s.setTrack)
  const setQueue = usePlayerStore((s) => s.setQueue)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    const stored = localStorage.getItem('fermata-search-played')
    if (stored) {
      try {
        setRecentSearchPlayed(JSON.parse(stored))
      } catch {
        // silent
      }
    }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSuggestions(null)
      setShowDropdown(false)
      return
    }
    try {
      const res = await search(q)
      setSuggestions(res)
      setShowDropdown(true)
    } catch {
      setSuggestions(null)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    setCommitted(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(v)
    }, 300)
  }

  const handleSubmit = async (q?: string) => {
    const searchQuery = q ?? query
    if (!searchQuery.trim()) return
    setShowDropdown(false)
    setCommitted(true)
    setLoading(true)
    try {
      const res = await search(searchQuery)
      setResults(res)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setShowDropdown(false)
      inputRef.current?.blur()
    }
  }

  const handleClear = () => {
    setQuery('')
    setResults(null)
    setSuggestions(null)
    setShowDropdown(false)
    setCommitted(false)
    inputRef.current?.focus()
  }

  const handleTrackPlay = (track: Track) => {
    setRecentSearchPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id)
      const updated = [track, ...filtered].slice(0, 10)
      localStorage.setItem('fermata-search-played', JSON.stringify(updated))
      return updated
    })
  }

  const handleRemoveTrack = (trackId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setRecentSearchPlayed((prev) => {
      const updated = prev.filter((t) => t.id !== trackId)
      localStorage.setItem('fermata-search-played', JSON.stringify(updated))
      return updated
    })
  }

  const suggestionItems: { type: string; id: number; title: string; subtitle: string; initial: string }[] = []
  if (suggestions) {
    suggestions.tracks.slice(0, 4).forEach((t) => {
      suggestionItems.push({
        type: 'Song',
        id: t.id,
        title: t.title,
        subtitle: `Song · ${t.artist_name || 'Unknown Artist'}`,
        initial: t.title.charAt(0).toUpperCase(),
      })
    })
    suggestions.albums.slice(0, 2).forEach((a) => {
      suggestionItems.push({
        type: 'Album',
        id: a.id,
        title: a.title,
        subtitle: `Album · ${a.artist_name || 'Unknown Artist'}`,
        initial: a.title.charAt(0).toUpperCase(),
      })
    })
    suggestions.artists.slice(0, 2).forEach((a) => {
      suggestionItems.push({
        type: 'Artist',
        id: a.id,
        title: a.name,
        subtitle: 'Artist',
        initial: a.name.charAt(0).toUpperCase(),
      })
    })
  }

  const categories = [
    { name: 'Hits', color: 'from-amber-500 to-orange-600' },
    { name: 'Pop', color: 'from-pink-500 to-rose-600' },
    { name: 'Hip-Hop', color: 'from-indigo-500 to-blue-600' },
    { name: 'Rock', color: 'from-red-500 to-rose-700' },
    { name: 'Dance', color: 'from-emerald-500 to-teal-600' },
    { name: 'R&B', color: 'from-purple-500 to-violet-700' },
    { name: 'Country', color: 'from-amber-600 to-yellow-700' },
    { name: 'Latin', color: 'from-rose-500 to-pink-600' },
    { name: 'Classical', color: 'from-slate-600 to-zinc-700' },
    { name: 'Jazz', color: 'from-cyan-600 to-sky-700' },
    { name: 'Chill', color: 'from-sky-400 to-blue-500' },
    { name: 'Workout', color: 'from-orange-500 to-red-600' },
  ]

  return (
    <div className="relative min-h-screen bg-base text-primary -m-6 pb-32 overflow-visible transition-colors duration-200">
      {/* Top Search Bar */}
      <div className="sticky top-0 z-40 pt-6 pb-4 px-6 bg-base/90 backdrop-blur-md">
        <div className="relative max-w-2xl mx-auto">
          <SearchInput
            value={query}
            onChange={(val) => {
              setQuery(val)
              setCommitted(false)
              if (val.trim()) {
                fetchSuggestions(val)
              } else {
                setSuggestions(null)
                setShowDropdown(false)
              }
            }}
          />

          {/* Suggestions Dropdown */}
          {showDropdown && suggestionItems.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border-theme rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              {query.trim() && (
                <div className="border-b border-border-theme py-1.5">
                  <button
                    onClick={() => handleSubmit(query)}
                    className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-surface-highlight transition-colors cursor-pointer"
                  >
                    <Search size={14} className="text-subtext shrink-0" />
                    <span className="text-sm text-primary font-medium">{query}</span>
                  </button>
                </div>
              )}

              <div className="py-1.5 max-h-[400px] overflow-y-auto scrollbar-thin">
                {suggestionItems.map((item, idx) => (
                  <button
                    key={`${item.type}-${item.id}-${idx}`}
                    onClick={() => {
                      if (item.type === 'Song') {
                        const track = suggestions?.tracks.find((t) => t.id === item.id)
                        if (track) {
                          setQueue(suggestions?.tracks || [])
                          setTrack(track)
                          handleTrackPlay(track)
                        }
                      }
                      setQuery(item.title)
                      handleSubmit(item.title)
                    }}
                    className="flex items-center gap-3.5 w-full px-4 py-2.5 text-left hover:bg-surface-highlight transition-colors cursor-pointer"
                  >
                    <div className={`w-9 h-9 flex items-center justify-center shrink-0 border border-border-theme bg-surface-elevated ${item.type === 'Artist' ? 'rounded-full' : 'rounded-lg'
                      }`}>
                      {item.type === 'Song' && <Music size={16} className="text-subtext" />}
                      {item.type === 'Album' && <Disc3 size={16} className="text-subtext" />}
                      {item.type === 'Artist' && (
                        <span className="text-xs font-bold text-subtext">{item.initial}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-primary truncate">{item.title}</p>
                      <p className="text-xs text-subtext truncate">{item.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 relative z-10">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {committed && results && !loading && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {results.tracks.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 text-primary">Songs</h2>
                <TrackList tracks={results.tracks} onTrackPlay={handleTrackPlay} />
              </section>
            )}

            {results.albums.length > 0 && (
              <CardGrid title="Albums">
                {results.albums.map((album) => (
                  <Card
                    key={album.id}
                    title={album.title}
                    subtitle={album.artist_name || 'Unknown Artist'}
                    href={`/album/${album.id}`}
                  />
                ))}
              </CardGrid>
            )}

            {results.artists.length > 0 && (
              <CardGrid title="Artists">
                {results.artists.map((artist) => (
                  <Card
                    key={artist.id}
                    title={artist.name}
                    subtitle="Artist"
                    href={`/artist/${artist.id}`}
                    isRound
                  />
                ))}
              </CardGrid>
            )}

            {results.tracks.length === 0 &&
              results.albums.length === 0 &&
              results.artists.length === 0 && (
                <div className="py-12 text-center text-subtext">
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-sm mt-1">Try a different search term</p>
                </div>
              )}
          </div>
        )}

        {!committed && !loading && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold mb-5 tracking-tight text-primary">Browse Categories</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => {
                    setQuery(cat.name)
                    handleSubmit(cat.name)
                  }}
                  className={`relative h-28 rounded-2xl bg-gradient-to-br ${cat.color} overflow-hidden cursor-pointer shadow-sm hover:scale-[1.02] transition-all p-4 text-left group`}
                >
                  <span className="absolute bottom-4 left-4 text-white font-bold text-lg drop-shadow-md">
                    {cat.name}
                  </span>
                </button>
              ))}
            </div>

            {recentSearchPlayed.length > 0 && (
              <section className="animate-in fade-in duration-300">
                <h2 className="text-xl font-bold mb-4 text-primary">Recent Searches</h2>
                <div className="space-y-1">
                  {recentSearchPlayed.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => {
                        setQueue([track])
                        setTrack(track)
                      }}
                      className="group flex items-center justify-between px-4 py-3 rounded-xl hover:bg-surface-highlight transition-colors cursor-pointer border border-transparent hover:border-border-theme"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-surface-elevated border border-border-theme flex items-center justify-center shrink-0">
                          <Music size={16} className="text-subtext" />
                        </div>
                        <div className="min-w-0 font-sans">
                          <p className="text-sm font-bold truncate text-primary group-hover:text-spotify-green transition-colors">
                            {track.title}
                          </p>
                          <p className="text-xs text-subtext truncate">
                            {track.artist_name || 'Unknown Artist'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleRemoveTrack(track.id, e)}
                        className="p-1.5 rounded-full text-subtext hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Remove from history"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {recentSearchPlayed.length === 0 && (
              <div className="py-16 text-center">
                <Search size={44} className="mx-auto text-subtext/40 mb-3" />
                <p className="text-lg font-bold text-primary">Search for music</p>
                <p className="text-sm mt-1 text-subtext">Find your favorite songs, albums, and artists</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
