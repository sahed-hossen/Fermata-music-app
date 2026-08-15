import { Link } from 'react-router-dom'
import { Home, Music2 } from 'lucide-react'
import logo from '@/assets/logo.svg'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        fontFamily: "'Inter', system-ui, sans-serif",
        textAlign: 'center',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        .notfound-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 28px;
          background: #5457A7;
          color: white;
          font-weight: 700;
          font-size: 14px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .notfound-btn:hover {
          background: #4B48AF;
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(84,87,167,0.35);
        }
        .notfound-btn:active { transform: translateY(0); }
      `}</style>

      {/* Logo */}
      <img
        src={logo}
        alt="Fermata"
        style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 28, opacity: 0.5 }}
      />

      {/* Floating music note decoration */}
      <div style={{
        width: 72, height: 72,
        borderRadius: 20,
        background: 'rgba(84,87,167,0.1)',
        border: '1.5px solid rgba(84,87,167,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28,
      }}>
        <Music2 size={34} color="#7B78D0" />
      </div>

      {/* Error code */}
      <p style={{
        fontSize: 13, fontWeight: 700,
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase', letterSpacing: '0.15em',
        marginBottom: 10,
      }}>
        Error 404
      </p>

      <h1 style={{
        fontSize: 36, fontWeight: 800, color: 'white',
        marginBottom: 10, letterSpacing: '-0.03em', lineHeight: 1.15,
      }}>
        Page not found
      </h1>

      <p style={{
        fontSize: 14, color: 'rgba(255,255,255,0.4)',
        lineHeight: 1.65, marginBottom: 36, fontWeight: 400,
        maxWidth: 320,
      }}>
        This page doesn't exist — like a lost b-side. Let's get you back to the music.
      </p>

      <Link to="/" className="notfound-btn">
        <Home size={16} />
        Back to Home
      </Link>
    </div>
  )
}
