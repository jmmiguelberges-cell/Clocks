import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ─── STYLES ──────────────────────────────────────────────────
const CSS = `
:root {
  --bg:#F7F7F7;--white:#FFFFFF;
  --border:#EBEBEB;--border2:#E0E0E0;
  --text:#1A1A1A;--text2:#555;--text3:#999;
  --teal:#00B4B4;--teal-dark:#009E9E;
  --teal-bg:rgba(0,180,180,0.06);--teal-bg2:rgba(0,180,180,0.12);
  --yellow:#FFC107;--green:#4CAF50;--orange:#FF9800;--red:#E53935;
  --red-bg:rgba(229,57,53,0.08);--green-bg:rgba(76,175,80,0.08);
  --shadow:0 1px 4px rgba(0,0,0,0.06);
  --shadow-md:0 4px 16px rgba(0,0,0,0.08);
}
body{background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--teal)!important;box-shadow:0 0 0 3px var(--teal-bg2)!important}
::-webkit-scrollbar{width:0;height:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
.anim{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
.scale-in{animation:scaleIn .35s cubic-bezier(.16,1,.3,1) both}
textarea{font-family:'DM Sans',system-ui,sans-serif;resize:none}
`

// ─── HELPERS ─────────────────────────────────────────────────
const dayLabels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const dayFull = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const toDateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const isToday = d => toDateKey(d) === toDateKey(new Date())
const isPast = d => { const t = new Date(); t.setHours(0,0,0,0); return d < t }
const fmtDate = d => `${d.getDate()} de ${months[d.getMonth()]}`
const fmtDateFull = d => `${dayFull[d.getDay()]}, ${fmtDate(d)}`

const generateSlots = (open = '09:00', close = '20:00', step = 30) => {
  const slots = []
  let [h, m] = open.split(':').map(Number)
  const [ch, cm] = close.split(':').map(Number)
  while (h < ch || (h === ch && m < cm)) {
    slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    m += step
    if (m >= 60) { h++; m -= 60 }
  }
  return slots
}

const ALL_SLOTS = generateSlots()

const addMinutes = (time, mins) => {
  let [h, m] = time.split(':').map(Number)
  m += mins
  while (m >= 60) { h++; m -= 60 }
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

const getMonthDays = (year, month) => {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  let start = first.getDay() - 1
  if (start < 0) start = 6
  const days = []
  for (let i = 0; i < start; i++) days.push(null)
  for (let i = 1; i <= last.getDate(); i++) days.push(new Date(year, month, i))
  return days
}

// ─── SHARED COMPONENTS ───────────────────────────────────────

const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', padding:40 }}>
    <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--teal)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background:'none', border:'none', cursor:'pointer', padding:'12px 0', display:'flex', alignItems:'center', color:'var(--text)' }}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
  </button>
)

const Input = ({ label, required, error, ...props }) => (
  <div style={{ marginBottom:16 }}>
    {label && <label style={{ fontSize:13, fontWeight:600, marginBottom:6, display:'block', color:'var(--text)' }}>{label}{required && <span style={{ color:'var(--red)', marginLeft:3 }}>*</span>}</label>}
    <input {...props} style={{ width:'100%', padding:'13px 16px', fontSize:14, border:`1px solid ${error ? 'var(--red)' : 'var(--border2)'}`, borderRadius:10, background:'var(--white)', color:'var(--text)', fontFamily:'inherit', ...props.style }} />
    {error && <p style={{ fontSize:12, color:'var(--red)', marginTop:4 }}>{error}</p>}
  </div>
)

const Btn = ({ children, onClick, disabled, full, variant = 'primary', small, ...props }) => {
  const isPrimary = variant === 'primary'
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      fontFamily:'inherit', fontSize: small ? 13 : 15, fontWeight:700,
      padding: small ? '10px 20px' : '15px 32px',
      width: full ? '100%' : 'auto',
      color: isPrimary ? '#fff' : 'var(--text2)',
      background: isPrimary ? (disabled ? 'var(--border2)' : 'var(--teal)') : 'var(--white)',
      border: isPrimary ? 'none' : '1px solid var(--border2)',
      borderRadius:10, cursor: disabled ? 'default' : 'pointer',
      transition:'all 0.2s', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:8,
    }} {...props}>{children}</button>
  )
}

// ─── AUTH SCREEN ─────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    try {
      if (mode === 'register') {
        if (!name.trim() || !email.trim() || !password.trim()) {
          setError('Rellena todos los campos obligatorios')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres')
          setLoading(false)
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              phone: phone.trim(),
            }
          }
        })

        if (signUpError) throw signUpError
        if (data.user) onLogin(data.user)

      } else {
        if (!email.trim() || !password.trim()) {
          setError('Introduce tu email y contraseña')
          setLoading(false)
          return
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (signInError) throw signInError
        if (data.user) onLogin(data.user)
      }
    } catch (err) {
      if (err.message.includes('Invalid login')) setError('Email o contraseña incorrectos')
      else if (err.message.includes('already registered')) setError('Este email ya está registrado. Inicia sesión.')
      else setError(err.message)
    }

    setLoading(false)
  }

  return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'var(--white)' }}>
      <div style={{ padding:'60px 28px 40px', textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:14, background:'var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:24, fontWeight:800, color:'#fff' }}>C</div>
        <h1 style={{ fontSize:24, fontWeight:800, marginBottom:4 }}>Clocks Estudio</h1>
        <p style={{ fontSize:14, color:'var(--text3)' }}>Reserva tu cita online</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', margin:'0 28px', background:'var(--bg)', borderRadius:10, padding:3, marginBottom:28 }}>
        {[['login','Iniciar sesión'],['register','Crear cuenta']].map(([id,label]) => (
          <button key={id} onClick={() => { setMode(id); setError('') }} style={{
            flex:1, padding:'11px 0', fontFamily:'inherit', fontSize:14, fontWeight:600,
            background: mode===id ? 'var(--white)' : 'transparent',
            color: mode===id ? 'var(--text)' : 'var(--text3)',
            border:'none', borderRadius:8, cursor:'pointer',
            boxShadow: mode===id ? 'var(--shadow)' : 'none', transition:'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      <div className="anim" style={{ padding:'0 28px 40px' }}>
        {mode === 'register' && (
          <>
            <Input label="Nombre completo" required value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" />
            <Input label="Teléfono" value={phone} onChange={e => setPhone(e.target.value)} placeholder="612 345 678" />
          </>
        )}
        <Input label="Email" required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
        <Input label="Contraseña" required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'Mínimo 6 caracteres' : '••••••••'} />

        {error && (
          <div style={{ padding:'12px 16px', background:'var(--red-bg)', borderRadius:8, marginBottom:16 }}>
            <p style={{ fontSize:13, color:'var(--red)', fontWeight:500 }}>{error}</p>
          </div>
        )}

        <Btn full onClick={handleSubmit} disabled={loading}>
          {loading ? 'Cargando...' : mode === 'register' ? 'Crear cuenta' : 'Entrar'}
        </Btn>

        <p style={{ fontSize:13, color:'var(--text3)', textAlign:'center', marginTop:20 }}>
          {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ fontFamily:'inherit', fontSize:13, color:'var(--teal)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
          </button>
        </p>
      </div>
    </div>
  )
}

// ─── BOOKING FLOW ────────────────────────────────────────────

function BookingFlow({ user, profile, onDone, onBack }) {
  const [step, setStep] = useState(0)
  const [services, setServices] = useState([])
  const [stylists, setStylists] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [selectedStylist, setSelectedStylist] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedTime, setSelectedTime] = useState(null)
  const [note, setNote] = useState('')
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [availableSlots, setAvailableSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load services & stylists
  useEffect(() => {
    const load = async () => {
      const [{ data: svcs }, { data: stys }] = await Promise.all([
        supabase.from('services').select('*').eq('active', true).order('display_order'),
        supabase.from('stylists').select('*').eq('active', true).order('display_order'),
      ])
      setServices(svcs || [])
      setStylists(stys || [])
      setLoading(false)
    }
    load()
  }, [])

  // Pre-select favorite stylist
  useEffect(() => {
    if (profile?.favorite_stylist_id && stylists.length) {
      const fav = stylists.find(s => s.id === profile.favorite_stylist_id)
      if (fav) setSelectedStylist(fav)
    }
  }, [profile, stylists])

  // Load available slots when date or stylist changes
  useEffect(() => {
    if (!selectedDate || !selectedStylist) { setAvailableSlots([]); return }
    const loadSlots = async () => {
      setSlotsLoading(true)
      const dateKey = toDateKey(selectedDate)

      // Get booked appointments
      const { data: booked } = await supabase
        .from('appointments')
        .select('appointment_time, end_time')
        .eq('stylist_id', selectedStylist.id)
        .eq('appointment_date', dateKey)
        .eq('status', 'confirmed')

      // Get blocked slots
      const { data: blocked } = await supabase
        .from('blocked_slots')
        .select('start_time, end_time')
        .eq('stylist_id', selectedStylist.id)
        .eq('blocked_date', dateKey)

      const bookedTimes = new Set()
      ;(booked || []).forEach(a => {
        const start = a.appointment_time.slice(0, 5)
        const end = a.end_time.slice(0, 5)
        let cur = start
        while (cur < end) {
          bookedTimes.add(cur)
          cur = addMinutes(cur, 30)
        }
      })
      ;(blocked || []).forEach(b => {
        const start = b.start_time.slice(0, 5)
        const end = b.end_time.slice(0, 5)
        let cur = start
        while (cur < end) {
          bookedTimes.add(cur)
          cur = addMinutes(cur, 30)
        }
      })

      // Check if Saturday (close at 14:00)
      const isSaturday = selectedDate.getDay() === 6
      const closeTime = isSaturday ? '14:00' : '20:00'
      const slotsForDay = generateSlots('09:00', closeTime)

      // Filter: slot + service duration must fit
      const duration = selectedService?.duration || 30
      const available = slotsForDay.filter(slot => {
        const endNeeded = addMinutes(slot, duration)
        if (endNeeded > closeTime) return false
        let check = slot
        while (check < endNeeded) {
          if (bookedTimes.has(check)) return false
          check = addMinutes(check, 30)
        }
        return true
      })

      setAvailableSlots(available)
      setSlotsLoading(false)
    }
    loadSlots()
  }, [selectedDate, selectedStylist, selectedService])

  const confirmBooking = async () => {
    if (!selectedService || !selectedStylist || !selectedDate || !selectedTime) return
    setBooking(true)

    const endTime = addMinutes(selectedTime, selectedService.duration)

    const { error } = await supabase.from('appointments').insert({
      user_id: user.id,
      stylist_id: selectedStylist.id,
      service_id: selectedService.id,
      appointment_date: toDateKey(selectedDate),
      appointment_time: selectedTime,
      end_time: endTime,
      notes: note || null,
    })

    setBooking(false)
    if (!error) onDone({ service: selectedService, stylist: selectedStylist, date: selectedDate, time: selectedTime })
  }

  if (loading) return <Spinner />

  const popular = services.filter(s => s.category === 'popular')
  const other = services.filter(s => s.category === 'other')
  const days = getMonthDays(calYear, calMonth)
  const canContinue = [!!selectedService, !!selectedStylist, !!(selectedDate && selectedTime)][step]

  return (
    <div style={{ paddingBottom: step < 3 ? 100 : 20 }}>
      {/* Header */}
      <div style={{ padding:'8px 20px 0' }}>
        <BackBtn onClick={step > 0 ? () => { setStep(step - 1); if (step === 2) setSelectedTime(null) } : onBack} />
      </div>

      {/* Progress */}
      <div style={{ display:'flex', gap:8, padding:'0 20px 20px' }}>
        {['Servicio','Profesional','Fecha y hora'].map((l, i) => (
          <div key={i} style={{ flex:1 }}>
            <div style={{ height:3, borderRadius:2, background: i <= step ? 'var(--teal)' : 'var(--border)', transition:'all .4s', marginBottom:6 }} />
            <span style={{ fontSize:10, fontWeight: i <= step ? 600 : 400, color: i <= step ? 'var(--teal)' : 'var(--text3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* STEP 0: Services */}
      {step === 0 && (
        <div>
          {popular.length > 0 && (
            <div style={{ background:'var(--white)', padding:'20px 20px 8px' }}>
              <h2 style={{ fontSize:18, fontWeight:800, marginBottom:16 }}>Servicios más populares</h2>
              {popular.map(s => (
                <ServiceRow key={s.id} service={s} selected={selectedService?.id === s.id} onClick={() => setSelectedService(s)} />
              ))}
            </div>
          )}
          {other.length > 0 && (
            <div style={{ background:'var(--white)', padding:'20px 20px 8px', marginTop:8 }}>
              <h2 style={{ fontSize:18, fontWeight:800, marginBottom:16 }}>Otros servicios</h2>
              {other.map(s => (
                <ServiceRow key={s.id} service={s} selected={selectedService?.id === s.id} onClick={() => setSelectedService(s)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 1: Stylist */}
      {step === 1 && (
        <div style={{ background:'var(--white)', padding:'20px' }}>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>Elige profesional</h2>
          {profile?.favorite_stylist_id && (
            <div className="anim" style={{ padding:'10px 14px', background:'var(--teal-bg)', borderRadius:8, marginBottom:16, fontSize:13, color:'var(--teal)', fontWeight:500 }}>
              ⭐ Tu profesional favorito está pre-seleccionado
            </div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {stylists.map(s => (
              <button key={s.id} onClick={() => setSelectedStylist(s)} className="anim" style={{
                display:'flex', alignItems:'center', gap:16, width:'100%', padding:'18px',
                background: selectedStylist?.id === s.id ? 'var(--teal-bg)' : 'var(--white)',
                border: selectedStylist?.id === s.id ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                borderRadius:12, cursor:'pointer', textAlign:'left', transition:'all .2s',
              }}>
                <div style={{
                  width:52, height:52, borderRadius:26, overflow:'hidden',
                  background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center',
                  border: selectedStylist?.id === s.id ? '2.5px solid var(--teal)' : '2px solid var(--border)',
                  fontSize:18, fontWeight:700, color:'var(--text3)', flexShrink:0,
                }}>
                  {s.photo_url ? <img src={s.photo_url} alt={s.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : s.name[0]}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                    {s.name}
                    {profile?.favorite_stylist_id === s.id && <span style={{ fontSize:14 }}>⭐</span>}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{s.role_title} · {s.username}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Date & Time */}
      {step === 2 && (
        <div style={{ background:'var(--white)', padding:'20px' }}>
          <h2 style={{ fontSize:18, fontWeight:800, marginBottom:20 }}>Fecha y hora</h2>

          {/* Calendar nav */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontSize:16, fontWeight:700 }}>{months[calMonth]} {calYear}</h3>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear-1) } else setCalMonth(calMonth-1) }} style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--border)', background:'var(--white)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear+1) } else setCalMonth(calMonth+1) }} style={{ width:36, height:36, borderRadius:8, border:'1px solid var(--border)', background:'var(--white)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
            {dayLabels.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:12, fontWeight:500, color:'var(--text3)', padding:'4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Days */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
            {days.map((d, i) => {
              if (!d) return <div key={'e'+i} />
              const past = isPast(d)
              const sunday = d.getDay() === 0
              const disabled = past || sunday
              const sel = selectedDate && toDateKey(selectedDate) === toDateKey(d)
              return (
                <button key={toDateKey(d)} onClick={disabled ? undefined : () => { setSelectedDate(d); setSelectedTime(null) }} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  height:44, borderRadius:22, background:'transparent',
                  border: sel ? '2px solid var(--teal)' : '2px solid transparent',
                  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.3 : 1,
                }}>
                  <span style={{ fontSize:14, fontWeight: isToday(d) ? 700 : 400, color: sel ? 'var(--teal)' : 'var(--text)' }}>{d.getDate()}</span>
                </button>
              )
            })}
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div className="anim" style={{ marginTop:24 }}>
              <div style={{ height:1, background:'var(--border)', marginBottom:20 }} />
              <p style={{ fontSize:13, fontWeight:500, color:'var(--text3)', marginBottom:14 }}>{fmtDateFull(selectedDate)}</p>

              {slotsLoading ? <Spinner /> : availableSlots.length === 0 ? (
                <p style={{ fontSize:14, color:'var(--text3)', textAlign:'center', padding:20 }}>No hay horarios disponibles</p>
              ) : (
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {availableSlots.map(h => {
                    const sel = selectedTime === h
                    return (
                      <button key={h} onClick={() => setSelectedTime(h)} style={{
                        padding:'12px 20px', fontSize:14, fontWeight:500, borderRadius:24,
                        background: sel ? 'var(--teal-bg)' : 'var(--white)',
                        color: sel ? 'var(--teal)' : 'var(--text)',
                        border: sel ? '1.5px solid var(--teal)' : '1.5px solid var(--border2)',
                        cursor:'pointer', transition:'all .15s',
                      }}>{h}</button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Summary + note */}
          {selectedTime && selectedService && (
            <div className="anim" style={{ marginTop:24 }}>
              <div style={{ padding:20, background:'var(--bg)', borderRadius:12, marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:15, fontWeight:700 }}>{selectedService.name}</span>
                  <span style={{ fontSize:15, fontWeight:700 }}>{Number(selectedService.price).toFixed(2)} €</span>
                </div>
                <p style={{ fontSize:13, color:'var(--text3)' }}>{selectedTime} — {addMinutes(selectedTime, selectedService.duration)}</p>
                <div style={{ height:1, background:'var(--border)', margin:'12px 0' }} />
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:13, color:'var(--text3)' }}>Profesional:</span>
                  <span style={{ fontSize:13, fontWeight:600 }}>{selectedStylist?.name}</span>
                </div>
              </div>
              <p style={{ fontSize:14, fontWeight:600, marginBottom:8 }}>¿Alguna nota para tu visita?</p>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Nota de la reserva (opcional)"
                style={{ width:'100%', padding:14, border:'1px solid var(--border2)', borderRadius:10, fontSize:14, minHeight:70, color:'var(--text)', background:'var(--white)' }} />
            </div>
          )}
        </div>
      )}

      {/* Bottom bar */}
      {step < 3 && (
        <div style={{
          position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
          width:'100%', maxWidth:480, background:'var(--white)', borderTop:'1px solid var(--border)',
          padding:'12px 20px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:50,
        }}>
          {selectedService ? (
            <div>
              <p style={{ fontSize:12, color:'var(--text3)' }}>1 servicio · {selectedService.duration}min</p>
              <p style={{ fontSize:22, fontWeight:800 }}>{Number(selectedService.price).toFixed(2)} €</p>
            </div>
          ) : <div />}
          <Btn onClick={step === 2 ? confirmBooking : () => setStep(step + 1)} disabled={!canContinue || booking}>
            {booking ? 'Reservando...' : step === 2 ? 'Confirmar reserva' : 'Continuar'}
          </Btn>
        </div>
      )}
    </div>
  )
}

function ServiceRow({ service, selected, onClick }) {
  return (
    <button onClick={onClick} className="anim" style={{
      display:'flex', alignItems:'flex-start', justifyContent:'space-between', width:'100%',
      padding:'18px 0', borderTop:'1px solid var(--border)', background: selected ? 'var(--teal-bg)' : 'transparent',
      border:'none', cursor:'pointer', textAlign:'left', marginLeft: selected ? -8 : 0, marginRight: selected ? -8 : 0,
      paddingLeft: selected ? 8 : 0, paddingRight: selected ? 8 : 0, borderRadius: selected ? 10 : 0,
      transition:'all .15s',
    }}>
      <div style={{ flex:1, paddingRight:20 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:4, textTransform:'uppercase', color: selected ? 'var(--teal)' : 'var(--text)' }}>{service.name}</div>
        <div style={{ fontSize:13, color:'var(--text3)', lineHeight:1.4 }}>{service.description}</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:17, fontWeight:800 }}>{Number(service.price).toFixed(2)} €</div>
        <div style={{ fontSize:12, color:'var(--text3)' }}>{service.duration} min</div>
      </div>
    </button>
  )
}

// ─── CLIENT ACCOUNT ──────────────────────────────────────────

function AccountScreen({ user, profile, onBook, onLogout, onUpdateProfile }) {
  const [tab, setTab] = useState('upcoming')
  const [upcoming, setUpcoming] = useState([])
  const [history, setHistory] = useState([])
  const [stylists, setStylists] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    const today = toDateKey(new Date())

    const [{ data: up }, { data: hist }, { data: stys }] = await Promise.all([
      supabase
        .from('appointments')
        .select('*, stylists(name, username), services(name, price, duration)')
        .eq('user_id', user.id)
        .gte('appointment_date', today)
        .in('status', ['confirmed'])
        .order('appointment_date', { ascending: true }),
      supabase
        .from('appointments')
        .select('*, stylists(name, username), services(name, price, duration)')
        .eq('user_id', user.id)
        .or(`appointment_date.lt.${today},status.eq.completed,status.eq.cancelled`)
        .order('appointment_date', { ascending: false })
        .limit(20),
      supabase.from('stylists').select('*').eq('active', true).order('display_order'),
    ])

    setUpcoming(up || [])
    setHistory(hist || [])
    setStylists(stys || [])
    setLoading(false)
  }, [user.id])

  useEffect(() => { loadData() }, [loadData])

  const cancelAppointment = async (id) => {
    await supabase.from('appointments').update({ status: 'cancelled', cancelled_by: 'client' }).eq('id', id)
    loadData()
  }

  const setFavStylist = async (stylistId) => {
    const newFav = profile?.favorite_stylist_id === stylistId ? null : stylistId
    await supabase.from('profiles').update({ favorite_stylist_id: newFav }).eq('id', user.id)
    onUpdateProfile({ ...profile, favorite_stylist_id: newFav })
  }

  const toggleReminders = async () => {
    const newVal = !profile?.email_reminders
    await supabase.from('profiles').update({ email_reminders: newVal }).eq('id', user.id)
    onUpdateProfile({ ...profile, email_reminders: newVal })
  }

  const initials = (profile?.full_name || '?').split(' ').map(n => n[0]).join('').toUpperCase()

  if (loading) return <Spinner />

  return (
    <div>
      {/* Profile header */}
      <div style={{ padding:'24px 20px', background:'var(--white)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:'var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff' }}>{initials}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:700 }}>{profile?.full_name}</div>
            <div style={{ fontSize:13, color:'var(--text3)' }}>{user.email}</div>
          </div>
          <button onClick={onLogout} style={{ fontSize:12, color:'var(--text3)', background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'7px 12px', cursor:'pointer', fontFamily:'inherit' }}>Salir</button>
        </div>
        <Btn full onClick={onBook}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva reserva
        </Btn>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'var(--white)', borderBottom:'1px solid var(--border)', padding:'0 20px' }}>
        {[['upcoming','Próximas',upcoming.length],['history','Historial',history.length],['settings','Ajustes',null]].map(([id,label,count]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'14px 14px', fontFamily:'inherit', fontSize:13, fontWeight:500,
            background:'none', border:'none', cursor:'pointer',
            color: tab === id ? 'var(--teal)' : 'var(--text3)',
            borderBottom: tab === id ? '2px solid var(--teal)' : '2px solid transparent',
            display:'flex', alignItems:'center', gap:6,
          }}>
            {label}
            {count !== null && <span style={{ fontSize:10, fontWeight:700, color:'#fff', background: tab===id ? 'var(--teal)' : 'var(--text3)', padding:'1px 7px', borderRadius:10 }}>{count}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding:'20px' }}>
        {/* UPCOMING */}
        {tab === 'upcoming' && (
          upcoming.length === 0 ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <p style={{ fontSize:32, marginBottom:12, opacity:0.3 }}>📅</p>
              <p style={{ fontSize:14, color:'var(--text3)' }}>No tienes citas programadas</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {upcoming.map(a => (
                <div key={a.id} className="anim" style={{ padding:18, background:'var(--white)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'var(--shadow)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700 }}>{a.services?.name}</div>
                      <div style={{ fontSize:13, color:'var(--text3)', marginTop:2 }}>con {a.stylists?.name}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:14, fontWeight:600 }}>{new Date(a.appointment_date).getDate()} {months[new Date(a.appointment_date).getMonth()]}</div>
                      <div style={{ fontSize:13, color:'var(--teal)', fontWeight:500 }}>{a.appointment_time?.slice(0,5)}h</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                    <Btn small variant="secondary" onClick={() => cancelAppointment(a.id)} style={{ color:'var(--red)', borderColor:'rgba(229,57,53,0.2)', background:'var(--red-bg)' }}>Cancelar</Btn>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          history.length === 0 ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <p style={{ fontSize:14, color:'var(--text3)' }}>Aún no tienes visitas anteriores</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {history.map(a => (
                <div key={a.id} style={{
                  display:'flex', alignItems:'center', gap:14, padding:16,
                  background:'var(--white)', border:'1px solid var(--border)', borderRadius:12,
                  opacity: a.status === 'cancelled' ? 0.5 : 1,
                }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600 }}>{a.services?.name}</div>
                    <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                      {a.stylists?.name} · {new Date(a.appointment_date).getDate()} {months[new Date(a.appointment_date).getMonth()]}
                    </div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color: a.status === 'cancelled' ? 'var(--red)' : 'var(--text)' }}>
                    {a.status === 'cancelled' ? 'Cancelada' : `${Number(a.services?.price).toFixed(2)} €`}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Favorite stylist */}
            <div style={{ background:'var(--white)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
              <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:14, fontWeight:700 }}>Profesional favorito</span>
                <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>Se pre-selecciona al reservar</p>
              </div>
              <div style={{ padding:'8px 18px' }}>
                {stylists.map(s => {
                  const isFav = profile?.favorite_stylist_id === s.id
                  return (
                    <button key={s.id} onClick={() => setFavStylist(s.id)} style={{
                      display:'flex', alignItems:'center', gap:12, width:'100%', padding:'12px 0',
                      background:'none', border:'none', cursor:'pointer', borderBottom:'1px solid var(--border)',
                    }}>
                      <div style={{ width:36, height:36, borderRadius:18, background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'var(--text3)', flexShrink:0 }}>{s.name[0]}</div>
                      <div style={{ flex:1, textAlign:'left' }}>
                        <div style={{ fontSize:14, fontWeight:500 }}>{s.name}</div>
                        <div style={{ fontSize:11, color:'var(--text3)' }}>{s.role_title}</div>
                      </div>
                      <div style={{
                        width:22, height:22, borderRadius:11,
                        border: isFav ? 'none' : '2px solid var(--border2)',
                        background: isFav ? 'var(--teal)' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>
                        {isFav && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Reminders */}
            <div style={{
              background:'var(--white)', borderRadius:14, border:'1px solid var(--border)',
              padding:18, display:'flex', alignItems:'center', justifyContent:'space-between',
            }}>
              <div>
                <span style={{ fontSize:14, fontWeight:700 }}>Recordatorios email</span>
                <p style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>24h antes de cada cita</p>
              </div>
              <button onClick={toggleReminders} style={{
                width:44, height:24, borderRadius:12, position:'relative', cursor:'pointer', border:'none',
                background: profile?.email_reminders ? 'var(--teal)' : 'var(--border)', transition:'all .3s',
              }}>
                <div style={{ width:20, height:20, borderRadius:10, background:'#fff', position:'absolute', top:2, left: profile?.email_reminders ? 22 : 2, transition:'all .3s', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
              </button>
            </div>

            {/* Info */}
            <div style={{ background:'var(--white)', borderRadius:14, border:'1px solid var(--border)', padding:18 }}>
              <span style={{ fontSize:14, fontWeight:700, marginBottom:14, display:'block' }}>Datos personales</span>
              {[['Nombre', profile?.full_name], ['Email', user.email], ['Teléfono', profile?.phone || '—']].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)', fontSize:14 }}>
                  <span style={{ color:'var(--text3)' }}>{k}</span><span style={{ fontWeight:500 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BOOKING DONE SCREEN ─────────────────────────────────────

function DoneScreen({ booking, onReset }) {
  return (
    <div className="scale-in" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 28px', textAlign:'center', minHeight:'80vh' }}>
      <div style={{ width:80, height:80, borderRadius:40, background:'var(--green-bg)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24 }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>¡Reserva confirmada!</h1>
      <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, maxWidth:300 }}>
        <strong>{booking.service.name}</strong> con {booking.stylist.name}<br/>
        {fmtDateFull(booking.date)} a las <strong>{booking.time}h</strong>
      </p>
      <div style={{ marginTop:16, padding:'12px 24px', background:'var(--bg)', borderRadius:10, fontSize:13, color:'var(--text2)' }}>
        📩 Recibirás confirmación por email
      </div>
      <Btn onClick={onReset} style={{ marginTop:32 }}>Volver al inicio</Btn>
    </div>
  )
}

// ─── MAIN APP ────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('loading') // loading | auth | account | booking | done
  const [lastBooking, setLastBooking] = useState(null)

  // Check auth state on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
        setView('account')
      } else {
        setView('auth')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setView('auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
  }

  const handleLogin = (u) => {
    setUser(u)
    loadProfile(u.id)
    setView('account')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setView('auth')
  }

  const handleBookingDone = (booking) => {
    setLastBooking(booking)
    setView('done')
  }

  if (view === 'loading') return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'var(--white)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{CSS}</style>
      <Spinner />
    </div>
  )

  return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:'var(--bg)', boxShadow:'0 0 40px rgba(0,0,0,0.04)' }}>
      <style>{CSS}</style>

      {/* Header */}
      {view !== 'auth' && (
        <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'var(--white)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:60 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }} onClick={() => setView('account')}>
            <div style={{ width:34, height:34, borderRadius:9, background:'var(--teal)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800, color:'#fff' }}>C</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800 }}>Clocks <span style={{ color:'var(--teal)' }}>Estudio</span></div>
              <div style={{ fontSize:10, color:'var(--text3)' }}>Reservas online</div>
            </div>
          </div>
          {view !== 'booking' && (
            <button onClick={() => setView('account')} style={{
              width:34, height:34, borderRadius:17, border:'1px solid var(--border)',
              background: view === 'account' ? 'var(--teal-bg)' : 'var(--white)',
              cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={view === 'account' ? 'var(--teal)' : 'var(--text3)'} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </button>
          )}
        </header>
      )}

      {view === 'auth' && <AuthScreen onLogin={handleLogin} />}
      {view === 'account' && user && <AccountScreen user={user} profile={profile} onBook={() => setView('booking')} onLogout={handleLogout} onUpdateProfile={setProfile} />}
      {view === 'booking' && user && <BookingFlow user={user} profile={profile} onDone={handleBookingDone} onBack={() => setView('account')} />}
      {view === 'done' && lastBooking && <DoneScreen booking={lastBooking} onReset={() => setView('account')} />}
    </div>
  )
}
