import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { RefreshCw, Check } from 'lucide-react'
import { login, getMe } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import logo from '@/assets/logo.svg'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const setUser = useAuthStore((s) => s.setUser)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  // Mouse Parallax for ambient blobs
  const [blobOffset, setBlobOffset] = useState({ x: 0, y: 0 })

  // CAPTCHA State & Refs
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [captchaToken, setCaptchaToken] = useState<string>('')
  const [useFallbackCaptcha, setUseFallbackCaptcha] = useState(false)
  
  // Custom Visual Math CAPTCHA State (Fallback Mode)
  const [captchaNum1, setCaptchaNum1] = useState(0)
  const [captchaNum2, setCaptchaNum2] = useState(0)
  const [userCaptchaAnswer, setUserCaptchaAnswer] = useState('')

  const generateCaptcha = () => {
    const n1 = Math.floor(Math.random() * 9) + 1
    const n2 = Math.floor(Math.random() * 9) + 1
    setCaptchaNum1(n1)
    setCaptchaNum2(n2)
    setUserCaptchaAnswer('')
    setCaptchaToken('')
  }

  useEffect(() => {
    generateCaptcha()
  }, [])

  // Parallax mouse move listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5)
      const y = (e.clientY / window.innerHeight - 0.5)
      setBlobOffset({ x, y })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Initialize Turnstile widget
  useEffect(() => {
    const renderTurnstile = () => {
      if (turnstileContainerRef.current && (window as any).turnstile) {
        if (widgetIdRef.current) {
          try {
            (window as any).turnstile.remove(widgetIdRef.current)
          } catch (e) {}
        }
        try {
          widgetIdRef.current = (window as any).turnstile.render(turnstileContainerRef.current, {
            sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
            theme: 'dark',
            callback: (token: string) => {
              setCaptchaToken(token)
            },
            'expired-callback': () => {
              setCaptchaToken('')
            },
            'error-callback': () => {
              setUseFallbackCaptcha(true)
            }
          })
        } catch (err) {
          console.error("Turnstile render error:", err)
          setUseFallbackCaptcha(true)
        }
      }
    }

    if ((window as any).turnstile) {
      renderTurnstile()
    } else {
      const interval = setInterval(() => {
        if ((window as any).turnstile) {
          renderTurnstile()
          clearInterval(interval)
        }
      }, 500)
      const timeout = setTimeout(() => {
        if (!(window as any).turnstile) {
          setUseFallbackCaptcha(true)
        }
      }, 3000)
      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }

    return () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current)
        } catch (e) {}
      }
    }
  }, [])

  const proceedToHome = () => {
    setIsExiting(true)
    setTimeout(() => {
      navigate('/', { state: { justLoggedIn: true } })
    }, 450)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    let tokenToSubmit = captchaToken

    if (!tokenToSubmit && widgetIdRef.current && (window as any).turnstile) {
      tokenToSubmit = (window as any).turnstile.getResponse(widgetIdRef.current)
    }

    if (useFallbackCaptcha) {
      if (parseInt(userCaptchaAnswer, 10) !== (captchaNum1 + captchaNum2)) {
        setError('Incorrect CAPTCHA answer. Please try again.')
        generateCaptcha()
        return
      }
      tokenToSubmit = `fallback-captcha-${captchaNum1 + captchaNum2}`
    } else if (!tokenToSubmit) {
      setError('Please complete the CAPTCHA verification.')
      return
    }

    setLoading(true)

    try {
      const res = await login(username, password, tokenToSubmit)
      setAuth(res.access_token, res.refresh_token)

      const user = await getMe()
      setUser(user)

      proceedToHome()
    } catch (err: any) {
      setError(err.message || 'Login failed')
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(widgetIdRef.current)
        } catch (e) {}
      }
      setCaptchaToken('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`login-page-root ${isExiting ? 'page-exit' : ''}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

        :root {
          --bg-0: #07070d;
          --bg-1: #0c0c16;
          --panel: #101018;
          --line: #212130;
          --violet: #8b6bf0;
          --violet-2: #6d4fd6;
          --teal: #4fd6c4;
          --text-0: #f4f3f8;
          --text-1: #9d9cb0;
          --text-2: #5f5e72;
          --focus: #a48af6;
        }

        .login-page-root {
          min-height: 100vh;
          background: var(--bg-0);
          color: var(--text-0);
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient background */
        .scene {
          position: fixed; inset: 0;
          z-index: 0;
          background: var(--bg-0);
          pointer-events: none;
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.55;
          will-change: transform;
          transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .blob-a {
          width: 640px; height: 640px;
          right: -120px; top: -160px;
          background: radial-gradient(circle at 30% 30%, #6d4fd6, transparent 70%);
          animation: drift-a 22s ease-in-out infinite;
        }
        .blob-b {
          width: 520px; height: 520px;
          right: 10%; bottom: -200px;
          background: radial-gradient(circle at 60% 40%, #2e6fd6, transparent 70%);
          animation: drift-b 26s ease-in-out infinite;
        }
        .blob-c {
          width: 380px; height: 380px;
          left: -140px; bottom: 10%;
          background: radial-gradient(circle at 50% 50%, #4fd6c4, transparent 72%);
          opacity: 0.18;
          animation: drift-c 30s ease-in-out infinite;
        }
        @keyframes drift-a {
          0%,100%{ transform: translate(0,0) scale(1); }
          50%{ transform: translate(-40px,50px) scale(1.08); }
        }
        @keyframes drift-b {
          0%,100%{ transform: translate(0,0) scale(1); }
          50%{ transform: translate(30px,-40px) scale(1.05); }
        }
        @keyframes drift-c {
          0%,100%{ transform: translate(0,0) scale(1); }
          50%{ transform: translate(20px,-20px) scale(1.1); }
        }

        .grain {
          position: fixed; inset: 0; z-index: 1;
          pointer-events: none;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        /* Layout Grid */
        .wrap {
          position: relative; z-index: 2;
          min-height: 100vh;
          max-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          overflow: hidden;
        }
        @media (max-width: 980px) {
          .wrap { grid-template-columns: 1fr; max-height: none; overflow: auto; }
          .stage { display: none !important; }
        }

        .form-col {
          display: flex; flex-direction: column;
          justify-content: center;
          padding: 24px 48px;
          max-width: 580px;
          margin: 0 auto;
          width: 100%;
          max-height: 100vh;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .form-col::-webkit-scrollbar { display: none; }
        @media (max-width: 560px) {
          .form-col { padding: 24px 20px; }
        }

        /* Staggered Entrance */
        .reveal {
          opacity: 0;
          transform: translateY(14px);
          animation: rise 0.7s cubic-bezier(.2,.8,.2,1) forwards;
        }
        @keyframes rise { to { opacity: 1; transform: translateY(0); } }
        .d1 { animation-delay: .05s }
        .d2 { animation-delay: .15s }
        .d3 { animation-delay: .22s }
        .d4 { animation-delay: .30s }
        .d5 { animation-delay: .38s }
        .d6 { animation-delay: .46s }
        .d7 { animation-delay: .54s }
        .d8 { animation-delay: .62s }

        /* Brand & Logo Mark */
        .brand {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 20px;
          cursor: pointer;
        }
        .brand-mark {
          width: 34px; height: 34px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          position: relative;
          overflow: hidden;
          background: #0f0f1a;
          box-shadow: 0 0 0 1px var(--line);
          animation: mark-glow 3.6s ease-in-out infinite;
        }
        .brand-mark img {
          width: 100%; height: 100%;
          object-fit: cover;
          display: block;
          animation: mark-spin 7s ease-in-out infinite;
          transform-origin: 56% 58%;
        }
        .brand-mark::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(120deg, transparent 20%, rgba(255,255,255,.45) 45%, transparent 65%);
          transform: translateX(-120%);
          animation: sheen 4.5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes sheen {
          0% { transform: translateX(-120%); }
          35% { transform: translateX(120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes mark-spin {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(14deg) scale(1.06); }
        }
        @keyframes mark-glow {
          0%, 100% { box-shadow: 0 0 0 1px var(--line), 0 0 0px rgba(139,107,240,0); }
          50% { box-shadow: 0 0 0 1px var(--line), 0 0 14px rgba(139,107,240,0.55); }
        }
        .brand-name {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 18px;
          letter-spacing: -0.02em;
          color: var(--text-0);
        }

        .heading-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 34px;
          line-height: 1.1;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
          color: var(--text-0);
        }
        .sub-text {
          color: var(--text-1);
          font-size: 14px;
          margin-bottom: 20px;
        }

        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--text-1);
          margin-bottom: 5px;
        }
        .field-group { margin-bottom: 14px; position: relative; }
        .input-shell {
          position: relative;
          border-radius: 9px;
          background: var(--panel);
          border: 1px solid var(--line);
          transition: border-color .25s ease, box-shadow .25s ease, background .25s ease;
        }
        .input-shell:focus-within {
          border-color: var(--focus);
          box-shadow: 0 0 0 4px rgba(164,138,246,0.15);
          background: #121220;
        }
        .input-control {
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-0);
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          padding: 11px 15px;
        }
        .input-control::placeholder { color: var(--text-2); }

        .eye-btn {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--text-2);
          width: 34px; height: 34px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          transition: color .2s ease, background .2s ease;
        }
        .eye-btn:hover { color: var(--text-0); background: rgba(255,255,255,0.05); }

        .row-between {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
          font-size: 13px;
        }
        .remember { display: flex; align-items: center; gap: 8px; color: var(--text-1); cursor: pointer; user-select: none; }
        .checkbox-box {
          width: 16px; height: 16px;
          border-radius: 4px;
          border: 1.5px solid var(--line);
          display: flex; align-items: center; justify-content: center;
          transition: border-color .2s ease, background .2s ease;
          position: relative;
        }
        .checkbox-box svg { width: 10px; height: 10px; opacity: 0; transform: scale(0.5); transition: all .18s ease; }
        input.chk-input { display: none; }
        input.chk-input:checked + .checkbox-box { background: linear-gradient(135deg, var(--violet), var(--violet-2)); border-color: transparent; }
        input.chk-input:checked + .checkbox-box svg { opacity: 1; transform: scale(1); }

        .forgot-link { color: var(--focus); text-decoration: none; font-size: 13px; font-weight: 500; }
        .forgot-link:hover { text-decoration: underline; }

        .verify-label { margin-bottom: 6px; display: block; font-size: 12.5px; font-weight: 500; color: var(--text-1); }
        .verify-box {
          border: 1px solid var(--line);
          border-radius: 9px;
          background: var(--panel);
          padding: 12px 16px;
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .verify-left { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--text-0); font-weight: 500; }
        .check-circle {
          width: 20px; height: 20px; border-radius: 50%;
          background: radial-gradient(circle, #2fd67e, #1fae63);
          display: flex; align-items: center; justify-content: center;
          animation: pop .45s cubic-bezier(.3,1.4,.6,1) .2s both;
        }
        @keyframes pop { 0%{transform:scale(0);} 70%{transform:scale(1.15);} 100%{transform:scale(1);} }
        .check-circle svg { width: 11px; height: 11px; }
        .cf-brand { text-align: right; }
        .cf-name { font-size: 10.5px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-1); }
        .cf-links { font-size: 9.5px; color: var(--text-2); }
        .cf-links a { color: var(--text-2); text-decoration: none; }

        .alt-verify { font-size: 12px; color: var(--text-2); text-decoration: underline; margin-bottom: 16px; display: inline-block; cursor: pointer; background: none; border: none; padding: 0; }
        .alt-verify:hover { color: var(--text-1); }

        .btn-login {
          width: 100%;
          padding: 13px 0;
          border: none;
          border-radius: 9px;
          background: linear-gradient(135deg, var(--violet-2), var(--violet));
          background-size: 180% 180%;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform .18s ease, box-shadow .25s ease, background-position .6s ease;
          box-shadow: 0 6px 20px -5px rgba(139,107,240,0.45);
        }
        .btn-login:hover:not(:disabled) {
          background-position: 100% 0;
          box-shadow: 0 8px 24px -5px rgba(139,107,240,0.65);
          transform: translateY(-1px);
        }
        .btn-login:active:not(:disabled) { transform: translateY(0px) scale(.99); }
        .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-login::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%);
          transform: translateX(-140%);
        }
        .btn-login:hover:not(:disabled)::after { animation: sheen2 1s ease forwards; }
        @keyframes sheen2 { to { transform: translateX(140%); } }

        .btn-spinner {
          display: inline-block;
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .signup-text {
          margin-top: 16px;
          font-size: 13px;
          color: var(--text-1);
        }
        .signup-text a {
          color: var(--focus);
          text-decoration: none;
          font-weight: 600;
        }
        .signup-text a:hover { text-decoration: underline; }

        /* Error Banner */
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .error-banner {
          animation: shake 0.4s ease;
          margin-bottom: 14px; padding: 10px 14px;
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
          border-radius: 9px; font-size: 13px; color: #f87171; text-align: center;
        }

        /* Right Stage / Soundstage */
        .stage {
          position: relative;
          display: flex; flex-direction: column;
          justify-content: flex-end;
          padding: 40px 56px;
          overflow: hidden;
          max-height: 100vh;
        }
        .eyebrow {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px; font-weight: 600;
          letter-spacing: 3px;
          color: var(--text-1);
          margin-bottom: 10px;
          opacity: 0;
          animation: rise .7s cubic-bezier(.2,.8,.2,1) .5s forwards;
        }
        .headline {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 38px;
          line-height: 1.12;
          letter-spacing: -0.5px;
          margin-bottom: 24px;
          opacity: 0;
          animation: rise .7s cubic-bezier(.2,.8,.2,1) .6s forwards;
        }

        /* Live Equalizer Visual */
        .eq {
          display: flex; align-items: flex-end; gap: 5px;
          height: 80px;
          margin-bottom: 14px;
          opacity: 0;
          animation: rise .8s cubic-bezier(.2,.8,.2,1) .75s forwards;
          transform-origin: bottom;
        }
        .eq span {
          width: 5px;
          border-radius: 3px;
          background: linear-gradient(180deg, var(--teal), var(--violet));
          animation: bounce 1.6s ease-in-out infinite;
          opacity: 0.85;
          transform-origin: bottom;
        }
        .eq span:nth-child(1){ height:30%; animation-delay:-1.2s; }
        .eq span:nth-child(2){ height:60%; animation-delay:-0.9s; }
        .eq span:nth-child(3){ height:35%; animation-delay:-1.5s; }
        .eq span:nth-child(4){ height:85%; animation-delay:-0.4s; }
        .eq span:nth-child(5){ height:45%; animation-delay:-1.0s; }
        .eq span:nth-child(6){ height:70%; animation-delay:-0.2s; }
        .eq span:nth-child(7){ height:25%; animation-delay:-1.4s; }
        .eq span:nth-child(8){ height:55%; animation-delay:-0.7s; }
        .eq span:nth-child(9){ height:90%; animation-delay:-0.1s; }
        .eq span:nth-child(10){ height:40%; animation-delay:-1.1s; }
        .eq span:nth-child(11){ height:65%; animation-delay:-0.5s; }
        .eq span:nth-child(12){ height:30%; animation-delay:-1.3s; }
        @keyframes bounce {
          0%,100%{ transform: scaleY(0.4); }
          50%{ transform: scaleY(1); }
        }

        .ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .ring1 { width: 440px; height: 440px; top: -60px; right: -100px; animation: ringSpin 60s linear infinite; }
        .ring2 { width: 320px; height: 320px; top: 20px; right: -20px; animation: ringSpin 46s linear infinite reverse; }
        @keyframes ringSpin { to { transform: rotate(360deg); } }
        .eq span:nth-child(1){ height:30%; animation-delay:-1.2s; }
        .eq span:nth-child(2){ height:60%; animation-delay:-0.9s; }
        .eq span:nth-child(3){ height:35%; animation-delay:-1.5s; }
        .eq span:nth-child(4){ height:85%; animation-delay:-0.4s; }
        .eq span:nth-child(5){ height:45%; animation-delay:-1.0s; }
        .eq span:nth-child(6){ height:70%; animation-delay:-0.2s; }
        .eq span:nth-child(7){ height:25%; animation-delay:-1.4s; }
        .eq span:nth-child(8){ height:55%; animation-delay:-0.7s; }
        .eq span:nth-child(9){ height:90%; animation-delay:-0.1s; }
        .eq span:nth-child(10){ height:40%; animation-delay:-1.1s; }
        .eq span:nth-child(11){ height:65%; animation-delay:-0.5s; }
        .eq span:nth-child(12){ height:30%; animation-delay:-1.3s; }
        @keyframes bounce {
          0%,100%{ transform: scaleY(0.4); }
          50%{ transform: scaleY(1); }
        }

        .ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.06);
        }
        .ring1 { width: 520px; height: 520px; top: -80px; right: -140px; animation: ringSpin 60s linear infinite; }
        .ring2 { width: 380px; height: 380px; top: 20px; right: -40px; animation: ringSpin 46s linear infinite reverse; }
        @keyframes ringSpin { to { transform: rotate(360deg); } }

        .page-exit {
          animation: exitFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes exitFade {
          to { opacity: 0; transform: scale(0.98); filter: blur(6px); }
        }
      `}</style>

      {/* Ambient background with parallax blobs */}
      <div className="scene">
        <div
          className="blob blob-a"
          style={{
            transform: `translate(${blobOffset.x * 30}px, ${blobOffset.y * 30}px)`,
          }}
        />
        <div
          className="blob blob-b"
          style={{
            transform: `translate(${blobOffset.x * 20}px, ${blobOffset.y * 20}px)`,
          }}
        />
        <div
          className="blob blob-c"
          style={{
            transform: `translate(${blobOffset.x * 10}px, ${blobOffset.y * 10}px)`,
          }}
        />
      </div>
      <div className="grain" />

      {/* Main Grid Wrapper */}
      <div className="wrap">
        {/* LEFT COLUMN: FORM */}
        <div className="form-col">
          {/* Animated Brand Header */}
          <div className="brand reveal d1" onClick={() => navigate('/')}>
            <div className="brand-mark">
              <img src={logo} alt="Fermata Logo" />
            </div>
            <span className="brand-name">Fermata</span>
          </div>

          <h1 className="heading-title reveal d2">Welcome Buddy!</h1>
          <p className="sub-text reveal d2">Login to listen unlimited music</p>

          {/* Error Message */}
          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Username / Email Field */}
            <div className="field-group reveal d3">
              <label htmlFor="user" className="field-label">Username / Email</label>
              <div className="input-shell">
                <input
                  id="user"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  required
                  className="input-control"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="field-group reveal d4">
              <label htmlFor="pass" className="field-label">Password</label>
              <div className="input-shell">
                <input
                  id="pass"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="input-control"
                  style={{ paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="eye-btn"
                  aria-label="Toggle password visibility"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {showPassword ? (
                      <>
                        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        <path d="M10.6 5.2A11 11 0 0 1 12 5c7 0 11 7 11 7a17.7 17.7 0 0 1-3.4 4.2M6.6 6.6C3.6 8.4 1 12 1 12s4 7 11 7a10.7 10.7 0 0 0 4.2-.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="row-between reveal d5">
              <label className="remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="chk-input"
                />
                <span className="checkbox-box">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 12l5 5L20 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Remember me
              </label>
              <button
                type="button"
                className="forgot-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Forgot your password?
              </button>
            </div>

            {/* Security Verification Section */}
            <div className="reveal d6" style={{ marginBottom: 24 }}>
              <label className="verify-label">Security Verification</label>

              {!useFallbackCaptcha && (
                <div>
                  <div ref={turnstileContainerRef} style={{ minHeight: 65, width: '100%', display: 'flex', justifyContent: 'center' }}></div>
                  <button
                    type="button"
                    onClick={() => setUseFallbackCaptcha(true)}
                    className="alt-verify"
                    style={{ marginTop: 6 }}
                  >
                    Having trouble? Use Visual Code CAPTCHA instead
                  </button>
                </div>
              )}

              {useFallbackCaptcha && (
                <div style={{
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 500 }}>
                      Solve: <strong style={{ color: 'var(--focus)', fontSize: 16, letterSpacing: 1 }}>{captchaNum1} + {captchaNum2} = ?</strong>
                    </span>
                    <button
                      type="button"
                      onClick={generateCaptcha}
                      title="Refresh CAPTCHA"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: 'none',
                        borderRadius: 6,
                        padding: 6,
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div className="input-shell" style={{ flex: 1 }}>
                      <input
                        type="number"
                        value={userCaptchaAnswer}
                        onChange={(e) => setUserCaptchaAnswer(e.target.value)}
                        placeholder="Enter result"
                        className="input-control"
                        style={{ padding: '10px 14px', fontSize: 14 }}
                      />
                    </div>
                    {userCaptchaAnswer && parseInt(userCaptchaAnswer, 10) === (captchaNum1 + captchaNum2) && (
                      <div style={{
                        background: 'rgba(34,197,94,0.15)',
                        color: '#4ade80',
                        border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}>
                        <Check size={14} /> Verified
                      </div>
                    )}
                  </div>

                  {(window as any).turnstile && (
                    <button
                      type="button"
                      onClick={() => setUseFallbackCaptcha(false)}
                      className="alt-verify"
                      style={{ marginBottom: 0 }}
                    >
                      Switch back to Cloudflare Turnstile
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Log in Button */}
            <div className="reveal d7">
              <button
                type="submit"
                disabled={loading}
                className="btn-login"
              >
                {loading && <span className="btn-spinner" />}
                {loading ? 'Signing in…' : 'Log in'}
              </button>
            </div>
          </form>

          {/* Sign Up Footer Link */}
          <p className="signup-text reveal d8">
            Don't have an account? <Link to="/register">Sign up here</Link>
          </p>
        </div>

        {/* RIGHT COLUMN: STAGE WITH LIVE EQUALIZER */}
        <div className="stage">
          <div className="ring ring1" />
          <div className="ring ring2" />

          {/* Live Equalizer Bars */}
          <div className="eq" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="eyebrow">YOUR PERSONAL SOUNDSTAGE</div>
          <div className="headline">Music that moves<br />with you.</div>
        </div>
      </div>
    </div>
  )
}
