import { useRef, useEffect, useCallback, useState } from 'react'
import { Volume2, VolumeX, Music, Play, Pause, Sparkles, Sliders, Maximize2, SkipBack, SkipForward, Coffee } from 'lucide-react'
import { usePlayerStore } from '@/store/playerStore'
import { getTrackAudioUrl, getTrack } from '@/api/tracks'
import { addRecentlyPlayed, getPlayerState, updatePlayerState } from '@/api/player'
import { useAuthStore } from '@/store/authStore'
import { API_BASE } from '@/api/client'
import { addToOfflineTracks } from '@/utils/offlineCache'
import PlayerControls from './PlayerControls'
import Hls from 'hls.js'

const AUDIO_CACHE = 'fermata-audio-cache-v1'

class CustomKeyLoader extends (Hls as any).DefaultConfig.loader {
  async load(context: any, config: any, callbacks: any) {
    const isKey = context.url && context.url.includes('/key')
    const isPlaylist = context.url && context.url.includes('.m3u8')

    if (isKey || isPlaylist) {
      try {
        const cache = await caches.open(AUDIO_CACHE)
        const cachedResponse = await cache.match(context.url)

        if (cachedResponse) {
          console.log(`[HLS Cache] Serving from cache: ${context.url}`)
          if (isKey) {
            const arrayBuffer = await cachedResponse.arrayBuffer()
            const stats = {
              trequest: performance.now(),
              tfirst: performance.now(),
              tload: performance.now(),
              loaded: arrayBuffer.byteLength,
              total: arrayBuffer.byteLength,
            }
            callbacks.onSuccess({ url: context.url, data: arrayBuffer }, stats, context)
            return
          } else {
            const text = await cachedResponse.text()
            const stats = {
              trequest: performance.now(),
              tfirst: performance.now(),
              tload: performance.now(),
              loaded: text.length,
              total: text.length,
            }
            callbacks.onSuccess({ url: context.url, data: text }, stats, context)
            return
          }
        }
      } catch (err) {
        console.warn('[HLS Cache] Cache lookup failed in CustomKeyLoader:', err)
      }
    }

    if (context.url && context.url.includes('/key')) {
      console.log('[CustomKeyLoader] Intercepted key request URL:', context.url)
      const activeBase = API_BASE.replace(/\/$/, '')
      if (!context.url.startsWith(activeBase)) {
        try {
          const urlObj = new URL(context.url)
          const activeUrlObj = new URL(activeBase)
          urlObj.protocol = activeUrlObj.protocol
          urlObj.host = activeUrlObj.host
          const original = context.url
          context.url = urlObj.toString()
          console.log('[CustomKeyLoader] Rewrote URL from:', original, 'to:', context.url)
        } catch (err) {
          const pathStart = context.url.indexOf('/tracks/')
          if (pathStart !== -1) {
            const original = context.url
            context.url = activeBase + context.url.substring(pathStart)
            console.log('[CustomKeyLoader] Fallback rewrote URL from:', original, 'to:', context.url)
          }
        }
      } else {
        console.log('[CustomKeyLoader] URL already matches active base. No rewrite needed.')
      }
    }

    const originalSuccess = callbacks.onSuccess
    callbacks.onSuccess = async (response: any, stats: any, ctx: any) => {
      if (isKey || isPlaylist) {
        try {
          const cache = await caches.open(AUDIO_CACHE)
          let cacheResponse
          if (isKey) {
            cacheResponse = new Response(response.data, {
              headers: { 'Content-Type': 'application/octet-stream' },
            })
          } else {
            cacheResponse = new Response(response.data, {
              headers: { 'Content-Type': 'application/vnd.apple.mpegurl' },
            })
          }
          await cache.put(ctx.url, cacheResponse)
          console.log(`[HLS Cache] Successfully cached: ${ctx.url}`)
        } catch (err) {
          console.warn('[HLS Cache] Failed to write key/playlist to cache:', err)
        }
      }
      originalSuccess(response, stats, ctx)
    }

    super.load(context, config, callbacks)
  }
}


class CachedFragmentLoader extends (Hls as any).DefaultConfig.loader {
  async load(context: any, config: any, callbacks: any) {
    const isSegment = context.url && context.url.includes('.ts')

    if (isSegment) {
      try {
        const cache = await caches.open(AUDIO_CACHE)
        const cachedResponse = await cache.match(context.url)

        if (cachedResponse) {
          const arrayBuffer = await cachedResponse.arrayBuffer()
          const stats = {
            trequest: performance.now(),
            tfirst: performance.now(),
            tload: performance.now(),
            loaded: arrayBuffer.byteLength,
            total: arrayBuffer.byteLength,
          }
          callbacks.onSuccess({ url: context.url, data: arrayBuffer }, stats, context)
          return
        }
      } catch (err) {
        console.warn('[HLS Cache] Cache lookup failed:', err)
      }
    }

    const originalSuccess = callbacks.onSuccess
    callbacks.onSuccess = async (response: any, stats: any, ctx: any) => {
      if (isSegment) {
        try {
          const cache = await caches.open(AUDIO_CACHE)
          const cacheResponse = new Response(response.data, {
            headers: { 'Content-Type': 'video/mp2t' },
          })
          await cache.put(ctx.url, cacheResponse)
        } catch (err) {
          console.warn('[HLS Cache] Failed to write segment to cache:', err)
        }
      }
      originalSuccess(response, stats, ctx)
    }

    super.load(context, config, callbacks)
  }
}

export default function NowPlayingBar() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const shouldRestoreProgress = useRef(false)
  const isInitialRestoring = useRef(true)
  const [showMobileVolume, setShowMobileVolume] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // --- Web Audio 3D Spatial Audio Refs ---
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const normalGainRef = useRef<GainNode | null>(null)
  const spatialGainRef = useRef<GainNode | null>(null)
  const pannerRef = useRef<PannerNode | null>(null)
  const dryGainRef = useRef<GainNode | null>(null)
  const convolverRef = useRef<ConvolverNode | null>(null)
  const wetGainRef = useRef<GainNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const eqFiltersRef = useRef<BiquadFilterNode[]>([])
  const preampRef = useRef<GainNode | null>(null)
  // --- Lofi "Vintage Cassette" DSP Chain Refs ---
  const lofiChainRef = useRef<{
    highpass: BiquadFilterNode
    lowpass: BiquadFilterNode
    waveshaper: WaveShaperNode
    delay: DelayNode
    lfo: OscillatorNode
    lfoGain: GainNode
  } | null>(null)

  const is3DEnabled = usePlayerStore((s) => s.is3DEnabled)
  const is3DReverbEnabled = usePlayerStore((s) => s.is3DReverbEnabled)
  const orbitSpeedSeconds = usePlayerStore((s) => s.orbitSpeedSeconds)
  const orbitHeightPercent = usePlayerStore((s) => s.orbitHeightPercent)
  const eqGains = usePlayerStore((s) => s.eqGains)
  const eqPreamp = usePlayerStore((s) => s.eqPreamp)
  const isEQEnabled = usePlayerStore((s) => s.isEQEnabled)
  const set3DModalOpen = usePlayerStore((s) => s.set3DModalOpen)
  const setEQModalOpen = usePlayerStore((s) => s.setEQModalOpen)
  const isLofiEnabled = usePlayerStore((s) => s.isLofiEnabled)
  const setLofiEnabled = usePlayerStore((s) => s.setLofiEnabled)

  const initSpatialEngine = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audioContextRef.current) return

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioContextClass({ latencyHint: 'interactive' })
      audioContextRef.current = ctx

      // 1. Create Media Source
      const source = ctx.createMediaElementSource(audio)
      sourceNodeRef.current = source

      // 2. Create Preamp Gain Node (Converts dB to linear multiplier)
      const preamp = ctx.createGain()
      const initialPreampDb = usePlayerStore.getState().eqPreamp
      const activePreamp = usePlayerStore.getState().isEQEnabled ? initialPreampDb : 0
      preamp.gain.value = Math.pow(10, activePreamp / 20)
      preampRef.current = preamp

      // --- Create 10-Band Graphic Equalizer Filter Chain ---
      const bands = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
      const filters: BiquadFilterNode[] = []
      const currentGains = usePlayerStore.getState().eqGains
      const active = usePlayerStore.getState().isEQEnabled

      for (let i = 0; i < 10; i++) {
        const filter = ctx.createBiquadFilter()
        if (i === 0) {
          filter.type = 'lowshelf'
        } else if (i === 9) {
          filter.type = 'highshelf'
        } else {
          filter.type = 'peaking'
          filter.Q.value = 1.0
        }
        filter.frequency.value = bands[i]
        filter.gain.value = active ? (currentGains[i] ?? 0) : 0
        filters.push(filter)
      }
      eqFiltersRef.current = filters

      // 3. Normal Path Gain
      const normalGain = ctx.createGain()
      normalGain.gain.value = usePlayerStore.getState().is3DEnabled ? 0.0 : 1.0
      normalGainRef.current = normalGain

      // 4. Spatial Path Gain
      const spatialGain = ctx.createGain()
      spatialGain.gain.value = usePlayerStore.getState().is3DEnabled ? 1.0 : 0.0
      spatialGainRef.current = spatialGain

      // 5. Panner Node (HRTF)
      const panner = ctx.createPanner()
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'inverse'
      panner.refDistance = 1
      panner.maxDistance = 50
      panner.rolloffFactor = 1
      pannerRef.current = panner

      // 6. Dry Gain Node
      const dryGain = ctx.createGain()
      dryGain.gain.value = 1.0
      dryGainRef.current = dryGain

      // 7. Reverb Convolver Node
      const convolver = ctx.createConvolver()
      // Build synthetic impulse response exactly like the original code
      const rate = ctx.sampleRate
      const duration = 2.2
      const decay = 3.2
      const length = rate * duration
      const impulse = ctx.createBuffer(2, length, rate)
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch)
        for (let i = 0; i < length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
        }
      }
      convolver.buffer = impulse
      convolverRef.current = convolver

      // 8. Wet Gain Node (Reverb Volume)
      const wetGain = ctx.createGain()
      wetGain.gain.value = usePlayerStore.getState().is3DReverbEnabled ? 0.25 : 0.0
      wetGainRef.current = wetGain

      // 9. Analyser Node
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
        ; (window as any).fermataAnalyser = analyser

      // --- Build Lofi "Vintage Cassette Tape" DSP Chain ---
      // 1. Bandpass EQ: High-pass (200Hz) to remove muddy sub-bass
      const lofiHP = ctx.createBiquadFilter()
      lofiHP.type = 'highpass'
      lofiHP.frequency.value = 200
      lofiHP.Q.value = 0.7

      // 2. Bandpass EQ: Low-pass (2500Hz) to cut harsh highs
      const lofiLP = ctx.createBiquadFilter()
      lofiLP.type = 'lowpass'
      lofiLP.frequency.value = 2500
      lofiLP.Q.value = 0.7

      // 3. Tape Saturation: Subtle soft-clipping WaveShaper for analog warmth
      const waveshaper = ctx.createWaveShaper()
      const curveLen = 44100
      const curve = new Float32Array(curveLen)
      for (let i = 0; i < curveLen; i++) {
        const x = (i * 2) / curveLen - 1
        // Soft tanh-style saturation — gentle warmth, not harsh distortion
        curve[i] = (Math.PI + 3.5) * x / (Math.PI + 3.5 * Math.abs(x))
      }
      waveshaper.curve = curve
      waveshaper.oversample = '2x'

      // 4. Tape Wobble (Wow & Flutter): Oscillator-modulated DelayNode
      const wobbleDelay = ctx.createDelay(0.1)
      wobbleDelay.delayTime.value = 0.03

      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 1.5

      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.002

      // Internal chain: HP -> LP -> WaveShaper -> Delay
      lofiHP.connect(lofiLP)
      lofiLP.connect(waveshaper)
      waveshaper.connect(wobbleDelay)

      // LFO modulates the delay time for tape wobble
      lfo.connect(lfoGain)
      lfoGain.connect(wobbleDelay.delayTime)

      lofiChainRef.current = {
        highpass: lofiHP,
        lowpass: lofiLP,
        waveshaper,
        delay: wobbleDelay,
        lfo,
        lfoGain,
      }

      // --- Connect Graph (Source -> [Lofi Chain if active] -> Preamp -> EQ Chain -> Splits) ---
      const lofiActive = usePlayerStore.getState().isLofiEnabled
      if (lofiActive) {
        source.connect(lofiHP)
        wobbleDelay.connect(preamp)
        lfo.start()
        audio.playbackRate = 0.9
        ;(audio as any).preservesPitch = false
        ;(audio as any).mozPreservesPitch = false
        ;(audio as any).webkitPreservesPitch = false
      } else {
        source.connect(preamp)
        audio.playbackRate = 1.0
      }

      preamp.connect(filters[0])
      for (let i = 0; i < 9; i++) {
        filters[i].connect(filters[i + 1])
      }

      filters[9].connect(normalGain)
      filters[9].connect(spatialGain)

      normalGain.connect(ctx.destination)

      // source -> panner -> [dry to destination] + [wet through convolver to destination]
      spatialGain.connect(panner)

      panner.connect(dryGain)
      panner.connect(convolver)

      convolver.connect(wetGain)

      dryGain.connect(analyser)
      wetGain.connect(analyser)

      analyser.connect(ctx.destination)
    } catch (err) {
      console.error('Failed to initialize spatial audio engine:', err)
    }
  }, [])

  const resumeAudioContext = useCallback(() => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch((err) => {
        console.warn('AudioContext resume failed:', err)
      })
    }
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      const isMobileScreen = window.innerWidth < 768
      setIsMobile(isMobileUA || isMobileScreen)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const progressMs = usePlayerStore((s) => s.progressMs)
  const durationMs = usePlayerStore((s) => s.durationMs)
  const shuffle = usePlayerStore((s) => s.shuffle)
  const repeatMode = usePlayerStore((s) => s.repeatMode)

  const setIsPlaying = usePlayerStore((s) => s.setIsPlaying)
  const setProgressMs = usePlayerStore((s) => s.setProgressMs)
  const setDurationMs = usePlayerStore((s) => s.setDurationMs)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const playNext = usePlayerStore((s) => s.playNext)
  const token = useAuthStore((s) => s.token)

  // --- Web Audio State Syncer (3D Mode) ---
  useEffect(() => {
    if (!audioContextRef.current) {
      if (is3DEnabled) {
        initSpatialEngine()
      } else {
        return
      }
    }
    const ctx = audioContextRef.current
    if (!ctx) return

    resumeAudioContext()

    const now = ctx.currentTime
    const normalGain = normalGainRef.current
    const spatialGain = spatialGainRef.current

    if (normalGain && spatialGain) {
      normalGain.gain.setValueAtTime(normalGain.gain.value, now)
      normalGain.gain.linearRampToValueAtTime(is3DEnabled ? 0.0 : 1.0, now + 0.05)

      spatialGain.gain.setValueAtTime(spatialGain.gain.value, now)
      spatialGain.gain.linearRampToValueAtTime(is3DEnabled ? 1.0 : 0.0, now + 0.05)
    }
  }, [is3DEnabled, initSpatialEngine, resumeAudioContext])

  // --- Web Audio State Syncer (Reverb) ---
  useEffect(() => {
    if (!audioContextRef.current) return
    const ctx = audioContextRef.current
    const wetGain = wetGainRef.current
    if (wetGain) {
      const now = ctx.currentTime
      wetGain.gain.setValueAtTime(wetGain.gain.value, now)
      wetGain.gain.linearRampToValueAtTime(is3DReverbEnabled ? 0.25 : 0.0, now + 0.05)
    }
  }, [is3DReverbEnabled])

  // --- Web Audio Position Update Loop (Orbit) ---
  useEffect(() => {
    let animationFrameId: number
    let angle = (window as any).fermata3DAngle || 0
    let lastTs = performance.now()

    const tick = (ts: number) => {
      const dt = (ts - lastTs) / 1000
      lastTs = ts

      const ctx = audioContextRef.current
      const panner = pannerRef.current

      if (isPlaying) {
        const revPerSec = 1 / orbitSpeedSeconds
        angle += dt * revPerSec * Math.PI * 2
        if (angle > Math.PI * 2) {
          angle -= Math.PI * 2
        }
      }

      const radius = 3
      const heightAmount = orbitHeightPercent / 100

      let x = 0
      let y = 0
      let z = -0.001

      if (is3DEnabled) {
        x = Math.cos(angle) * radius
        z = Math.sin(angle) * radius
        y = Math.sin(angle * 2) * heightAmount * radius * 0.6
      }

      if (panner && ctx) {
        if (panner.positionX) {
          panner.positionX.setValueAtTime(x, ctx.currentTime)
          panner.positionY.setValueAtTime(y, ctx.currentTime)
          panner.positionZ.setValueAtTime(z, ctx.currentTime)
        } else {
          ; (panner as any).setPosition(x, y, z)
        }
      }

      ; (window as any).fermata3DAngle = angle
        ; (window as any).fermata3DX = x
        ; (window as any).fermata3DY = y
        ; (window as any).fermata3DZ = z

      animationFrameId = requestAnimationFrame(tick)
    }

    animationFrameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [is3DEnabled, isPlaying, orbitSpeedSeconds, orbitHeightPercent])

  // --- Web Audio State Syncer (Equalizer Filters) ---
  useEffect(() => {
    if (!audioContextRef.current) return
    const ctx = audioContextRef.current
    const filters = eqFiltersRef.current
    if (filters && filters.length === 10) {
      const now = ctx.currentTime
      for (let i = 0; i < 10; i++) {
        const filter = filters[i]
        if (filter) {
          const targetGain = isEQEnabled ? (eqGains[i] ?? 0) : 0
          filter.gain.setValueAtTime(filter.gain.value, now)
          // Ramping smoothly over 50ms to prevent pops/clicks on drag/toggle
          filter.gain.linearRampToValueAtTime(targetGain, now + 0.05)
        }
      }
    }
  }, [eqGains, isEQEnabled])

  // --- Web Audio State Syncer (Equalizer Preamp) ---
  useEffect(() => {
    if (!audioContextRef.current) return
    const ctx = audioContextRef.current
    const preamp = preampRef.current
    if (preamp) {
      const now = ctx.currentTime
      const targetPreampDb = isEQEnabled ? eqPreamp : 0
      const linearGain = Math.pow(10, targetPreampDb / 20)
      preamp.gain.setValueAtTime(preamp.gain.value, now)
      // Ramping smoothly over 50ms to prevent pops/clicks on drag/toggle
      preamp.gain.linearRampToValueAtTime(linearGain, now + 0.05)
    }
  }, [eqPreamp, isEQEnabled])

  // --- Web Audio State Syncer (Lofi "Vintage Cassette" Mode) ---
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // If the spatial engine hasn't been initialized yet, just set playbackRate
    if (!audioContextRef.current) {
      audio.playbackRate = isLofiEnabled ? 0.9 : 1.0
      ;(audio as any).preservesPitch = !isLofiEnabled
      ;(audio as any).mozPreservesPitch = !isLofiEnabled
      ;(audio as any).webkitPreservesPitch = !isLofiEnabled
      return
    }

    const ctx = audioContextRef.current
    const source = sourceNodeRef.current
    const preamp = preampRef.current
    const chain = lofiChainRef.current
    if (!ctx || !source || !preamp || !chain) return

    resumeAudioContext()

    try {
      // Disconnect source from everything first
      source.disconnect()

      if (isLofiEnabled) {
        // Route: source -> HP -> LP -> WaveShaper -> Delay(wobble) -> preamp
        source.connect(chain.highpass)
        chain.delay.connect(preamp)

        // Start the wobble LFO oscillator (re-create if already stopped)
        try {
          chain.lfo.start()
        } catch (_) {
          // Oscillator was already started or stopped — recreate it
          const newLfo = ctx.createOscillator()
          newLfo.type = 'sine'
          newLfo.frequency.value = 1.5
          newLfo.connect(chain.lfoGain)
          newLfo.start()
          chain.lfo = newLfo
        }

        audio.playbackRate = 0.9
        ;(audio as any).preservesPitch = false
        ;(audio as any).mozPreservesPitch = false
        ;(audio as any).webkitPreservesPitch = false
      } else {
        // Bypass entire lofi chain: source -> preamp directly
        try { chain.highpass.disconnect() } catch (_) { /* ok */ }
        try { chain.delay.disconnect() } catch (_) { /* ok */ }

        // Stop the LFO oscillator to free resources
        try {
          chain.lfo.stop()
        } catch (_) { /* already stopped */ }

        source.connect(preamp)
        audio.playbackRate = 1.0
        ;(audio as any).preservesPitch = true
        ;(audio as any).mozPreservesPitch = true
        ;(audio as any).webkitPreservesPitch = true
      }
    } catch (err) {
      console.error('[Lofi Mode] Failed to re-route cassette tape chain:', err)
    }
  }, [isLofiEnabled, resumeAudioContext])

  // Load player state on page mount / login
  useEffect(() => {
    if (!token) {
      usePlayerStore.setState({
        currentTrack: null,
        queue: [],
        isPlaying: false,
        progressMs: 0,
        durationMs: 0,
      })
      return
    }

    async function restorePlayerState() {
      try {
        const state = await getPlayerState()
        if (state) {
          if (state.track_id) {
            try {
              const track = await getTrack(state.track_id)
              if (track) {
                shouldRestoreProgress.current = true
                usePlayerStore.setState({
                  currentTrack: track,
                  isPlaying: false,
                  progressMs: state.progress_ms,
                  durationMs: track.duration_seconds ? track.duration_seconds * 1000 : 0,
                  volume: state.volume,
                  shuffle: state.shuffle,
                  repeatMode: state.repeat_mode as 'off' | 'context' | 'track',
                })
              }
            } catch (err) {
              console.error('Failed to load saved track details:', err)
            }
          } else {
            usePlayerStore.setState({
              currentTrack: null,
              progressMs: 0,
              volume: state.volume,
              shuffle: state.shuffle,
              repeatMode: state.repeat_mode as 'off' | 'context' | 'track',
            })
          }
        }
      } catch (err) {
        console.error('Failed to load initial player state:', err)
      } finally {
        setTimeout(() => {
          isInitialRestoring.current = false
        }, 1200)
      }
    }

    restorePlayerState()
  }, [token])

  // Sync settings/playback changes back to the database (debounced by 1s)
  useEffect(() => {
    if (!token || !currentTrack || isInitialRestoring.current) return

    const timer = setTimeout(() => {
      const payload: any = {
        track_id: currentTrack.id,
        is_playing: isPlaying,
        progress_ms: usePlayerStore.getState().progressMs,
        shuffle: shuffle,
        repeat_mode: repeatMode,
      }
      if (!isMobile) {
        payload.volume = volume
      }
      updatePlayerState(payload).catch(() => { })
    }, 1000)

    return () => clearTimeout(timer)
  }, [token, currentTrack, isPlaying, volume, shuffle, repeatMode, isMobile])

  // Periodic progress sync back to the database (every 5 seconds while playing)
  useEffect(() => {
    if (!token || !currentTrack || !isPlaying) return

    const interval = setInterval(() => {
      const payload: any = {
        track_id: currentTrack.id,
        is_playing: isPlaying,
        progress_ms: usePlayerStore.getState().progressMs,
        shuffle: usePlayerStore.getState().shuffle,
        repeat_mode: usePlayerStore.getState().repeatMode,
      }
      if (!isMobile) {
        payload.volume = usePlayerStore.getState().volume
      }
      updatePlayerState(payload).catch(() => { })
    }, 5000)

    return () => clearInterval(interval)
  }, [token, currentTrack, isPlaying, isMobile])

  // Load audio source when track changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    let cancelled = false

    // Immediately stop and unload the previous track to prevent overlapping streams
    audio.pause()
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    audio.removeAttribute('src')
    audio.load()

    if (!currentTrack) return

    // Trigger background caching for offline playback
    addToOfflineTracks(currentTrack.id)

    async function loadAudio() {
      let url = ''
      try {
        const res = await getTrackAudioUrl(currentTrack!.id)
        if (res && res.audio_url) {
          url = res.audio_url
        }
      } catch (err) {
        console.error('Failed to get track audio URL:', err)
      }

      if (!url || cancelled) return

      try {
        // Explicitly apply volume to prevent browser volume resets on new track loads
        audio!.volume = isMobile ? 1.0 : Math.pow(usePlayerStore.getState().volume / 100, 2)

        const isHls = url.includes('.m3u8')

        if (isHls && Hls.isSupported()) {
          const hls = new Hls({
            loader: CustomKeyLoader as any,
            fLoader: CachedFragmentLoader as any,
            xhrSetup: (xhr, xhrUrl) => {
              console.log('[HLS xhrSetup] Requesting URL:', xhrUrl)
              if (xhrUrl.includes('/key')) {
                const storedToken = useAuthStore.getState().token
                console.log('[HLS xhrSetup] Matched /key endpoint. Token exists:', !!storedToken)
                if (storedToken) {
                  xhr.setRequestHeader('Authorization', `Bearer ${storedToken}`)
                }
              }
            }
          })

          hlsRef.current = hls
          hls.loadSource(url)
          hls.attachMedia(audio!)

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (!cancelled) {
              const shouldPlay = usePlayerStore.getState().isPlaying
              if (shouldPlay) {
                audio!.play().catch((err) => {
                  console.warn('Auto-play blocked, click the page to enable playback:', err)
                })
                setIsPlaying(true)
              } else {
                setIsPlaying(false)
              }
            }
          })

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              console.error('Fatal HLS.js error:', data)
            }
          })
        } else {
          audio!.src = url
          audio!.load()

          const shouldPlay = usePlayerStore.getState().isPlaying
          if (shouldPlay) {
            audio!.play().catch((err) => {
              console.warn('Auto-play blocked, click the page to enable playback:', err)
            })
            setIsPlaying(true)
          } else {
            setIsPlaying(false)
          }
        }

        const shouldPlay = usePlayerStore.getState().isPlaying
        if (token && shouldPlay) {
          addRecentlyPlayed(currentTrack!.id).catch(() => { })
        }
      } catch (err) {
        console.error('Audio load error:', err)
      }
    }

    loadAudio()
    return () => {
      cancelled = true
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [currentTrack, setIsPlaying, token])

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMobile ? 1.0 : Math.pow(volume / 100, 2)
    }
  }, [volume, isMobile])

  // Sync playback play/pause state with store changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audio.src) return

    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Playback fail or auto-play blocked:', err)
      })
    } else {
      audio.pause()
      if (audio.ended || (audio.duration && audio.currentTime >= audio.duration - 0.5)) {
        audio.currentTime = 0
        setProgressMs(0)
      }
    }
  }, [isPlaying, setProgressMs])

  // --- Sync with Media Session API for Background Playback & Lock Screen Controls ---
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist_name || 'Unknown Artist',
      album: currentTrack.album_title || 'Single',
      artwork: currentTrack.cover_url ? [
        { src: currentTrack.cover_url, sizes: '96x96', type: 'image/jpeg' },
        { src: currentTrack.cover_url, sizes: '192x192', type: 'image/jpeg' },
        { src: currentTrack.cover_url, sizes: '512x512', type: 'image/jpeg' },
      ] : []
    })

    navigator.mediaSession.setActionHandler('play', () => {
      setIsPlaying(true)
    })
    navigator.mediaSession.setActionHandler('pause', () => {
      setIsPlaying(false)
    })
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      usePlayerStore.getState().playPrevious()
    })
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      usePlayerStore.getState().playNext(true)
    })

    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
      navigator.mediaSession.setActionHandler('previoustrack', null)
      navigator.mediaSession.setActionHandler('nexttrack', null)
    }
  }, [currentTrack, setIsPlaying])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  // Progress updates & Audio play events listener
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      setProgressMs(Math.round(audio.currentTime * 1000))
      if (audio.duration && !isNaN(audio.duration)) {
        setDurationMs(Math.round(audio.duration * 1000))
      }
    }
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDurationMs(audio.duration * 1000)
      }
      if (shouldRestoreProgress.current) {
        const savedProgressMs = usePlayerStore.getState().progressMs
        if (savedProgressMs > 0) {
          try {
            audio.currentTime = savedProgressMs / 1000
          } catch (err) {
            console.warn('Failed to restore playback position:', err)
          }
        }
        shouldRestoreProgress.current = false
      }
    }
    const onEnded = () => {
      const state = usePlayerStore.getState()
      if (state.repeatMode === 'track') {
        audio.currentTime = 0
        audio.play().catch(() => { })
        setProgressMs(0)
        setIsPlaying(true)
      } else {
        playNext(false)
      }
    }

    const onPlay = () => {
      initSpatialEngine()
      resumeAudioContext()
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('playing', onPlay)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('playing', onPlay)
    }
  }, [currentTrack, setProgressMs, setDurationMs, setIsPlaying, playNext, initSpatialEngine, resumeAudioContext])

  // Expose a global seek helper for components like ExpandedPlayer that don't have direct ref access
  useEffect(() => {
    (window as any).fermataSeek = (ms: number) => {
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = ms / 1000
        } catch (err) {
          console.warn('FermataSeek failed:', err)
        }
      }
    }
    return () => {
      delete (window as any).fermataSeek
    }
  }, [])

  const toggleMute = useCallback(() => {
    setVolume(volume === 0 ? 50 : 0)
  }, [volume, setVolume])

  if (!currentTrack) {
    return null
  }

  const progress = durationMs > 0 ? (progressMs / durationMs) * 100 : 0

  return (
    <>
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />

      {/* Desktop view */}
      <div
        onClick={() => usePlayerStore.setState({ isExpanded: true })}
        className="hidden md:flex relative h-20 bg-surface-elevated/90 backdrop-blur-2xl items-center px-6 gap-4 justify-between shrink-0 cursor-pointer hover:bg-surface-elevated/95 transition-all duration-300 border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] overflow-hidden group"
      >
        {/* Animated Top Glow Border Sweep Line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-spotify-green to-transparent opacity-80 group-hover:opacity-100 transition-opacity">
          {isPlaying && <div className="absolute inset-0 animate-player-glow" />}
        </div>

        {/* Ambient Subtle Background Glow */}
        {isPlaying && (
          <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-spotify-green/10 rounded-full blur-3xl pointer-events-none transition-all duration-700 animate-pulse" />
        )}

        {/* Track Info — Left */}
        <div className="flex items-center gap-3.5 min-w-0 w-[260px] shrink-0 z-10">
          <div className="relative group/art shrink-0">
            {currentTrack.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                loading="lazy"
                className="w-13 h-13 rounded-xl object-cover shrink-0 shadow-md shadow-black/50 group-hover/art:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-13 h-13 rounded-xl bg-surface-highlight/80 flex items-center justify-center shrink-0 shadow-inner">
                <Music size={20} className="text-subtext" />
              </div>
            )}
            {/* Animated equalizer soundwave hover overlay */}
            {isPlaying && (
              <div className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-[1px] flex items-center justify-center gap-0.5 opacity-0 group-hover/art:opacity-100 transition-opacity">
                <span className="w-1 bg-spotify-green rounded-full animate-eq-1" />
                <span className="w-1 bg-spotify-green rounded-full animate-eq-2" />
                <span className="w-1 bg-spotify-green rounded-full animate-eq-3" />
                <span className="w-1 bg-spotify-green rounded-full animate-eq-4" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold truncate text-primary group-hover:text-spotify-green transition-colors">
                {currentTrack.title}
              </p>
              {isPlaying && (
                <div className="flex items-end gap-[2px] h-3.5 px-1.5 py-0.5 rounded-full bg-spotify-green/10 border border-spotify-green/20 shrink-0" title="Playing">
                  <span className="w-[2px] bg-spotify-green rounded-full animate-eq-1" />
                  <span className="w-[2px] bg-spotify-green rounded-full animate-eq-2" />
                  <span className="w-[2px] bg-spotify-green rounded-full animate-eq-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-subtext truncate mt-0.5 font-medium hover:underline">
              {currentTrack.artist_name || 'Unknown Artist'}
            </p>
          </div>
        </div>

        {/* Controls — Center */}
        <div onClick={(e) => e.stopPropagation()} className="flex-1 flex justify-center max-w-[600px] z-10">
          <PlayerControls audioRef={audioRef} />
        </div>

        {/* Features & Downside Options — Right */}
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-3 min-w-0 shrink-0 justify-end z-10">
          {/* 3D Spatial Audio Button */}
          <button
            onClick={() => set3DModalOpen(true)}
            className={`relative p-2.5 rounded-full transition-all duration-200 cursor-pointer ${
              is3DEnabled
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_12px_rgba(168,85,247,0.3)] scale-105'
                : 'text-subtext hover:text-primary hover:bg-white/10 hover:scale-105'
            }`}
            title={is3DEnabled ? '3D Spatial Audio Active' : 'Open 3D Spatial Audio'}
          >
            <Sparkles size={18} />
            {is3DEnabled && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping" />
            )}
          </button>

          {/* Lofi Mode Toggle Button */}
          <button
            onClick={() => setLofiEnabled(!isLofiEnabled)}
            className={`relative p-2.5 rounded-full transition-all duration-200 cursor-pointer ${
              isLofiEnabled
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.3)] scale-105'
                : 'text-subtext hover:text-primary hover:bg-white/10 hover:scale-105'
            }`}
            title={isLofiEnabled ? 'Lofi Mode Active — Click to disable' : 'Enable Lofi Mode'}
          >
            <Coffee size={18} />
            {isLofiEnabled && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
            )}
          </button>

          {/* Equalizer (EQ) Button */}
          <button
            onClick={() => setEQModalOpen(true)}
            className={`relative p-2.5 rounded-full transition-all duration-200 cursor-pointer ${
              isEQEnabled
                ? 'bg-spotify-green/20 text-spotify-green border border-spotify-green/50 shadow-[0_0_12px_rgba(124,58,237,0.3)] scale-105'
                : 'text-subtext hover:text-primary hover:bg-white/10 hover:scale-105'
            }`}
            title={isEQEnabled ? 'Equalizer Active' : 'Open Equalizer'}
          >
            <Sliders size={18} />
            {isEQEnabled && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-spotify-green rounded-full animate-pulse" />
            )}
          </button>

          {/* Expand Player / Lyrics Button */}
          <button
            onClick={() => usePlayerStore.setState({ isExpanded: true })}
            className="p-2.5 text-subtext hover:text-primary hover:bg-white/10 rounded-full transition-all duration-200 hover:scale-105 cursor-pointer"
            title="Expand Full Screen & Lyrics"
          >
            <Maximize2 size={18} />
          </button>

          {/* Volume Control */}
          {!isMobile && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
              <button
                onClick={toggleMute}
                className="p-1.5 text-subtext hover:text-primary hover:scale-110 transition-all cursor-pointer"
                title={volume === 0 ? 'Unmute' : 'Mute'}
              >
                {volume === 0 ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-20 accent-spotify-green h-1.5 cursor-pointer bg-zinc-700/80 rounded-full hover:h-2 transition-all duration-150"
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile view (Floating glass pill card) */}
      <div
        onClick={() => usePlayerStore.setState({ isExpanded: true })}
        className="flex md:hidden items-center justify-between mx-2 mb-2 h-14 bg-surface-elevated/95 backdrop-blur-xl border border-white/10 rounded-xl px-3 gap-2 relative overflow-hidden shadow-xl shadow-black/60 cursor-pointer hover:bg-surface-elevated/90 transition-all duration-200"
      >
        {/* Progress Bar (at bottom edge of card) */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-spotify-green via-purple-400 to-emerald-400 transition-all duration-100 relative"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Track Info */}
        <div className="flex items-center min-w-0 flex-1 gap-2.5">
          {currentTrack.cover_url ? (
            <img
              src={currentTrack.cover_url}
              alt={currentTrack.title}
              loading="lazy"
              className="w-9 h-9 rounded-lg object-cover shrink-0 shadow"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-surface-highlight flex items-center justify-center shrink-0">
              <Music size={14} className="text-subtext" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold truncate text-primary">{currentTrack.title}</p>
              {isPlaying && (
                <div className="flex items-end gap-[1.5px] h-2.5 shrink-0">
                  <span className="w-[1.5px] bg-spotify-green rounded-full animate-eq-1" />
                  <span className="w-[1.5px] bg-spotify-green rounded-full animate-eq-2" />
                  <span className="w-[1.5px] bg-spotify-green rounded-full animate-eq-3" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-subtext truncate mt-0.5 font-medium">
              {currentTrack.artist_name || 'Unknown Artist'}
            </p>
          </div>
        </div>

        {/* Controls & Features */}
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 shrink-0">
          {/* Previous */}
          <button
            onClick={() => usePlayerStore.getState().playPrevious()}
            className="p-1.5 text-subtext hover:text-primary transition-colors cursor-pointer"
            title="Previous"
          >
            <SkipBack size={16} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-full bg-primary text-inverted hover:scale-105 active:scale-95 transition-all cursor-pointer shadow"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} className="fill-current" /> : <Play size={16} className="ml-0.5 fill-current" />}
          </button>

          {/* Next */}
          <button
            onClick={() => playNext(true)}
            className="p-1.5 text-subtext hover:text-primary transition-colors cursor-pointer"
            title="Next"
          >
            <SkipForward size={16} />
          </button>

          {/* 3D Audio */}
          <button
            onClick={() => set3DModalOpen(true)}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              is3DEnabled ? 'text-purple-300' : 'text-subtext hover:text-primary'
            }`}
            title="3D Spatial Audio"
          >
            <Sparkles size={16} />
          </button>

          {/* Equalizer */}
          <button
            onClick={() => setEQModalOpen(true)}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isEQEnabled ? 'text-spotify-green' : 'text-subtext hover:text-primary'
            }`}
            title="Equalizer"
          >
            <Sliders size={16} />
          </button>

          {/* Lofi Mode */}
          <button
            onClick={() => setLofiEnabled(!isLofiEnabled)}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isLofiEnabled ? 'text-amber-300' : 'text-subtext hover:text-primary'
            }`}
            title="Lofi Mode"
          >
            <Coffee size={16} />
          </button>

          {/* Expand */}
          <button
            onClick={() => usePlayerStore.setState({ isExpanded: true })}
            className="p-1.5 text-subtext hover:text-primary transition-colors cursor-pointer"
            title="Expand Player"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </>
  )
}

