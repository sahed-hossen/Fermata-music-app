import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Check, ShieldAlert, ShieldCheck, AlertCircle, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react'
import { apiRequest } from '@/api/client'
import logo from '@/assets/logo.svg'

const REQUIREMENTS = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number (0-9)', test: (p: string) => /[0-9]/.test(p) },
  { id: 'special', label: 'One special symbol (e.g. !@#$)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function RegisterPage() {
  const navigate = useNavigate()

  // Form Fields
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // State Management
  const [step, setStep] = useState(1) // 1 = details, 2 = otp, 3 = success
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [resendTimer, setResendTimer] = useState(0)

  // Mouse Parallax for ambient blobs
  const [blobOffset, setBlobOffset] = useState({ x: 0, y: 0 })

  // Turnstile state and refs
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)

  // Refs for 6-digit OTP code input boxes
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

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

  // Timer logic for resend OTP countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => setResendTimer((t) => t - 1), 1000)
      return () => clearInterval(interval)
    }
  }, [resendTimer])

  // Turnstile widget initialization
  useEffect(() => {
    const renderTurnstile = () => {
      if (turnstileContainerRef.current && (window as any).turnstile && step === 1) {
        if (widgetIdRef.current) {
          try {
            (window as any).turnstile.remove(widgetIdRef.current)
          } catch (e) {}
        }
        try {
          widgetIdRef.current = (window as any).turnstile.render(turnstileContainerRef.current, {
            sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || "1x00000000000000000000AA",
            theme: 'dark',
          })
        } catch (err) {
          console.error("Turnstile render error:", err)
        }
      }
    }

    if (step === 1) {
      if ((window as any).turnstile) {
        renderTurnstile()
      } else {
        const interval = setInterval(() => {
          if ((window as any).turnstile) {
            renderTurnstile()
            clearInterval(interval)
          }
        }, 500)
        return () => clearInterval(interval)
      }
    }

    return () => {
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current)
        } catch (e) {}
      }
    }
  }, [step])

  // Live password requirements matching
  const metRequirements = REQUIREMENTS.filter((req) => req.test(password))
  const isPasswordStrong = metRequirements.length === REQUIREMENTS.length
  const passwordsMatch = password && password === confirmPassword

  // Calculate password strength rating
  const getStrengthLabel = () => {
    const count = metRequirements.length
    if (count === 0) return { label: 'Empty', color: 'bg-zinc-700', text: 'text-subtext' }
    if (count <= 2) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-500' }
    if (count <= 4) return { label: 'Medium', color: 'bg-amber-500', text: 'text-amber-500' }
    return { label: 'Strong & Safe', color: 'bg-emerald-400', text: 'text-emerald-400' }
  }
  const strength = getStrengthLabel()

  // Step 1: Submit signup registration details
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordStrong || !passwordsMatch) return
    setError('')
    setLoading(true)

    const captchaToken = widgetIdRef.current && (window as any).turnstile
      ? (window as any).turnstile.getResponse(widgetIdRef.current)
      : null

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.')
      setLoading(false)
      return
    }

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password,
          full_name: fullName,
        }),
        headers: { 'X-CAPTCHA-Token': captchaToken },
      })
      setStep(2)
      setResendTimer(60)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(widgetIdRef.current)
        } catch (e) {}
      }
    } finally {
      setLoading(false)
    }
  }

  // OTP box input navigation and backspacing
  const handleOtpChange = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return
    const updated = [...otp]
    updated[index] = val
    setOtp(updated)

    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const updated = [...otp]
      updated[index - 1] = ''
      setOtp(updated)
      otpRefs.current[index - 1]?.focus()
    }
  }

  // Step 2: Submit OTP code verification
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length < 6) {
      setError('Please enter the complete 6-digit code.')
      return
    }

    setError('')
    setLoading(true)
    try {
      await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          email,
          otp_code: otpCode,
        }),
      })
      setStep(3)
    } catch (err: any) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  // Trigger verification immediately on typing 6th digit
  useEffect(() => {
    if (otp.join('').length === 6 && step === 2) {
      handleVerifyOtp()
    }
  }, [otp])

  // Resend OTP flow
  const handleResendOtp = async () => {
    if (resendTimer > 0) return
    setError('')
    const captchaToken = widgetIdRef.current && (window as any).turnstile
      ? (window as any).turnstile.getResponse(widgetIdRef.current)
      : null

    if (!captchaToken) {
      setError('Please complete the CAPTCHA to resend the code.')
      return
    }

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email,
          password,
          full_name: fullName,
        }),
        headers: { 'X-CAPTCHA-Token': captchaToken },
      })
      setResendTimer(60)
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } catch (err: any) {
      setError(err.message || 'Resend failed')
      if (widgetIdRef.current && (window as any).turnstile) {
        try {
          (window as any).turnstile.reset(widgetIdRef.current)
        } catch (e) {}
      }
    }
  }

  return (
    <div className="register-page-root">
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

        .register-page-root {
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
          margin-bottom: 18px;
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
          font-size: 32px;
          line-height: 1.1;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
          color: var(--text-0);
        }
        .sub-text {
          color: var(--text-1);
          font-size: 13.5px;
          margin-bottom: 16px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-1);
          margin-bottom: 4px;
        }
        .field-group { margin-bottom: 12px; position: relative; }
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
          font-size: 13.5px;
          font-family: 'Inter', sans-serif;
          padding: 10px 14px;
        }
        .input-control::placeholder { color: var(--text-2); }

        .btn-register {
          width: 100%;
          padding: 12px 0;
          border: none;
          border-radius: 9px;
          background: linear-gradient(135deg, var(--violet-2), var(--violet));
          background-size: 180% 180%;
          color: #fff;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 14.5px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform .18s ease, box-shadow .25s ease, background-position .6s ease;
          box-shadow: 0 6px 20px -5px rgba(139,107,240,0.45);
          margin-top: 6px;
        }
        .btn-register:hover:not(:disabled) {
          background-position: 100% 0;
          box-shadow: 0 8px 24px -5px rgba(139,107,240,0.65);
          transform: translateY(-1px);
        }
        .btn-register:active:not(:disabled) { transform: translateY(0px) scale(.99); }
        .btn-register:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-register::after {
          content: "";
          position: absolute; inset: 0;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%);
          transform: translateX(-140%);
        }
        .btn-register:hover:not(:disabled)::after { animation: sheen2 1s ease forwards; }
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

        .signin-text {
          margin-top: 14px;
          font-size: 13px;
          color: var(--text-1);
        }
        .signin-text a {
          color: var(--focus);
          text-decoration: none;
          font-weight: 600;
        }
        .signin-text a:hover { text-decoration: underline; }

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
          margin-bottom: 12px; padding: 10px 14px;
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

          {/* STEP 1: Details */}
          {step === 1 && (
            <div>
              <h1 className="heading-title reveal d2">Create Account</h1>
              <p className="sub-text reveal d2">Start listening to unlimited music today</p>

              {error && <div className="error-banner">{error}</div>}

              <form onSubmit={handleDetailsSubmit}>
                {/* Full Name */}
                <div className="field-group reveal d3">
                  <label className="field-label">Full Name</label>
                  <div className="input-shell">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Your full name"
                      className="input-control"
                    />
                  </div>
                </div>

                {/* Username */}
                <div className="field-group reveal d4">
                  <label className="field-label">Username</label>
                  <div className="input-shell">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="Choose a username"
                      className="input-control"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="field-group reveal d5">
                  <label className="field-label">Email Address</label>
                  <div className="input-shell">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      className="input-control"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="field-group reveal d6">
                  <label className="field-label">Password</label>
                  <div className="input-shell">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Create a strong password"
                      className="input-control"
                    />
                  </div>

                  {/* Password Strength Meter */}
                  {password && (
                    <div className="mt-2.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-subtext">Password strength:</span>
                        <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                      </div>
                      <div className="flex gap-1.5 h-1">
                        {[1, 2, 3, 4, 5].map((idx) => (
                          <div
                            key={idx}
                            className={`flex-1 h-full rounded-full transition-all duration-300 ${
                              idx <= metRequirements.length ? strength.color : 'bg-zinc-800'
                            }`}
                          />
                        ))}
                      </div>

                      <ul className="text-xs text-subtext space-y-1 mt-2.5 bg-panel p-2.5 rounded-lg border border-line">
                        {REQUIREMENTS.map((req) => {
                          const isMet = req.test(password)
                          return (
                            <li key={req.id} className="flex items-center gap-1.5 transition-colors">
                              {isMet ? (
                                <Check size={12} className="text-emerald-400 flex-shrink-0" />
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-subtext/40 mx-1 flex-shrink-0" />
                              )}
                              <span className={isMet ? 'text-primary' : ''}>{req.label}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Re-enter Password */}
                <div className="field-group reveal d6">
                  <label className="field-label">Re-enter Password</label>
                  <div className="input-shell">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={!password}
                      placeholder="Repeat your password"
                      className="input-control disabled:opacity-40"
                    />
                  </div>
                  {confirmPassword && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs">
                      {passwordsMatch ? (
                        <>
                          <ShieldCheck size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Passwords match</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert size={12} className="text-red-500" />
                          <span className="text-red-400">Passwords do not match</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* CAPTCHA Widget */}
                <div className="reveal d7 my-3 flex justify-center">
                  <div ref={turnstileContainerRef} style={{ minHeight: 65, width: '100%', display: 'flex', justifyContent: 'center' }}></div>
                </div>

                {/* Submit button */}
                <div className="reveal d8">
                  <button
                    type="submit"
                    disabled={loading || !isPasswordStrong || !passwordsMatch}
                    className="btn-register"
                  >
                    {loading && <span className="btn-spinner" />}
                    {loading ? 'Creating Account…' : 'Sign Up'}
                  </button>
                </div>
              </form>

              <p className="signin-text reveal d8">
                Already have an account? <Link to="/login">Sign in</Link>
              </p>
            </div>
          )}

          {/* STEP 2: OTP Verification Card */}
          {step === 2 && (
            <div className="reveal d2">
              <h1 className="heading-title">Verify Email</h1>
              <p className="sub-text">
                A 6-digit code has been sent to <span className="text-primary font-medium">{email}</span>
              </p>

              {error && <div className="error-banner">{error}</div>}

              {/* Dev OTP notice */}
              <div className="mb-6 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center flex flex-col items-center">
                <Sparkles size={16} className="text-purple-400 mb-1" />
                <span className="text-xs text-purple-300 font-semibold">Development Bypass Mode</span>
                <span className="text-[11px] text-subtext mt-0.5">Enter test code <strong className="text-primary">123456</strong> to verify.</span>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="flex gap-2.5 justify-center">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      type="text"
                      maxLength={1}
                      value={digit}
                      ref={(el) => { otpRefs.current[idx] = el }}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-11 h-12 text-center text-lg font-bold rounded-lg bg-panel text-primary outline-none border border-line focus:border-focus transition-colors"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
                  className="btn-register"
                >
                  {loading && <span className="btn-spinner" />}
                  {loading ? 'Verifying…' : 'Verify Code'}
                </button>
              </form>

              <div className="mt-6 text-center space-y-3 pt-4 border-t border-line">
                {resendTimer === 0 && (
                  <div ref={turnstileContainerRef} className="flex justify-center my-3"></div>
                )}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0}
                  className="text-xs font-semibold text-focus hover:underline disabled:text-subtext disabled:no-underline"
                >
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Verification Code'}
                </button>

                <div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs text-subtext hover:text-primary transition-colors underline"
                  >
                    Edit registration details
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Success Confirmation */}
          {step === 3 && (
            <div className="reveal d2 text-center py-4">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/30">
                <CheckCircle2 size={36} className="text-purple-400 animate-pulse" />
              </div>

              <h1 className="heading-title mb-2">All Set!</h1>
              <p className="sub-text mb-8">
                Your account has been created successfully. Welcome to Fermata!
              </p>

              <button
                onClick={() => navigate('/login')}
                className="btn-register"
              >
                Proceed to Login
              </button>
            </div>
          )}
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
