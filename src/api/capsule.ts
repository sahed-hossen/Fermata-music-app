import { apiRequest } from './client'

export interface SoundCapsuleArtist {
  id: number
  name: string
  play_count: number
  percentile: number
  avatar_url?: string
}

export interface SoundCapsuleTrack {
  id: number
  title: string
  artist_name: string
  play_count: number
  cover_url?: string
}

export interface SoundCapsuleBreakdown {
  label: string
  percentage: number
  color: string
}

export interface SoundCapsuleData {
  year_month: string
  month_name: string
  is_premium: boolean
  total_listening_minutes: number
  national_avg_minutes: number
  listening_streak_days: number
  streak_artist_name: string
  persona_tag: string
  persona_description: string
  top_artists: SoundCapsuleArtist[]
  top_tracks: SoundCapsuleTrack[]
  repeated_listens: {
    artist_name: string
    track_title: string
    repeats: number
  }[]
  breakdown: SoundCapsuleBreakdown[]
  unlikely_pairings: {
    genre_a: string
    genre_b: string
    description: string
  }
  throwback: {
    period: string
    artist_name: string
    track_title: string
  }
}

// Generate months list from January 2023 to current month
export function getAvailableCapsuleMonths(): { year_month: string; label: string }[] {
  const months: { year_month: string; label: string }[] = []
  const start = new Date(2023, 0, 1)
  const now = new Date()

  let curr = new Date(now.getFullYear(), now.getMonth(), 1)
  while (curr >= start) {
    const ym = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`
    const label = curr.toLocaleString('default', { month: 'long', year: 'numeric' })
    months.push({ year_month: ym, label })
    curr.setMonth(curr.getMonth() - 1)
  }
  return months
}

// Fetch Capsule Data from backend API with rich fallback simulation
export async function getSoundCapsule(yearMonth?: string): Promise<SoundCapsuleData> {
  const targetYm = yearMonth || getAvailableCapsuleMonths()[0].year_month

  try {
    const data = await apiRequest<SoundCapsuleData>(`/capsule/monthly?year_month=${targetYm}`)
    return data
  } catch (err) {
    // Return rich simulated capsule statistics for demonstration when backend endpoint is setting up
    const available = getAvailableCapsuleMonths()
    const found = available.find((m) => m.year_month === targetYm)
    const monthName = found ? found.label : 'July 2026'

    return {
      year_month: targetYm,
      month_name: monthName,
      is_premium: true,
      total_listening_minutes: 3840,
      national_avg_minutes: 1950,
      listening_streak_days: 14,
      streak_artist_name: 'The Weeknd',
      persona_tag: 'The Genre Hopper',
      persona_description: 'You effortlessly float between synth-pop, ambient chill, and energetic hip-hop beats.',
      top_artists: [
        { id: 1, name: 'The Weeknd', play_count: 142, percentile: 1.5 },
        { id: 2, name: 'Daft Punk', play_count: 98, percentile: 2.8 },
        { id: 3, name: 'Taylor Swift', play_count: 76, percentile: 4.1 },
        { id: 4, name: 'Coldplay', play_count: 64, percentile: 5.0 },
        { id: 5, name: 'Billie Eilish', play_count: 51, percentile: 6.2 },
      ],
      top_tracks: [
        { id: 101, title: 'Blinding Lights', artist_name: 'The Weeknd', play_count: 68 },
        { id: 102, title: 'One More Time', artist_name: 'Daft Punk', play_count: 45 },
        { id: 103, title: 'Cruel Summer', artist_name: 'Taylor Swift', play_count: 38 },
        { id: 104, title: 'Yellow', artist_name: 'Coldplay', play_count: 31 },
        { id: 105, title: 'Bad Guy', artist_name: 'Billie Eilish', play_count: 27 },
      ],
      repeated_listens: [
        { artist_name: 'The Weeknd', track_title: 'Blinding Lights', repeats: 68 },
        { artist_name: 'Daft Punk', track_title: 'One More Time', repeats: 45 },
      ],
      breakdown: [
        { label: 'Synthwave & Pop', percentage: 42, color: 'bg-purple-500' },
        { label: 'Electronic & Dance', percentage: 28, color: 'bg-blue-500' },
        { label: 'Alternative Rock', percentage: 18, color: 'bg-emerald-500' },
        { label: 'Ambient & Lo-Fi', percentage: 12, color: 'bg-amber-500' },
      ],
      unlikely_pairings: {
        genre_a: 'Heavy Synthwave',
        genre_b: 'Acoustic Folk',
        description: 'You listened to heavy neon synthwave right before calming acoustic folk tunes!',
      },
      throwback: {
        period: '6 months ago',
        artist_name: 'Daft Punk',
        track_title: 'Digital Love',
      },
    }
  }
}
