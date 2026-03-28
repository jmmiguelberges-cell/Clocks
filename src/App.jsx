import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

const CSS = `
:root{--bg:#F5F5F5;--white:#FFF;--border:#EBEBEB;--border2:#DEDEDE;--text:#1A1A1A;--text2:#555;--text3:#999;--teal:#00B4B4;--teal-dark:#009E9E;--teal-bg:rgba(0,180,180,0.06);--teal-bg2:rgba(0,180,180,0.12);--yellow:#FFC107;--green:#43A047;--orange:#FB8C00;--red:#E53935;--red-bg:rgba(229,57,53,0.07);--green-bg:rgba(67,160,71,0.07);--orange-bg:rgba(251,140,0,0.07);--shadow:0 1px 3px rgba(0,0,0,0.05);--shadow-md:0 4px 12px rgba(0,0,0,0.08)}
*{margin:0;padding:0;box-sizing:border-box}body{background:var(--bg);color:var(--text);font-family:'DM Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--teal)!important;box-shadow:0 0 0 3px var(--teal-bg2)!important}
::-webkit-scrollbar{width:4px;height:0}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
.anim{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both}
.d1{animation-delay:40ms}.d2{animation-delay:80ms}.d3{animation-delay:120ms}.d4{animation-delay:160ms}.d5{animation-delay:200ms}
.scale-in{animation:scaleIn .35s cubic-bezier(.16,1,.3,1) both}
textarea{font-family:inherit;resize:none}img{display:block}
select{font-family:inherit;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px!important}
`

// ═══ HELPERS ═══
const dayL = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const dayF = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const MO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const toK = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const isT = d => toK(d) === toK(new Date())
const isP = d => { const t = new Date(); t.setHours(0,0,0,0); return d < t }
const fD = d => `${d.getDate()} de ${MO[d.getMonth()]}`
const fDF = d => `${dayF[d.getDay()]}, ${fD(d)}`
const fS = d => `${d.getDate()} ${MS[d.getMonth()]}`
const aM = (t, m) => { let [h, mi] = t.split(':').map(Number); mi += m; while (mi >= 60) { h++; mi -= 60 } return `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}` }
const gS = (o = '09:00', c = '20:00', step = 30) => { const s = []; let [h, m] = o.split(':').map(Number); const [ch, cm] = c.split(':').map(Number); while (h < ch || (h === ch && m < cm)) { s.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`); m += step; if (m >= 60) { h++; m -= 60 } } return s }
const gMD = (y, m) => { const f = new Date(y, m, 1), l = new Date(y, m + 1, 0); let s = f.getDay() - 1; if (s < 0) s = 6; const d = []; for (let i = 0; i < s; i++) d.push(null); for (let i = 1; i <= l.getDate(); i++) d.push(new Date(y, m, i)); return d }

const HERO = ['images/hero-1.jpg', 'images/hero-2.jpg', 'images/hero-3.jpg', 'images/hero-4.jpg']
const GALL = ['images/work-1.jpg', 'images/work-2.jpg', 'images/work-3.jpg', 'images/work-4.jpg', 'images/work-5.jpg', 'images/work-6.jpg']

// ═══ ATOMS ═══
const Sp = () => <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin .6s linear infinite' }} /></div>
const BB = ({ onClick, label }) => <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>{label}</button>

function Bt({ children, onClick, disabled, full, variant = 'primary', small, style: sx, ...rest }) {
  const p = variant === 'primary'
  return <button onClick={disabled ? undefined : onClick} style={{
    fontFamily: 'inherit', fontSize: small ? 13 : 15, fontWeight: 700, padding: small ? '9px 18px' : '14px 28px',
    width: full ? '100%' : 'auto', color: p ? '#fff' : variant === 'danger' ? 'var(--red)' : 'var(--text2)',
    background: p ? (disabled ? 'var(--border2)' : 'var(--teal)') : variant === 'danger' ? 'var(--red-bg)' : 'var(--white)',
    border: p ? 'none' : variant === 'danger' ? '1px solid rgba(229,57,53,0.15)' : '1px solid var(--border2)',
    borderRadius: small ? 8 : 10, cursor: disabled ? 'default' : 'pointer', transition: 'all .2s',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...sx
  }} {...rest}>{children}</button>
}

function In({ label, required, error, ...props }) {
  return <div style={{ marginBottom: 14 }}>
    {label && <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>{label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}</label>}
    <input {...props} style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: `1px solid ${error ? 'var(--red)' : 'var(--border2)'}`, borderRadius: 10, background: 'var(--white)', color: 'var(--text)', fontFamily: 'inherit', ...(props.style || {}) }} />
    {error && <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{error}</p>}
  </div>
}

function Sl({ label, children, ...props }) {
  return <div style={{ marginBottom: 14 }}>
    {label && <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, display: 'block' }}>{label}</label>}
    <select {...props} style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1px solid var(--border2)', borderRadius: 10, background: 'var(--white)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}>{children}</select>
  </div>
}

const Bg = ({ children, color = 'var(--teal)', bg = 'var(--teal-bg)' }) => <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{children}</span>
const Em = ({ icon, text }) => <div style={{ textAlign: 'center', padding: '48px 20px' }}><div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>{icon}</div><p style={{ fontSize: 14, color: 'var(--text3)' }}>{text}</p></div>

function Modal({ children }) {
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
    <div className="scale-in" style={{ background: 'var(--white)', borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', boxShadow: 'var(--shadow-md)', maxHeight: '90vh', overflowY: 'auto' }}>{children}</div>
  </div>
}

// ═══ LANDING ═══
function Landing({ svcs, stys, user, isA, onRes, onLog, onAcc, onAdm }) {
  const [hi, setHi] = useState(0)
  const [tab, setTab] = useState('servicios')
  const [q, setQ] = useState('')

  useEffect(() => { const t = setInterval(() => setHi(i => (i + 1) % HERO.length), 4500); return () => clearInterval(t) }, [])

  const fl = svcs.filter(s => s.name.toLowerCase().includes(q.toLowerCase()) || (s.description || '').toLowerCase().includes(q.toLowerCase()))
  const pop = fl.filter(s => s.category === 'popular')
  const oth = fl.filter(s => s.category !== 'popular')

  return <div style={{ paddingBottom: 80 }}>
    <div style={{ position: 'relative', height: 340, overflow: 'hidden', background: '#e0e0e0' }}>
      {HERO.map((src, i) => <div key={i} style={{ position: 'absolute', inset: 0, opacity: hi === i ? 1 : 0, transition: 'opacity .8s' }}>
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; e.target.parentElement.style.background = `hsl(${180 + i * 20},10%,${75 + i * 3}%)` }} />
      </div>)}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 3 }}>
        {HERO.map((_, i) => <button key={i} onClick={() => setHi(i)} style={{ width: hi === i ? 20 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: hi === i ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all .3s' }} />)}
      </div>
      <div style={{ position: 'absolute', top: 14, left: 14, zIndex: 3 }}>
        {user && <button onClick={onAcc} style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.12)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </button>}
      </div>
      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 3, display: 'flex', gap: 8 }}>
        {isA && <button onClick={onAdm} style={{ height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.12)', padding: '0 14px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', color: 'var(--teal)' }}>⚙ Admin</button>}
        {!user && <button onClick={onLog} style={{ height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.12)', padding: '0 14px', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', color: 'var(--text)' }}>Iniciar sesión</button>}
      </div>
    </div>
    <div style={{ background: 'var(--white)', padding: '22px 20px 18px', borderBottom: '1px solid var(--border)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Clocks Estudio Barbería</h1>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6 }}>Calle Portal, 33, 50740, Fuentes de Ebro</p>
      <p style={{ fontSize: 12, color: 'var(--text3)' }}>Barbería profesional · Fuentes de Ebro, Zaragoza</p>
    </div>
    <div style={{ display: 'flex', background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '0 20px', overflowX: 'auto' }}>
      {['SERVICIOS', 'EQUIPO', 'PORTAFOLIO', 'DETALLES'].map(t =>
        <button key={t} onClick={() => setTab(t.toLowerCase())} style={{ padding: '14px 0', marginRight: 24, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: tab === t.toLowerCase() ? 'var(--text)' : 'var(--text3)', borderBottom: tab === t.toLowerCase() ? '2.5px solid var(--text)' : '2.5px solid transparent', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t}</button>
      )}
    </div>

    {tab === 'servicios' && <div>
      <div style={{ padding: '14px 20px', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar servicios" style={{ border: 'none', background: 'none', fontSize: 14, color: 'var(--text)', width: '100%', outline: 'none', fontFamily: 'inherit' }} />
        </div>
      </div>
      {pop.length > 0 && <div style={{ background: 'var(--white)', padding: '20px 20px 8px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Servicios más populares</h2>
        {pop.map((s, i) => <LandingSvcRow key={s.id} s={s} onBook={() => onRes(s)} i={i} />)}
      </div>}
      {oth.length > 0 && <div style={{ background: 'var(--white)', padding: '20px 20px 8px', marginTop: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Otros servicios</h2>
        {oth.map((s, i) => <LandingSvcRow key={s.id} s={s} onBook={() => onRes(s)} i={i} />)}
      </div>}
    </div>}

    {tab === 'equipo' && <div style={{ background: 'var(--white)', padding: 20, marginTop: 8 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>Nuestro equipo</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {stys.map((s, i) => <div key={s.id} className={`anim d${i + 1}`} style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div style={{ height: 160, overflow: 'hidden', background: '#e0e0e0' }}>
            {s.photo_url ? <img src={s.photo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} /> :
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800, color: 'var(--border2)' }}>{s.name[0]}</div>}
          </div>
          <div style={{ padding: '12px 14px' }}><div style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</div><div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 500, marginTop: 2 }}>{s.role_title}</div></div>
        </div>)}
      </div>
    </div>}

    {tab === 'portafolio' && <div style={{ background: 'var(--white)', padding: 20, marginTop: 8 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>Nuestro trabajo</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, borderRadius: 12, overflow: 'hidden' }}>
        {GALL.map((src, i) => <div key={i} style={{ aspectRatio: '1', overflow: 'hidden', background: '#e0e0e0' }}>
          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
        </div>)}
      </div>
    </div>}

    {tab === 'detalles' && <div style={{ background: 'var(--white)', padding: 20, marginTop: 8 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>Información</h2>
      {[
        { i: '📍', l: 'Dirección', t: 'Calle Portal, 33\n50740, Fuentes de Ebro, Zaragoza' },
        { i: '🕐', l: 'Horario', t: 'Lunes — Viernes: 9:00 – 20:00\nSábado: 9:00 – 14:00\nDomingo: Cerrado' },
        { i: '📞', l: 'Teléfono', t: '+34 976 XXX XXX' },
        { i: '📸', l: 'Instagram', t: '@clocksestudio' }
      ].map((d, idx) => <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: idx < 3 ? '1px solid var(--border)' : 'none' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>{d.i}</div>
        <div><div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, marginBottom: 3 }}>{d.l}</div><div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{d.t}</div></div>
      </div>)}
    </div>}

    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--white)', borderTop: '1px solid var(--border)', padding: '12px 20px 18px', zIndex: 50, boxShadow: '0 -4px 12px rgba(0,0,0,0.05)' }}>
      <button onClick={() => onRes(null)} style={{ width: '100%', padding: 15, fontSize: 16, fontWeight: 700, color: '#fff', background: 'var(--teal)', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        Reservar cita <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
      </button>
    </div>
  </div>
}

function LandingSvcRow({ s, onBook, i }) {
  return <div className={`anim d${(i % 5) + 1}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid var(--border)' }}>
    <div style={{ flex: 1, paddingRight: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{s.name}</div>
      <div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.4 }}>{s.description}</div>
    </div>
    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
      <div><div style={{ fontSize: 16, fontWeight: 800 }}>{Number(s.price).toFixed(2)} €</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.duration} min</div></div>
      <button onClick={onBook} style={{ fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--teal)', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontFamily: 'inherit' }}>Reservar</button>
    </div>
  </div>
}

// ═══ AUTH ═══
function Auth({ onLogin, onBack }) {
  const [m, setM] = useState('login'), [em, setEm] = useState(''), [pw, setPw] = useState(''), [nm, setNm] = useState(''), [ph, setPh] = useState(''), [ld, setLd] = useState(false), [er, setEr] = useState('')
  const sub = async () => {
    setEr(''); setLd(true)
    try {
      if (m === 'register') {
        if (!nm.trim() || !em.trim() || !pw.trim()) { setEr('Rellena los campos obligatorios'); setLd(false); return }
        if (pw.length < 6) { setEr('Mínimo 6 caracteres'); setLd(false); return }
        const { data, error: e } = await supabase.auth.signUp({ email: em.trim(), password: pw, options: { data: { full_name: nm.trim(), phone: ph.trim() } } })
        if (e) throw e; if (data.user) onLogin(data.user)
      } else {
        if (!em.trim() || !pw.trim()) { setEr('Introduce email y contraseña'); setLd(false); return }
        const { data, error: e } = await supabase.auth.signInWithPassword({ email: em.trim(), password: pw })
        if (e) throw e; if (data.user) onLogin(data.user)
      }
    } catch (e) {
      if (e.message?.includes('Invalid login')) setEr('Email o contraseña incorrectos')
      else if (e.message?.includes('already registered')) setEr('Email ya registrado')
      else setEr(e.message || 'Error')
    }
    setLd(false)
  }
  return <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--white)' }}>
    <div style={{ padding: '12px 20px 0' }}><BB onClick={onBack} label="Volver" /></div>
    <div style={{ padding: '40px 28px 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 24, fontWeight: 800, color: '#fff', boxShadow: '0 4px 16px rgba(0,180,180,0.3)' }}>C</div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Clocks Estudio</h1>
      <p style={{ fontSize: 14, color: 'var(--text3)' }}>Accede para reservar tu cita</p>
    </div>
    <div style={{ display: 'flex', margin: '0 28px', background: 'var(--bg)', borderRadius: 10, padding: 3, marginBottom: 24 }}>
      {[['login', 'Iniciar sesión'], ['register', 'Crear cuenta']].map(([id, l]) => <button key={id} onClick={() => { setM(id); setEr('') }} style={{ flex: 1, padding: '11px 0', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, background: m === id ? 'var(--white)' : 'transparent', color: m === id ? 'var(--text)' : 'var(--text3)', border: 'none', borderRadius: 8, cursor: 'pointer', boxShadow: m === id ? 'var(--shadow)' : 'none' }}>{l}</button>)}
    </div>
    <div className="anim" style={{ padding: '0 28px 40px' }}>
      {m === 'register' && <><In label="Nombre completo" required value={nm} onChange={e => setNm(e.target.value)} placeholder="Tu nombre" /><In label="Teléfono" value={ph} onChange={e => setPh(e.target.value)} placeholder="612 345 678" /></>}
      <In label="Email" required type="email" value={em} onChange={e => setEm(e.target.value)} placeholder="tu@email.com" />
      <In label="Contraseña" required type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder={m === 'register' ? 'Mínimo 6 caracteres' : '••••••••'} />
      {er && <div style={{ padding: '11px 14px', background: 'var(--red-bg)', borderRadius: 8, marginBottom: 14 }}><p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 500 }}>{er}</p></div>}
      <Bt full onClick={sub} disabled={ld}>{ld ? 'Cargando...' : m === 'register' ? 'Crear cuenta' : 'Entrar'}</Bt>
      <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', marginTop: 18 }}>{m === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}<button onClick={() => { setM(m === 'login' ? 'register' : 'login'); setEr('') }} style={{ fontFamily: 'inherit', fontSize: 13, color: 'var(--teal)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>{m === 'login' ? 'Regístrate' : 'Inicia sesión'}</button></p>
    </div>
  </div>
}

// ═══ BOOKING ═══
function SvcRow({ s, sel, onClick, i }) {
  return <button onClick={onClick} className={`anim d${(i % 5) + 1}`} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', padding: sel ? '14px 12px' : '14px 0', borderRadius: sel ? 10 : 0, background: sel ? 'var(--teal-bg)' : 'transparent', border: sel ? '1.5px solid var(--teal)' : 'none', borderTop: sel ? 'none' : '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all .15s', marginBottom: sel ? 4 : 0 }}>
    <div style={{ flex: 1, paddingRight: 16 }}><div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: sel ? 'var(--teal)' : 'var(--text)', marginBottom: 3 }}>{s.name}</div><div style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.4 }}>{s.description}</div></div>
    <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: 16, fontWeight: 800 }}>{Number(s.price).toFixed(2)} €</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>{s.duration} min</div></div>
  </button>
}

function Booking({ user, profile, svcs, stys, pre, onDone, onBack }) {
  const [step, setStep] = useState(pre ? 1 : 0), [svc, setSvc] = useState(pre), [sty, setSty] = useState(null), [date, setDate] = useState(null), [time, setTime] = useState(null), [note, setNote] = useState(''), [cM, setCM] = useState(new Date().getMonth()), [cY, setCY] = useState(new Date().getFullYear()), [slots, setSlots] = useState([]), [sL, setSL] = useState(false), [bk, setBk] = useState(false)
  const [monthAvail, setMonthAvail] = useState({})

useEffect(() => {
  if (!sty) return
  ;(async () => {
    const startDate = `${cY}-${String(cM+1).padStart(2,'0')}-01`
    const endDate = `${cM === 11 ? cY+1 : cY}-${String(cM === 11 ? 1 : cM+2).padStart(2,'0')}-01`
    const [{data: bd}, {data: bl}] = await Promise.all([
      supabase.from('appointments').select('appointment_date,appointment_time,end_time').eq('stylist_id',sty.id).gte('appointment_date',startDate).lt('appointment_date',endDate).eq('status','confirmed'),
      supabase.from('blocked_slots').select('blocked_date,start_time,end_time').eq('stylist_id',sty.id).gte('blocked_date',startDate).lt('blocked_date',endDate),
    ])
    const avail = {}
    const daysInMonth = new Date(cY, cM+1, 0).getDate()
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(cY, cM, i)
      if (d.getDay() === 0) continue
      const dk = toK(d)
      const cl = d.getDay() === 6 ? '14:00' : '20:00'
      const totalSlots = gS('09:00', cl).length
      const tk = new Set()
      ;(bd||[]).filter(a => a.appointment_date === dk).forEach(a => {
        let c = a.appointment_time.slice(0,5); const e = a.end_time.slice(0,5)
        while(c<e){tk.add(c);c=aM(c,30)}
      })
      ;(bl||[]).filter(b => b.blocked_date === dk).forEach(b => {
        let c = b.start_time.slice(0,5); const e = b.end_time.slice(0,5)
        while(c<e){tk.add(c);c=aM(c,30)}
      })
      const free = totalSlots - tk.size
      avail[dk] = free > 10 ? 'green' : free > 5 ? 'yellow' : free > 0 ? 'orange' : 'none'
    }
    setMonthAvail(avail)
  })()
}, [cM, cY, sty])
  useEffect(() => { if (profile?.favorite_stylist_id && stys.length) { const f = stys.find(s => s.id === profile.favorite_stylist_id); if (f) setSty(f) } }, [profile, stys])

  useEffect(() => {
    if (!date || !sty) { setSlots([]); return }
    ;(async () => {
      setSL(true); const dk = toK(date)
      const [{ data: bd }, { data: bl }] = await Promise.all([
        supabase.from('appointments').select('appointment_time,end_time').eq('stylist_id', sty.id).eq('appointment_date', dk).eq('status', 'confirmed'),
        supabase.from('blocked_slots').select('start_time,end_time').eq('stylist_id', sty.id).eq('blocked_date', dk),
      ])
      const tk = new Set()
      ;(bd || []).forEach(a => { let c = a.appointment_time.slice(0, 5); const e = a.end_time.slice(0, 5); while (c < e) { tk.add(c); c = aM(c, 30) } })
      ;(bl || []).forEach(b => { let c = b.start_time.slice(0, 5); const e = b.end_time.slice(0, 5); while (c < e) { tk.add(c); c = aM(c, 30) } })
      const cl = date.getDay() === 6 ? '14:00' : '20:00', all = gS('09:00', cl), dur = svc?.duration || 30
      setSlots(all.filter(s => { const end = aM(s, dur); if (end > cl) return false; let c = s; while (c < end) { if (tk.has(c)) return false; c = aM(c, 30) } return true })); setSL(false)
    })()
  }, [date, sty, svc])

  const confirm = async () => {
    if (!svc || !sty || !date || !time) return; setBk(true)
    const { error } = await supabase.from('appointments').insert({ user_id: user.id, stylist_id: sty.id, service_id: svc.id, appointment_date: toK(date), appointment_time: time, end_time: aM(time, svc.duration), notes: note || null })
    setBk(false); if (!error) onDone({ service: svc, stylist: sty, date, time })
  }

  const pop = svcs.filter(s => s.category === 'popular'), oth = svcs.filter(s => s.category !== 'popular'), days = gMD(cY, cM), can = [!!svc, !!sty, !!(date && time)][step]

  return <div style={{ paddingBottom: 110 }}>
    <div style={{ padding: '8px 20px 0' }}><BB onClick={step > 0 ? () => { setStep(step - 1); if (step === 2) setTime(null) } : onBack} /></div>
    <div style={{ display: 'flex', gap: 6, padding: '4px 20px 18px' }}>{['Servicio', 'Profesional', 'Fecha y hora'].map((l, i) => <div key={i} style={{ flex: 1 }}><div style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--teal)' : 'var(--border)', transition: 'all .4s', marginBottom: 6 }} /><span style={{ fontSize: 10, fontWeight: i <= step ? 700 : 400, color: i <= step ? 'var(--teal)' : 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{l}</span></div>)}</div>

    {step === 0 && <div>
      {pop.length > 0 && <div style={{ background: 'var(--white)', padding: '20px 20px 8px' }}><h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Servicios más populares</h2>{pop.map((s, i) => <SvcRow key={s.id} s={s} sel={svc?.id === s.id} onClick={() => setSvc(s)} i={i} />)}</div>}
      {oth.length > 0 && <div style={{ background: 'var(--white)', padding: '20px 20px 8px', marginTop: 8 }}><h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>Otros servicios</h2>{oth.map((s, i) => <SvcRow key={s.id} s={s} sel={svc?.id === s.id} onClick={() => setSvc(s)} i={i} />)}</div>}
    </div>}

    {step === 1 && <div style={{ background: 'var(--white)', padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>Elige profesional</h2>
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
        {stys.map(s => { const sl = sty?.id === s.id; return <button key={s.id} onClick={() => setSty(s)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 80, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px', flexShrink: 0 }}>
          <div style={{ width: 60, height: 60, borderRadius: 30, background: 'var(--bg)', border: sl ? '3px solid var(--teal)' : '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: 'var(--text3)', overflow: 'hidden', position: 'relative' }}>
            {s.photo_url ? <img src={s.photo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.name[0]}
            {sl && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, background: 'var(--teal)', border: '2px solid var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg></div>}
          </div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 13, fontWeight: sl ? 700 : 500, color: sl ? 'var(--text)' : 'var(--text2)' }}>{s.name}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.role_title}</div></div>
        </button> })}
      </div>
    </div>}

    {step === 2 && <div style={{ background: 'var(--white)', padding: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>Seleccionar fecha y hora</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>{MO[cM]} {cY}</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => { if (cM === 0) { setCM(11); setCY(cY - 1) } else setCM(cM - 1) }} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg></button>
          <button onClick={() => { if (cM === 11) { setCM(0); setCY(cY + 1) } else setCM(cM + 1) }} style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>{dayL.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text3)', padding: '5px 0' }}>{d}</div>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {days.map((d, i) => {
          if (!d) return <div key={'e' + i} />
          const pa = isP(d), su = d.getDay() === 0, di = pa || su, sl = date && toK(date) === toK(d)
          return <button key={toK(d)} onClick={di ? undefined : () => { setDate(d); setTime(null) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 42, borderRadius: 21, background: 'transparent', border: sl ? '2px solid var(--teal)' : '2px solid transparent', cursor: di ? 'default' : 'pointer', opacity: di ? 0.25 : 1 }}><span style={{ fontSize: 13, fontWeight: isT(d) ? 700 : 400, color: sl ? 'var(--teal)' : 'var(--text)' }}>{d.getDate()}</span></button>
        })}
      </div>
      {date && <div className="anim" style={{ marginTop: 20 }}>
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text3)', marginBottom: 12 }}>{fDF(date)}</p>
        {sL ? <Sp /> : slots.length === 0 ? <p style={{ fontSize: 14, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>No hay horarios disponibles</p> :
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{slots.map(h => { const sl = time === h; return <button key={h} onClick={() => setTime(h)} style={{ padding: '11px 18px', fontSize: 14, fontWeight: 500, borderRadius: 22, background: sl ? 'var(--teal-bg)' : 'var(--white)', color: sl ? 'var(--teal)' : 'var(--text)', border: sl ? '1.5px solid var(--teal)' : '1.5px solid var(--border2)', cursor: 'pointer' }}>{h}</button> })}</div>}
      </div>}
      {time && svc && <div className="anim" style={{ marginTop: 20 }}>
        <div style={{ padding: 18, background: 'var(--bg)', borderRadius: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 15, fontWeight: 700 }}>{svc.name}</span><span style={{ fontSize: 15, fontWeight: 700 }}>{Number(svc.price).toFixed(2)} €</span></div>
          <p style={{ fontSize: 13, color: 'var(--text3)' }}>{time} — {aM(time, svc.duration)} · {sty?.name}</p>
        </div>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>¿Alguna nota para tu visita?</p>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Nota (opcional)" style={{ width: '100%', padding: 12, border: '1px solid var(--border2)', borderRadius: 10, fontSize: 14, minHeight: 60, color: 'var(--text)', background: 'var(--white)' }} />
      </div>}
    </div>}

    <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'var(--white)', borderTop: '1px solid var(--border)', padding: '12px 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50 }}>
      {svc ? <div><p style={{ fontSize: 12, color: 'var(--text3)' }}>1 servicio · {svc.duration}min</p><p style={{ fontSize: 20, fontWeight: 800 }}>{Number(svc.price).toFixed(2)} €</p></div> : <div />}
      <Bt onClick={step === 2 ? confirm : () => setStep(step + 1)} disabled={!can || bk}>{bk ? 'Reservando...' : step === 2 ? 'Confirmar reserva' : 'Continuar'}</Bt>
    </div>
  </div>
}

// ═══ ACCOUNT ═══
function Account({ user, profile, stys, onBook, onLogout, onBack, onUp }) {
  const [tab, setTab] = useState('upcoming'), [up, setUp] = useState([]), [hist, setHist] = useState([]), [ld, setLd] = useState(true)
  const load = useCallback(async () => {
    const td = toK(new Date())
    const [{ data: u }, { data: h }] = await Promise.all([
      supabase.from('appointments').select('*,stylists(name),services(name,price,duration)').eq('user_id', user.id).gte('appointment_date', td).eq('status', 'confirmed').order('appointment_date'),
      supabase.from('appointments').select('*,stylists(name),services(name,price,duration)').eq('user_id', user.id).or(`appointment_date.lt.${td},status.eq.completed,status.eq.cancelled`).order('appointment_date', { ascending: false }).limit(20),
    ])
    setUp(u || []); setHist(h || []); setLd(false)
  }, [user.id])
  useEffect(() => { load() }, [load])
  const cancel = async id => { await supabase.from('appointments').update({ status: 'cancelled', cancelled_by: 'client' }).eq('id', id); load() }
  const setFav = async sid => { const v = profile?.favorite_stylist_id === sid ? null : sid; await supabase.from('profiles').update({ favorite_stylist_id: v }).eq('id', user.id); onUp({ ...profile, favorite_stylist_id: v }) }
  const togR = async () => { const v = !profile?.email_reminders; await supabase.from('profiles').update({ email_reminders: v }).eq('id', user.id); onUp({ ...profile, email_reminders: v }) }
  const ini = (profile?.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase()
  if (ld) return <Sp />

  return <div>
    <div style={{ padding: '8px 20px 0' }}><BB onClick={onBack} label="Volver" /></div>
    <div style={{ padding: '8px 20px 20px', background: 'var(--white)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>{ini}</div>
        <div style={{ flex: 1 }}><div style={{ fontSize: 17, fontWeight: 700 }}>{profile?.full_name}</div><div style={{ fontSize: 13, color: 'var(--text3)' }}>{user.email}</div></div>
        <button onClick={onLogout} style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>Salir</button>
      </div>
      <Bt full onClick={onBook}>+ Nueva reserva</Bt>
    </div>
    <div style={{ display: 'flex', background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
      {[['upcoming', 'Próximas', up.length], ['history', 'Historial', hist.length], ['settings', 'Ajustes', null]].map(([id, l, c]) =>
        <button key={id} onClick={() => setTab(id)} style={{ padding: '13px 12px', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', color: tab === id ? 'var(--teal)' : 'var(--text3)', borderBottom: tab === id ? '2px solid var(--teal)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 5 }}>{l}{c !== null && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: tab === id ? 'var(--teal)' : 'var(--text3)', padding: '1px 6px', borderRadius: 10 }}>{c}</span>}</button>
      )}
    </div>
    <div style={{ padding: 20 }}>
      {tab === 'upcoming' && (up.length === 0 ? <Em icon="📅" text="No tienes citas programadas" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{up.map(a =>
          <div key={a.id} className="anim" style={{ padding: 16, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div><div style={{ fontSize: 15, fontWeight: 700 }}>{a.services?.name}</div><div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>con {a.stylists?.name}</div></div>
              <div style={{ textAlign: 'right' }}><div style={{ fontSize: 14, fontWeight: 600 }}>{fS(new Date(a.appointment_date))}</div><div style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600 }}>{a.appointment_time?.slice(0, 5)}h</div></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Bt small variant="danger" onClick={() => cancel(a.id)}>Cancelar cita</Bt></div>
          </div>
        )}</div>
      )}
      {tab === 'history' && (hist.length === 0 ? <Em icon="📋" text="Sin visitas anteriores" /> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{hist.map(a =>
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, opacity: a.status === 'cancelled' ? 0.5 : 1 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{a.services?.name}</div><div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{a.stylists?.name} · {fS(new Date(a.appointment_date))}</div></div>
            <div style={{ fontSize: 14, fontWeight: 700, color: a.status === 'cancelled' ? 'var(--red)' : 'var(--text)' }}>{a.status === 'cancelled' ? 'Cancelada' : `${Number(a.services?.price).toFixed(2)} €`}</div>
          </div>
        )}</div>
      )}
      {tab === 'settings' && <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}><span style={{ fontSize: 14, fontWeight: 700 }}>Profesional favorito</span></div>
          <div style={{ padding: '6px 16px' }}>{stys.map(s => { const f = profile?.favorite_stylist_id === s.id; return <button key={s.id} onClick={() => setFav(s.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text3)' }}>{s.name[0]}</div>
            <div style={{ flex: 1, textAlign: 'left' }}><div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div></div>
            <div style={{ width: 20, height: 20, borderRadius: 10, border: f ? 'none' : '2px solid var(--border2)', background: f ? 'var(--teal)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{f && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}</div>
          </button> })}</div>
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><span style={{ fontSize: 14, fontWeight: 700 }}>Recordatorios email</span><p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>24h antes de cada cita</p></div>
          <button onClick={togR} style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', border: 'none', background: profile?.email_reminders ? 'var(--teal)' : 'var(--border)', transition: 'all .3s' }}><div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2, left: profile?.email_reminders ? 22 : 2, transition: 'all .3s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} /></button>
        </div>
        <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: 'block' }}>Datos personales</span>
          {[['Nombre', profile?.full_name], ['Email', user.email], ['Teléfono', profile?.phone || '—']].map(([k, v]) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}><span style={{ color: 'var(--text3)' }}>{k}</span><span style={{ fontWeight: 500 }}>{v}</span></div>)}
        </div>
      </div>}
    </div>
  </div>
}

// ═══ ADMIN ═══
function Admin({ user, onBack, onDataChanged }) {
  const [tab, setTab] = useState('cal'), [sd, setSd] = useState(new Date()), [ap, setAp] = useState([]), [profiles, setProfiles] = useState({}), [bl, setBl] = useState([]), [st, setSt] = useState([]), [sv, setSv] = useState([]), [ld, setLd] = useState(true), [cM, setCM] = useState(new Date().getMonth()), [cY, setCY] = useState(new Date().getFullYear())
  const [showBlock, setShowBlock] = useState(false), [bS, setBS] = useState(null), [bD, setBD] = useState(toK(new Date())), [bSt, setBSt] = useState('09:00'), [bE, setBE] = useState('10:00'), [bR, setBR] = useState('')
  const [editSvc, setEditSvc] = useState(null), [editSty, setEditSty] = useState(null), [delConfirm, setDelConfirm] = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(null)

  const loadDay = useCallback(async d => {
    const dk = toK(d)
    const [{ data: a }, { data: b }, { data: s }, { data: v }] = await Promise.all([
      supabase.from('appointments').select('*,stylists(name),services(name,price,duration)').eq('appointment_date', dk).order('appointment_time'),
      supabase.from('blocked_slots').select('*,stylists(name)').eq('blocked_date', dk).order('start_time'),
      supabase.from('stylists').select('*').order('display_order'),
      supabase.from('services').select('*').order('display_order'),
    ])
    setAp(a || []); setBl(b || []); setSt(s || []); setSv(v || [])
    if (!bS && s?.length) setBS(s[0].id)
    const userIds = [...new Set((a || []).map(x => x.user_id).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id,full_name,phone').in('id', userIds)
      const map = {}; (profs || []).forEach(p => { map[p.id] = p }); setProfiles(map)
    } else { setProfiles({}) }
    setLd(false)
  }, [bS])

  useEffect(() => { loadDay(sd) }, [sd])

  const reloadLists = async () => {
    const [{ data: s }, { data: v }] = await Promise.all([supabase.from('stylists').select('*').order('display_order'), supabase.from('services').select('*').order('display_order')])
    setSt(s || []); setSv(v || []); if (onDataChanged) onDataChanged()
  }

  const doCancelAppt = async id => { await supabase.from('appointments').update({ status: 'cancelled', cancelled_by: 'admin' }).eq('id', id); setCancelConfirm(null); loadDay(sd) }
  const addBlock = async () => { await supabase.from('blocked_slots').insert({ stylist_id: bS, blocked_date: bD, start_time: bSt, end_time: bE, reason: bR || 'Bloqueado', created_by: user.id }); setShowBlock(false); setBR(''); loadDay(sd) }
  const rmBlock = async id => { await supabase.from('blocked_slots').delete().eq('id', id); loadDay(sd) }
  const saveSvc = async data => { if (data.id) { await supabase.from('services').update({ name: data.name, description: data.description, duration: data.duration, price: data.price, category: data.category }).eq('id', data.id) } else { const mx = sv.reduce((m, s) => Math.max(m, s.display_order || 0), 0); await supabase.from('services').insert({ ...data, display_order: mx + 1, active: true }) } setEditSvc(null); reloadLists() }
  const delSvc = async id => { await supabase.from('services').delete().eq('id', id); setDelConfirm(null); reloadLists() }
  const saveSty = async data => { if (data.id) { await supabase.from('stylists').update({ name: data.name, username: data.username, role_title: data.role_title, photo_url: data.photo_url, active: data.active }).eq('id', data.id) } else { const mx = st.reduce((m, s) => Math.max(m, s.display_order || 0), 0); await supabase.from('stylists').insert({ ...data, display_order: mx + 1, active: true }) } setEditSty(null); reloadLists() }
  const delSty = async id => { await supabase.from('stylists').delete().eq('id', id); setDelConfirm(null); reloadLists() }

  const stMap = { confirmed: { l: 'Confirmada', c: 'var(--green)', bg: 'var(--green-bg)' }, cancelled: { l: 'Cancelada', c: 'var(--red)', bg: 'var(--red-bg)' }, completed: { l: 'Completada', c: 'var(--text3)', bg: 'var(--bg)' }, no_show: { l: 'No vino', c: 'var(--orange)', bg: 'var(--orange-bg)' } }
  const days = gMD(cY, cM), cf = ap.filter(a => a.status === 'confirmed').length
  if (ld) return <Sp />

  return <div style={{ minHeight: '100vh' }}>
    <div style={{ padding: '14px 20px', background: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff' }}>C</div><div><div style={{ fontSize: 16, fontWeight: 800 }}>Panel Admin</div><div style={{ fontSize: 10, color: 'var(--text3)' }}>Gestión de citas</div></div></div>
      <Bt small variant="secondary" onClick={onBack}>← Salir</Bt>
    </div>
    <div style={{ display: 'flex', background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '0 20px' }}>
      {[['cal', '📅 Calendario'], ['team', '👤 Equipo'], ['svc', '✂️ Servicios']].map(([id, l]) => <button key={id} onClick={() => setTab(id)} style={{ padding: '13px 14px', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', color: tab === id ? 'var(--teal)' : 'var(--text3)', borderBottom: tab === id ? '2px solid var(--teal)' : '2px solid transparent' }}>{l}</button>)}
    </div>

    <div style={{ padding: 20 }}>
      {tab === 'cal' && <div>
        <div style={{ background: 'var(--white)', borderRadius: 12, border: '1px solid var(--border)', padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>{MO[cM]} {cY}</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => { if (cM === 0) { setCM(11); setCY(cY - 1) } else setCM(cM - 1) }} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg></button>
              <button onClick={() => { if (cM === 11) { setCM(0); setCY(cY + 1) } else setCM(cM + 1) }} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg></button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {dayL.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text3)', padding: '3px 0' }}>{d}</div>)}
            {days.map((d, i) => { if (!d) return <div key={'e' + i} />; const sl = toK(sd) === toK(d); return <button key={toK(d)} onClick={() => setSd(d)} style={{ height: 30, borderRadius: 15, background: sl ? 'var(--teal)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: sl || isT(d) ? 700 : 400, color: sl ? '#fff' : 'var(--text)' }}>{d.getDate()}</button> })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div><h3 style={{ fontSize: 16, fontWeight: 700 }}>{fDF(sd)}</h3><p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{cf} cita{cf !== 1 ? 's' : ''}</p></div>
          <Bt small variant="secondary" onClick={() => { setBD(toK(sd)); setShowBlock(true) }}>🚫 Bloquear</Bt>
        </div>

        {bl.map(b => <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--red-bg)', border: '1px solid rgba(229,57,53,0.1)', borderRadius: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', minWidth: 44 }}>{b.start_time?.slice(0, 5)}</span>
          <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>{b.reason}</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>{b.stylists?.name}</div></div>
          <button onClick={() => rmBlock(b.id)} style={{ fontSize: 11, color: 'var(--red)', background: 'none', border: '1px solid rgba(229,57,53,0.2)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Quitar</button>
        </div>)}

        {ap.length === 0 && bl.length === 0 && <Em icon="📅" text="Sin citas este día" />}
        {ap.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)).map(a => {
          const s = stMap[a.status] || stMap.confirmed; const prof = profiles[a.user_id]
          return <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8, opacity: a.status === 'cancelled' ? 0.4 : 1, boxShadow: 'var(--shadow)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)', minWidth: 44 }}>{a.appointment_time?.slice(0, 5)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{prof?.full_name || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{a.services?.name} · {a.stylists?.name}</div>
              {prof?.phone && <div style={{ fontSize: 11, color: 'var(--text3)' }}>📞 {prof.phone}</div>}
            </div>
            <Bg color={s.c} bg={s.bg}>{s.l}</Bg>
            {a.status === 'confirmed' && <button onClick={() => setCancelConfirm({ id: a.id, name: prof?.full_name || '—', service: a.services?.name, time: a.appointment_time?.slice(0, 5) })} style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(229,57,53,0.12)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>}
          </div>
        })}

        {/* Cancel confirmation modal */}
        {cancelConfirm && <Modal>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>¿Cancelar esta cita?</h3>
          <div style={{ padding: 16, background: 'var(--bg)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{cancelConfirm.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{cancelConfirm.service} · {cancelConfirm.time}h</div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 20 }}>El cliente será notificado de la cancelación.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Bt variant="secondary" onClick={() => setCancelConfirm(null)} style={{ flex: 1 }}>Volver</Bt>
            <Bt variant="danger" onClick={() => doCancelAppt(cancelConfirm.id)} style={{ flex: 1 }}>Cancelar cita</Bt>
          </div>
        </Modal>}

        {showBlock && <Modal>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>Bloquear horario</h3>
          <Sl label="Profesional" value={bS} onChange={e => setBS(Number(e.target.value))}>{st.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Sl>
          <In label="Fecha" type="date" value={bD} onChange={e => setBD(e.target.value)} />
          <div style={{ display: 'flex', gap: 10 }}><div style={{ flex: 1 }}><Sl label="Desde" value={bSt} onChange={e => setBSt(e.target.value)}>{gS().map(h => <option key={h} value={h}>{h}</option>)}</Sl></div><div style={{ flex: 1 }}><Sl label="Hasta" value={bE} onChange={e => setBE(e.target.value)}>{gS('09:30', '20:30').map(h => <option key={h} value={h}>{h}</option>)}</Sl></div></div>
          <In label="Motivo" value={bR} onChange={e => setBR(e.target.value)} placeholder="Ej: Descanso..." />
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}><Bt variant="secondary" onClick={() => setShowBlock(false)} style={{ flex: 1 }}>Cancelar</Bt><Bt onClick={addBlock} style={{ flex: 1 }}>Bloquear</Bt></div>
        </Modal>}
      </div>}

      {tab === 'team' && <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><h2 style={{ fontSize: 18, fontWeight: 800 }}>Equipo</h2><Bt small onClick={() => setEditSty({ name: '', username: '', role_title: 'Barbero', photo_url: '', active: true })}>+ Añadir</Bt></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {st.map((s, i) => <div key={s.id} className={`anim d${i + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', opacity: s.active ? 1 : 0.5 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--teal)', overflow: 'hidden', flexShrink: 0 }}>
              {s.photo_url ? <img src={s.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : s.name[0]}
            </div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.role_title} · {s.username || '—'}</div></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditSty(s)} style={{ fontSize: 12, color: 'var(--teal)', background: 'var(--teal-bg)', border: '1px solid var(--teal)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
              <button onClick={() => setDelConfirm({ type: 'stylist', id: s.id, name: s.name })} style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(229,57,53,0.15)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            </div>
          </div>)}
        </div>
      </div>}

      {tab === 'svc' && <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><h2 style={{ fontSize: 18, fontWeight: 800 }}>Servicios</h2><Bt small onClick={() => setEditSvc({ name: '', description: '', duration: 30, price: 0, category: 'popular' })}>+ Añadir</Bt></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sv.map((s, i) => <div key={s.id} className={`anim d${(i % 5) + 1}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow)', opacity: s.active ? 1 : 0.5 }}>
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div><div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{s.duration} min · {s.category === 'popular' ? '⭐ Popular' : 'Otro'}</div></div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--teal)', marginRight: 8 }}>{Number(s.price).toFixed(2)} €</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditSvc(s)} style={{ fontSize: 12, color: 'var(--teal)', background: 'var(--teal-bg)', border: '1px solid var(--teal)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
              <button onClick={() => setDelConfirm({ type: 'service', id: s.id, name: s.name })} style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)', border: '1px solid rgba(229,57,53,0.15)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
            </div>
          </div>)}
        </div>
      </div>}
    </div>

    {editSvc && <SvcModal data={editSvc} onSave={saveSvc} onClose={() => setEditSvc(null)} />}
    {editSty && <StyModal data={editSty} onSave={saveSty} onClose={() => setEditSty(null)} />}
    {delConfirm && <Modal><h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 12 }}>¿Eliminar {delConfirm.name}?</h3><p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 20 }}>Esta acción no se puede deshacer.</p><div style={{ display: 'flex', gap: 10 }}><Bt variant="secondary" onClick={() => setDelConfirm(null)} style={{ flex: 1 }}>Cancelar</Bt><Bt variant="danger" onClick={() => delConfirm.type === 'service' ? delSvc(delConfirm.id) : delSty(delConfirm.id)} style={{ flex: 1 }}>Eliminar</Bt></div></Modal>}
  </div>
}

function SvcModal({ data, onSave, onClose }) {
  const [name, setName] = useState(data.name || ''), [desc, setDesc] = useState(data.description || ''), [dur, setDur] = useState(data.duration || 30), [price, setPrice] = useState(data.price || 0), [cat, setCat] = useState(data.category || 'popular')
  return <Modal>
    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>{data.id ? 'Editar servicio' : 'Nuevo servicio'}</h3>
    <In label="Nombre" required value={name} onChange={e => setName(e.target.value)} placeholder="Ej: CORTE CLOCKS" />
    <In label="Descripción" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción corta" />
    <div style={{ display: 'flex', gap: 10 }}><div style={{ flex: 1 }}><In label="Duración (min)" type="number" value={dur} onChange={e => setDur(parseInt(e.target.value) || 0)} /></div><div style={{ flex: 1 }}><In label="Precio (€)" type="number" step="0.01" value={price} onChange={e => setPrice(parseFloat(e.target.value) || 0)} /></div></div>
    <Sl label="Categoría" value={cat} onChange={e => setCat(e.target.value)}><option value="popular">⭐ Popular</option><option value="other">Otro</option></Sl>
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}><Bt variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</Bt><Bt onClick={() => onSave({ ...data, name, description: desc, duration: dur, price, category: cat })} disabled={!name.trim()} style={{ flex: 1 }}>Guardar</Bt></div>
  </Modal>
}

function StyModal({ data, onSave, onClose }) {
  const [name, setName] = useState(data.name || ''), [username, setUsername] = useState(data.username || ''), [role, setRole] = useState(data.role_title || 'Barbero'), [photo, setPhoto] = useState(data.photo_url || ''), [active, setActive] = useState(data.active !== false)
  return <Modal>
    <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18 }}>{data.id ? 'Editar profesional' : 'Nuevo profesional'}</h3>
    <In label="Nombre" required value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" />
    <In label="Username" value={username} onChange={e => setUsername(e.target.value)} placeholder="@usuario" />
    <In label="Rol" value={role} onChange={e => setRole(e.target.value)} placeholder="Ej: Barbero" />
    <In label="URL foto" value={photo} onChange={e => setPhoto(e.target.value)} placeholder="/images/team-nombre.jpg" />
    {photo && <div style={{ marginBottom: 14, borderRadius: 8, overflow: 'hidden', height: 80, width: 80, background: 'var(--bg)' }}><img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} /></div>}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>Activo</span>
      <button onClick={() => setActive(!active)} style={{ width: 44, height: 24, borderRadius: 12, position: 'relative', cursor: 'pointer', border: 'none', background: active ? 'var(--teal)' : 'var(--border)', transition: 'all .3s' }}><div style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2, left: active ? 22 : 2, transition: 'all .3s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} /></button>
    </div>
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}><Bt variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancelar</Bt><Bt onClick={() => onSave({ ...data, name, username, role_title: role, photo_url: photo, active })} disabled={!name.trim()} style={{ flex: 1 }}>Guardar</Bt></div>
  </Modal>
}

// ═══ DONE ═══
function Done({ bk, onR }) {
  return <div className="scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 28px', textAlign: 'center', minHeight: '80vh' }}>
    <div style={{ width: 76, height: 76, borderRadius: 38, background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div>
    <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>¡Reserva confirmada!</h1>
    <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.7, maxWidth: 300 }}><strong>{bk.service.name}</strong> con {bk.stylist.name}<br />{fDF(bk.date)} a las <strong>{bk.time}h</strong></p>
    <div style={{ marginTop: 14, padding: '11px 22px', background: 'var(--bg)', borderRadius: 10, fontSize: 13, color: 'var(--text2)' }}>📩 Recibirás confirmación por email</div>
    <Bt onClick={onR} style={{ marginTop: 28 }}>Volver al inicio</Bt>
  </div>
}

// ═══ MAIN ═══
export default function App() {
  const [user, setUser] = useState(null), [profile, setProfile] = useState(null), [view, setView] = useState('loading'), [svcs, setSvcs] = useState([]), [stys, setStys] = useState([]), [lb, setLb] = useState(null), [ps, setPs] = useState(null)

  const loadPublic = async () => {
    const [{ data: sv }, { data: st }] = await Promise.all([
      supabase.from('services').select('*').eq('active', true).order('display_order'),
      supabase.from('stylists').select('*').eq('active', true).order('display_order'),
    ])
    setSvcs(sv || []); setStys(st || [])
  }

  useEffect(() => {
    loadPublic()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); lP(session.user.id) }
      setView('landing')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) { setUser(s.user); lP(s.user.id) } else { setUser(null); setProfile(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const lP = async id => { const { data } = await supabase.from('profiles').select('*').eq('id', id).single(); setProfile(data) }
  const hL = u => { setUser(u); lP(u.id); if (ps) setView('booking'); else setView('landing') }
  const hO = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); setView('landing') }
  const hR = s => { setPs(s); if (user) setView('booking'); else setView('auth') }
  const isA = profile?.role === 'admin'

  if (view === 'loading') return <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><style>{CSS}</style><Sp /></div>

  return <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', boxShadow: '0 0 40px rgba(0,0,0,0.03)' }}>
    <style>{CSS}</style>
    {view === 'landing' && <Landing svcs={svcs} stys={stys} user={user} isA={isA} onRes={hR} onLog={() => setView('auth')} onAcc={() => setView('account')} onAdm={() => setView('admin')} />}
    {view === 'auth' && <Auth onLogin={hL} onBack={() => setView('landing')} />}
    {view === 'booking' && user && <Booking user={user} profile={profile} svcs={svcs} stys={stys} pre={ps} onDone={b => { setLb(b); setView('done') }} onBack={() => setView('landing')} />}
    {view === 'account' && user && <Account user={user} profile={profile} stys={stys} onBook={() => { setPs(null); setView('booking') }} onLogout={hO} onBack={() => setView('landing')} onUp={setProfile} />}
    {view === 'done' && lb && <Done bk={lb} onR={() => setView('landing')} />}
    {view === 'admin' && user && <Admin user={user} onBack={() => setView('landing')} onDataChanged={loadPublic} />}
  </div>
}
