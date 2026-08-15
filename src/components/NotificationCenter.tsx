import { useState, useRef, useEffect } from 'react'
import { Bell, Music, Sparkles, Radio, Info } from 'lucide-react'

export interface NotificationItem {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: 'music' | 'system' | 'spatial' | 'artist'
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'New Track Release',
    message: 'Check out the new binaural 3D remaster of "Midnight Echoes".',
    time: '5m ago',
    read: false,
    type: 'music',
  },
  {
    id: 'n2',
    title: 'Spatial Audio Ready',
    message: '3D Spatial Audio & 10-Band EQ presets have been synchronized.',
    time: '1h ago',
    read: false,
    type: 'spatial',
  },
  {
    id: 'n3',
    title: 'Fermata PWA Ready',
    message: 'Offline listening and web app installation is available.',
    time: '3h ago',
    read: false,
    type: 'system',
  },
]

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  const toggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    )
  }

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'music':
        return <Music size={15} className="text-white/70" />
      case 'spatial':
        return <Sparkles size={15} className="text-white/70" />
      case 'artist':
        return <Radio size={15} className="text-white/70" />
      default:
        return <Info size={15} className="text-white/70" />
    }
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <style>{`
        @keyframes bellSwing {
          0%, 75%, 100% { transform: rotate(0deg); }
          80% { transform: rotate(14deg); }
          85% { transform: rotate(-14deg); }
          90% { transform: rotate(8deg); }
          95% { transform: rotate(-4deg); }
        }
      `}</style>

      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer group"
        title="Notifications"
      >
        <Bell
          size={18}
          className={`transition-transform duration-300 group-hover:rotate-12 ${
            unreadCount > 0 ? 'animate-[bellSwing_4.5s_ease-in-out_infinite]' : ''
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-spotify-green rounded-full animate-pulse shadow-[0_0_8px_rgba(30,215,96,0.6)]" />
        )}
      </button>

      {/* Sleek Minimal Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-[#121216]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Minimal Header */}
          <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-bold text-white tracking-wide">Notifications</span>
            {notifications.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-white/50">
                <button
                  onClick={markAllAsRead}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Mark all read
                </button>
                <span>•</span>
                <button
                  onClick={clearAll}
                  className="hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06] scrollbar-thin">
            {notifications.length > 0 ? (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleRead(item.id)}
                  className={`px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer hover:bg-white/[0.04] ${
                    item.read ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  <div className="mt-0.5 shrink-0 text-white/60">
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-white truncate">{item.title}</p>
                      <span className="text-[10px] text-white/40 shrink-0">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-white/60 leading-normal mt-0.5 line-clamp-2">
                      {item.message}
                    </p>
                  </div>

                  {!item.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-spotify-green shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center px-4 text-white/40">
                <p className="text-xs font-medium">No new notifications</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
