import { Play, Music } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  title: string
  subtitle?: string
  imageUrl?: string | null
  href?: string
  onPlay?: () => void
  isRound?: boolean
}

export default function Card({ title, subtitle, imageUrl, href, onPlay, isRound }: Props) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (href) navigate(href)
  }

  return (
    <button
      onClick={handleClick}
      className="group app-card rounded-2xl p-4 transition-all duration-300 cursor-pointer text-left w-full"
    >
      <div className="relative mb-3">
        <div
          className={`aspect-square bg-surface-elevated flex items-center justify-center overflow-hidden border border-border-theme shadow-sm ${
            isRound ? 'rounded-full' : 'rounded-xl'
          }`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <Music size={42} className="text-subtext/60" />
          )}
        </div>
        {onPlay && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPlay()
            }}
            className="absolute bottom-2 right-2 w-10 h-10 bg-spotify-green rounded-full flex items-center justify-center shadow-md opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 hover:scale-105 hover:bg-spotify-green-hover"
          >
            <Play size={18} className="text-accent-text ml-0.5" fill="currentColor" />
          </button>
        )}
      </div>
      <p className="text-sm font-bold truncate text-primary leading-snug">{title}</p>
      {subtitle && (
        <p className="text-xs text-subtext mt-1 truncate">{subtitle}</p>
      )}
    </button>
  )
}
