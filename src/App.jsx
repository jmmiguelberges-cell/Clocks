import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ─── STYLES ──────────────────────────────────────────────────
const CSS = `
:root {
  --bg:#F5F5F5;--white:#FFFFFF;
  --border:#EBEBEB;--border2:#DEDEDE;
  --text:#1A1A1A;--text2:#555;--text3:#999;
  --teal:#00B4B4;--teal-dark:#009E9E;
  --teal-bg:rgba(0,180,180,0.06);--teal-bg2:rgba(0,180,180,0.12);
  --yellow:#FFC107;--green:#43A047;--orange:#FB8C00;--red:#E53935;
  --red-bg:rgba(229,57,53,0.07);--green-bg:rgba(67,160,71,0.07);
  --orange-bg:rgba(251,140,0,0.07);
  --shadow:0 1px 3px rgba(0,0,0,0.05);
  --shadow-md:0 4px 12px rgba(0,0,0,0.08);
}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--teal)!important;box-shadow:0 0 0 3px var(--teal-bg2)!important}
::-webkit-scrollbar{width:4px;height:0}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:4px}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
@keyframes spin{to{transform:rotate(360deg)}}
.anim{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both}
.anim-d1{animation-delay:40ms}.anim-d2{animation-delay:80ms}.anim-d3{animation-delay:120ms}
.anim-d4{animation-delay:160ms}.anim-d5{animation-delay:200ms}
.scale-in{animation:scaleIn .35s cubic-bezier(.16,1,.3,1) both}
textarea{font-family:inherit;resize:none}
select{font-family:inherit;-webkit-appearance:none;appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 12px center;padding-right:32px!important}
`

// ─── HELPERS ─────────────────────────────────────────────────
const dayLabels = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']
const dayFull = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const monthShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

const toKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const isToday = d => toKey(d) === toKey(new Date())
const isPast = d => { const t = new Date(); t.setHours(0,0,0,0); return d < t }
const fmtDate = d => `${d.getDate()} de ${months[d.getMonth()]}`
const fmtDateFull = d => `${dayFull[d.getDay()]}, ${fmtDate(d)}`
const fmtShort = d => `${d.getDate()} ${monthShort[d.getMonth()]}`

const addMins = (time, mins) => {
  let [h, m] = time.split(':').map(Number)
  m += mins; while (m >= 60) { h++; m -= 60 }
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}

const genSlots = (open = '09:00', close = '20:00', step = 30) => {
  const s = []; let [h,m] = open.split(':').map(Number); const [ch,cm] = close.split(':').map(Number)
  while (h < ch || (h === ch && m < cm)) { s.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`); m += step; if (m >= 60) { h++; m -= 60 } }
  return s
}

const getMonthDays = (y, m) => {
  const first = new Date(y, m, 1), last = new Date(y, m+1, 0)
  let start = first.getDay() - 1; if (start < 0) start = 6
  const days = []; for (let i = 0; i < start; i++) days.push(null)
  for (let i = 1; i <= last.getDate(); i++) days.push(new Date(y, m, i))
  return days
}

// ─── ATOMS ───────────────────────────────────────────────────

const Spinner = () => (
  <div style={{display:'flex',justifyContent:'center',padding:40}}>
    <div style={{width:28,height:28,border:'3px solid var(--border)',borderTopColor:'var(--teal)',borderRadius:'50%',animation:'spin .6s linear infinite'}}/>
  </div>
)

const BackBtn = ({ onClick, label }) => (
  <button onClick={onClick} style={{background:'none',border:'none',cursor:'pointer',padding:'12px 0',display:'flex',alignItems:'center',gap:6,color:'var(--text)',fontSize:14,fontWeight:500,fontFamily:'inherit'}}>
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
    {label}
  </button>
)

const Btn = ({ children, onClick, disabled, full, variant='primary', small, style:sx, ...rest }) => {
  const p = variant === 'primary'
  return <button onClick={disabled?undefined:onClick} disabled={disabled} style={{
    fontFamily:'inherit',fontSize:small?13:15,fontWeight:700,
    padding:small?'9px 18px':'14px 28px',width:full?'100%':'auto',
    color:p?'#fff':variant==='danger'?'var(--red)':'var(--text2)',
    background:p?(disabled?'var(--border2)':'var(--teal)'):variant==='danger'?'var(--red-bg)':'var(--white)',
    border:p?'none':variant==='danger'?'1px solid rgba(229,57,53,0.15)':'1px solid var(--border2)',
    borderRadius:small?8:10,cursor:disabled?'default':'pointer',
    transition:'all .2s',display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,...sx
  }} {...rest}>{children}</button>
}

const Input = ({ label, required, error, ...props }) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:'block'}}>{label}{required && <span style={{color:'var(--red)',marginLeft:2}}>*</span>}</label>}
    <input {...props} style={{width:'100%',padding:'12px 14px',fontSize:14,border:`1px solid ${error?'var(--red)':'var(--border2)'}`,borderRadius:10,background:'var(--white)',color:'var(--text)',fontFamily:'inherit',...(props.style||{})}}/>
    {error && <p style={{fontSize:12,color:'var(--red)',marginTop:4}}>{error}</p>}
  </div>
)

const Select = ({ label, children, ...props }) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{fontSize:13,fontWeight:600,marginBottom:6,display:'block'}}>{label}</label>}
    <select {...props} style={{width:'100%',padding:'12px 14px',fontSize:14,border:'1px solid var(--border2)',borderRadius:10,background:'var(--white)',color:'var(--text)',cursor:'pointer',fontFamily:'inherit'}}>{children}</select>
  </div>
)

const Badge = ({ children, color='var(--teal)', bg='var(--teal-bg)' }) => (
  <span style={{fontSize:11,fontWeight:700,color,background:bg,padding:'3px 10px',borderRadius:20,whiteSpace:'nowrap'}}>{children}</span>
)

const Empty = ({ icon, text }) => (
  <div style={{textAlign:'center',padding:'48px 20px'}}>
    <div style={{fontSize:36,marginBottom:12,opacity:0.3}}>{icon}</div>
    <p style={{fontSize:14,color:'var(--text3)'}}>{text}</p>
  </div>
)

// ─── AUTH ────────────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setError(''); setLoading(true)
    try {
      if (mode === 'register') {
        if (!name.trim() || !email.trim() || !pass.trim()) { setError('Rellena los campos obligatorios'); setLoading(false); return }
        if (pass.length < 6) { setError('Mínimo 6 caracteres en la contraseña'); setLoading(false); return }
        const { data, error: e } = await supabase.auth.signUp({ email:email.trim(), password:pass, options:{data:{full_name:name.trim(),phone:phone.trim()}} })
        if (e) throw e; if (data.user) onLogin(data.user)
      } else {
        if (!email.trim() || !pass.trim()) { setError('Introduce email y contraseña'); setLoading(false); return }
        const { data, error: e } = await supabase.auth.signInWithPassword({ email:email.trim(), password:pass })
        if (e) throw e; if (data.user) onLogin(data.user)
      }
    } catch (e) {
      if (e.message?.includes('Invalid login')) setError('Email o contraseña incorrectos')
      else if (e.message?.includes('already registered')) setError('Email ya registrado. Inicia sesión.')
      else setError(e.message || 'Error desconocido')
    }
    setLoading(false)
  }

  return (
    <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:'var(--white)'}}>
      <div style={{padding:'70px 28px 32px',textAlign:'center'}}>
        <div style={{width:60,height:60,borderRadius:16,background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',fontSize:26,fontWeight:800,color:'#fff',boxShadow:'0 4px 16px rgba(0,180,180,0.3)'}}>C</div>
        <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Clocks Estudio</h1>
        <p style={{fontSize:14,color:'var(--text3)'}}>Reserva tu cita online</p>
      </div>

      <div style={{display:'flex',margin:'0 28px',background:'var(--bg)',borderRadius:10,padding:3,marginBottom:24}}>
        {[['login','Iniciar sesión'],['register','Crear cuenta']].map(([id,l]) => (
          <button key={id} onClick={()=>{setMode(id);setError('')}} style={{
            flex:1,padding:'11px 0',fontFamily:'inherit',fontSize:14,fontWeight:600,
            background:mode===id?'var(--white)':'transparent',color:mode===id?'var(--text)':'var(--text3)',
            border:'none',borderRadius:8,cursor:'pointer',boxShadow:mode===id?'var(--shadow)':'none',transition:'all .2s'
          }}>{l}</button>
        ))}
      </div>

      <div className="anim" style={{padding:'0 28px 40px'}}>
        {mode==='register' && <>
          <Input label="Nombre completo" required value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre"/>
          <Input label="Teléfono" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="612 345 678"/>
        </>}
        <Input label="Email" required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com"/>
        <Input label="Contraseña" required type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder={mode==='register'?'Mínimo 6 caracteres':'••••••••'}/>
        {error && <div style={{padding:'11px 14px',background:'var(--red-bg)',borderRadius:8,marginBottom:14}}><p style={{fontSize:13,color:'var(--red)',fontWeight:500}}>{error}</p></div>}
        <Btn full onClick={submit} disabled={loading}>{loading?'Cargando...':mode==='register'?'Crear cuenta':'Entrar'}</Btn>
        <p style={{fontSize:13,color:'var(--text3)',textAlign:'center',marginTop:18}}>
          {mode==='login'?'¿No tienes cuenta? ':'¿Ya tienes cuenta? '}
          <button onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}} style={{fontFamily:'inherit',fontSize:13,color:'var(--teal)',background:'none',border:'none',cursor:'pointer',fontWeight:600}}>{mode==='login'?'Regístrate':'Inicia sesión'}</button>
        </p>
      </div>
    </div>
  )
}

// ─── BOOKING ─────────────────────────────────────────────────

function BookingFlow({ user, profile, onDone, onBack }) {
  const [step, setStep] = useState(0)
  const [services, setServices] = useState([])
  const [stylists, setStylists] = useState([])
  const [svc, setSvc] = useState(null)
  const [sty, setSty] = useState(null)
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [note, setNote] = useState('')
  const [calM, setCalM] = useState(new Date().getMonth())
  const [calY, setCalY] = useState(new Date().getFullYear())
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const [{ data: sv }, { data: st }] = await Promise.all([
        supabase.from('services').select('*').eq('active',true).order('display_order'),
        supabase.from('stylists').select('*').eq('active',true).order('display_order'),
      ])
      setServices(sv||[]); setStylists(st||[]); setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (profile?.favorite_stylist_id && stylists.length) {
      const f = stylists.find(s => s.id === profile.favorite_stylist_id)
      if (f) setSty(f)
    }
  }, [profile, stylists])

  useEffect(() => {
    if (!date || !sty) { setSlots([]); return }
    (async () => {
      setSlotsLoading(true)
      const dk = toKey(date)
      const [{ data: booked }, { data: blocked }] = await Promise.all([
        supabase.from('appointments').select('appointment_time,end_time').eq('stylist_id',sty.id).eq('appointment_date',dk).eq('status','confirmed'),
        supabase.from('blocked_slots').select('start_time,end_time').eq('stylist_id',sty.id).eq('blocked_date',dk),
      ])
      const taken = new Set()
      ;(booked||[]).forEach(a => { let c = a.appointment_time.slice(0,5); const e = a.end_time.slice(0,5); while(c<e){taken.add(c);c=addMins(c,30)} })
      ;(blocked||[]).forEach(b => { let c = b.start_time.slice(0,5); const e = b.end_time.slice(0,5); while(c<e){taken.add(c);c=addMins(c,30)} })
      const close = date.getDay()===6?'14:00':'20:00'
      const all = genSlots('09:00',close)
      const dur = svc?.duration||30
      const avail = all.filter(s => {
        const end = addMins(s,dur); if(end>close) return false
        let c=s; while(c<end){if(taken.has(c)) return false; c=addMins(c,30)}; return true
      })
      setSlots(avail); setSlotsLoading(false)
    })()
  }, [date, sty, svc])

  const confirm = async () => {
    if(!svc||!sty||!date||!time) return; setBooking(true)
    const { error } = await supabase.from('appointments').insert({
      user_id:user.id, stylist_id:sty.id, service_id:svc.id,
      appointment_date:toKey(date), appointment_time:time, end_time:addMins(time,svc.duration), notes:note||null
    })
    setBooking(false)
    if(!error) onDone({service:svc,stylist:sty,date,time})
  }

  if (loading) return <Spinner/>
  const popular = services.filter(s=>s.category==='popular')
  const other = services.filter(s=>s.category==='other')
  const days = getMonthDays(calY,calM)
  const canGo = [!!svc,!!sty,!!(date&&time)][step]

  return (
    <div style={{paddingBottom:110}}>
      <div style={{padding:'8px 20px 0'}}><BackBtn onClick={step>0?()=>{setStep(step-1);if(step===2)setTime(null)}:onBack}/></div>

      {/* Progress */}
      <div style={{display:'flex',gap:6,padding:'4px 20px 18px'}}>
        {['Servicio','Profesional','Fecha y hora'].map((l,i)=>(
          <div key={i} style={{flex:1}}>
            <div style={{height:3,borderRadius:2,background:i<=step?'var(--teal)':'var(--border)',transition:'all .4s',marginBottom:6}}/>
            <span style={{fontSize:10,fontWeight:i<=step?700:400,color:i<=step?'var(--teal)':'var(--text3)',textTransform:'uppercase',letterSpacing:'0.04em'}}>{l}</span>
          </div>
        ))}
      </div>

      {/* STEP 0 */}
      {step===0 && <div>
        {popular.length>0 && <div style={{background:'var(--white)',padding:'20px 20px 8px'}}>
          <h2 style={{fontSize:18,fontWeight:800,marginBottom:14}}>Servicios más populares</h2>
          {popular.map((s,i)=> <SvcRow key={s.id} s={s} sel={svc?.id===s.id} onClick={()=>setSvc(s)} i={i}/>)}
        </div>}
        {other.length>0 && <div style={{background:'var(--white)',padding:'20px 20px 8px',marginTop:8}}>
          <h2 style={{fontSize:18,fontWeight:800,marginBottom:14}}>Otros servicios</h2>
          {other.map((s,i)=> <SvcRow key={s.id} s={s} sel={svc?.id===s.id} onClick={()=>setSvc(s)} i={i}/>)}
        </div>}
      </div>}

      {/* STEP 1 */}
      {step===1 && <div style={{background:'var(--white)',padding:20}}>
        <h2 style={{fontSize:18,fontWeight:800,marginBottom:18}}>Elige profesional</h2>
        {profile?.favorite_stylist_id && <div className="anim" style={{padding:'10px 14px',background:'var(--teal-bg)',borderRadius:8,marginBottom:14,fontSize:13,color:'var(--teal)',fontWeight:500}}>⭐ Tu favorito está pre-seleccionado</div>}
        <div style={{display:'flex',gap:14,overflowX:'auto',paddingBottom:4}}>
          {stylists.map(s=>{
            const sel = sty?.id===s.id
            return <button key={s.id} onClick={()=>setSty(s)} style={{
              display:'flex',flexDirection:'column',alignItems:'center',gap:8,minWidth:80,
              background:'none',border:'none',cursor:'pointer',padding:'8px 4px',flexShrink:0,
            }}>
              <div style={{width:60,height:60,borderRadius:30,background:'var(--bg)',border:sel?'3px solid var(--teal)':'2px solid var(--border)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'var(--text3)',
                overflow:'hidden',transition:'all .2s',position:'relative'}}>
                {s.photo_url ? <img src={s.photo_url} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/> : s.name[0]}
                {sel && <div style={{position:'absolute',bottom:-2,right:-2,width:18,height:18,borderRadius:9,background:'var(--teal)',border:'2px solid var(--white)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                </div>}
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:13,fontWeight:sel?700:500,color:sel?'var(--text)':'var(--text2)'}}>{s.name}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{s.role_title}</div>
              </div>
            </button>
          })}
        </div>
      </div>}

      {/* STEP 2 */}
      {step===2 && <div style={{background:'var(--white)',padding:20}}>
        <h2 style={{fontSize:18,fontWeight:800,marginBottom:18}}>Seleccionar fecha y hora</h2>

        {/* Calendar */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <h3 style={{fontSize:15,fontWeight:700}}>{months[calM]} {calY}</h3>
          <div style={{display:'flex',gap:6}}>
            <button onClick={()=>{if(calM===0){setCalM(11);setCalY(calY-1)}else setCalM(calM-1)}} style={{width:34,height:34,borderRadius:8,border:'1px solid var(--border)',background:'var(--white)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg></button>
            <button onClick={()=>{if(calM===11){setCalM(0);setCalY(calY+1)}else setCalM(calM+1)}} style={{width:34,height:34,borderRadius:8,border:'1px solid var(--border)',background:'var(--white)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></button>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
          {dayLabels.map(d=><div key={d} style={{textAlign:'center',fontSize:11,fontWeight:600,color:'var(--text3)',padding:'6px 0'}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
          {days.map((d,i)=>{
            if(!d) return <div key={'e'+i}/>
            const past=isPast(d), sun=d.getDay()===0, dis=past||sun
            const sel=date&&toKey(date)===toKey(d), today=isToday(d)
            return <button key={toKey(d)} onClick={dis?undefined:()=>{setDate(d);setTime(null)}} style={{
              display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
              height:42,borderRadius:21,background:'transparent',
              border:sel?'2px solid var(--teal)':'2px solid transparent',
              cursor:dis?'default':'pointer',opacity:dis?0.25:1
            }}><span style={{fontSize:13,fontWeight:today?700:400,color:sel?'var(--teal)':'var(--text)'}}>{d.getDate()}</span></button>
          })}
        </div>

        {/* Slots */}
        {date && <div className="anim" style={{marginTop:20}}>
          <div style={{height:1,background:'var(--border)',marginBottom:16}}/>
          <p style={{fontSize:13,fontWeight:500,color:'var(--text3)',marginBottom:12}}>{fmtDateFull(date)}</p>
          {slotsLoading?<Spinner/>:slots.length===0?<p style={{fontSize:14,color:'var(--text3)',textAlign:'center',padding:16}}>No hay horarios disponibles</p>:(
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {slots.map(h=>{const sel=time===h; return <button key={h} onClick={()=>setTime(h)} style={{
                padding:'11px 18px',fontSize:14,fontWeight:500,borderRadius:22,
                background:sel?'var(--teal-bg)':'var(--white)',color:sel?'var(--teal)':'var(--text)',
                border:sel?'1.5px solid var(--teal)':'1.5px solid var(--border2)',cursor:'pointer',transition:'all .15s'
              }}>{h}</button>})}
            </div>
          )}
        </div>}

        {/* Summary */}
        {time&&svc && <div className="anim" style={{marginTop:20}}>
          <div style={{padding:18,background:'var(--bg)',borderRadius:12,marginBottom:18}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
              <span style={{fontSize:15,fontWeight:700}}>{svc.name}</span>
              <span style={{fontSize:15,fontWeight:700}}>{Number(svc.price).toFixed(2)} €</span>
            </div>
            <p style={{fontSize:13,color:'var(--text3)'}}>{time} — {addMins(time,svc.duration)} · {sty?.name}</p>
          </div>
          <p style={{fontSize:14,fontWeight:600,marginBottom:6}}>¿Alguna nota para tu visita?</p>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Nota (opcional)" style={{width:'100%',padding:12,border:'1px solid var(--border2)',borderRadius:10,fontSize:14,minHeight:60,color:'var(--text)',background:'var(--white)'}}/>
        </div>}
      </div>}

      {/* Bottom bar */}
      <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,background:'var(--white)',borderTop:'1px solid var(--border)',padding:'12px 20px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:50}}>
        {svc?<div><p style={{fontSize:12,color:'var(--text3)'}}>1 servicio · {svc.duration}min</p><p style={{fontSize:20,fontWeight:800}}>{Number(svc.price).toFixed(2)} €</p></div>:<div/>}
        <Btn onClick={step===2?confirm:()=>setStep(step+1)} disabled={!canGo||booking}>{booking?'Reservando...':step===2?'Confirmar reserva':'Continuar'}</Btn>
      </div>
    </div>
  )
}

function SvcRow({ s, sel, onClick, i }) {
  return <button onClick={onClick} className={`anim anim-d${(i%5)+1}`} style={{
    display:'flex',alignItems:'flex-start',justifyContent:'space-between',width:'100%',
    padding:'16px 12px',margin:'0 -12px',borderRadius:sel?10:0,
    background:sel?'var(--teal-bg)':'transparent',
    borderTop:sel?'none':'1px solid var(--border)',border:sel?'1.5px solid var(--teal)':'none',
    borderBottom:sel?'none':undefined,
    cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all .15s',marginBottom:sel?4:0,
  }}>
    <div style={{flex:1,paddingRight:16}}>
      <div style={{fontSize:14,fontWeight:700,textTransform:'uppercase',color:sel?'var(--teal)':'var(--text)',marginBottom:3}}>{s.name}</div>
      <div style={{fontSize:13,color:'var(--text3)',lineHeight:1.4}}>{s.description}</div>
    </div>
    <div style={{textAlign:'right',flexShrink:0}}>
      <div style={{fontSize:16,fontWeight:800}}>{Number(s.price).toFixed(2)} €</div>
      <div style={{fontSize:12,color:'var(--text3)'}}>{s.duration} min</div>
    </div>
  </button>
}

// ─── ACCOUNT ─────────────────────────────────────────────────

function AccountScreen({ user, profile, onBook, onLogout, onUpdateProfile }) {
  const [tab, setTab] = useState('upcoming')
  const [upcoming, setUpcoming] = useState([])
  const [history, setHistory] = useState([])
  const [stylists, setStylists] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const today = toKey(new Date())
    const [{ data: up }, { data: hist }, { data: stys }] = await Promise.all([
      supabase.from('appointments').select('*,stylists(name,username),services(name,price,duration)').eq('user_id',user.id).gte('appointment_date',today).eq('status','confirmed').order('appointment_date'),
      supabase.from('appointments').select('*,stylists(name,username),services(name,price,duration)').eq('user_id',user.id).or(`appointment_date.lt.${today},status.eq.completed,status.eq.cancelled`).order('appointment_date',{ascending:false}).limit(20),
      supabase.from('stylists').select('*').eq('active',true).order('display_order'),
    ])
    setUpcoming(up||[]); setHistory(hist||[]); setStylists(stys||[]); setLoading(false)
  },[user.id])

  useEffect(()=>{load()},[load])

  const cancel = async id => { await supabase.from('appointments').update({status:'cancelled',cancelled_by:'client'}).eq('id',id); load() }
  const setFav = async sid => { const v=profile?.favorite_stylist_id===sid?null:sid; await supabase.from('profiles').update({favorite_stylist_id:v}).eq('id',user.id); onUpdateProfile({...profile,favorite_stylist_id:v}) }
  const toggleRemind = async () => { const v=!profile?.email_reminders; await supabase.from('profiles').update({email_reminders:v}).eq('id',user.id); onUpdateProfile({...profile,email_reminders:v}) }

  const initials = (profile?.full_name||'?').split(' ').map(n=>n[0]).join('').toUpperCase()
  if (loading) return <Spinner/>

  return <div>
    <div style={{padding:'20px',background:'var(--white)',borderBottom:'1px solid var(--border)'}}>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
        <div style={{width:50,height:50,borderRadius:14,background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff'}}>{initials}</div>
        <div style={{flex:1}}><div style={{fontSize:17,fontWeight:700}}>{profile?.full_name}</div><div style={{fontSize:13,color:'var(--text3)'}}>{user.email}</div></div>
        <button onClick={onLogout} style={{fontSize:12,color:'var(--text3)',background:'none',border:'1px solid var(--border)',borderRadius:8,padding:'7px 12px',cursor:'pointer',fontFamily:'inherit'}}>Salir</button>
      </div>
      <Btn full onClick={onBook}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nueva reserva</Btn>
    </div>

    <div style={{display:'flex',background:'var(--white)',borderBottom:'1px solid var(--border)',padding:'0 20px'}}>
      {[['upcoming','Próximas',upcoming.length],['history','Historial',history.length],['settings','Ajustes',null]].map(([id,l,c])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:'13px 12px',fontFamily:'inherit',fontSize:13,fontWeight:500,background:'none',border:'none',cursor:'pointer',color:tab===id?'var(--teal)':'var(--text3)',borderBottom:tab===id?'2px solid var(--teal)':'2px solid transparent',display:'flex',alignItems:'center',gap:5}}>
          {l}{c!==null&&<span style={{fontSize:10,fontWeight:700,color:'#fff',background:tab===id?'var(--teal)':'var(--text3)',padding:'1px 6px',borderRadius:10}}>{c}</span>}
        </button>
      ))}
    </div>

    <div style={{padding:20}}>
      {tab==='upcoming'&&(upcoming.length===0?<Empty icon="📅" text="No tienes citas programadas"/>:
        <div style={{display:'flex',flexDirection:'column',gap:10}}>{upcoming.map(a=><div key={a.id} className="anim" style={{padding:16,background:'var(--white)',border:'1px solid var(--border)',borderRadius:12,boxShadow:'var(--shadow)'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <div><div style={{fontSize:15,fontWeight:700}}>{a.services?.name}</div><div style={{fontSize:13,color:'var(--text3)',marginTop:2}}>con {a.stylists?.name}</div></div>
            <div style={{textAlign:'right'}}><div style={{fontSize:14,fontWeight:600}}>{fmtShort(new Date(a.appointment_date))}</div><div style={{fontSize:13,color:'var(--teal)',fontWeight:600}}>{a.appointment_time?.slice(0,5)}h</div></div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end'}}><Btn small variant="danger" onClick={()=>cancel(a.id)}>Cancelar cita</Btn></div>
        </div>)}</div>
      )}

      {tab==='history'&&(history.length===0?<Empty icon="📋" text="Sin visitas anteriores"/>:
        <div style={{display:'flex',flexDirection:'column',gap:8}}>{history.map(a=><div key={a.id} style={{display:'flex',alignItems:'center',gap:12,padding:14,background:'var(--white)',border:'1px solid var(--border)',borderRadius:10,opacity:a.status==='cancelled'?0.5:1}}>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{a.services?.name}</div><div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{a.stylists?.name} · {fmtShort(new Date(a.appointment_date))}</div></div>
          <div style={{fontSize:14,fontWeight:700,color:a.status==='cancelled'?'var(--red)':'var(--text)'}}>{a.status==='cancelled'?'Cancelada':`${Number(a.services?.price).toFixed(2)} €`}</div>
        </div>)}</div>
      )}

      {tab==='settings'&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)'}}><span style={{fontSize:14,fontWeight:700}}>Profesional favorito</span><p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>Se pre-selecciona al reservar</p></div>
          <div style={{padding:'6px 16px'}}>{stylists.map(s=>{const f=profile?.favorite_stylist_id===s.id; return <button key={s.id} onClick={()=>setFav(s.id)} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 0',background:'none',border:'none',cursor:'pointer',borderBottom:'1px solid var(--border)'}}>
            <div style={{width:34,height:34,borderRadius:17,background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'var(--text3)'}}>{s.name[0]}</div>
            <div style={{flex:1,textAlign:'left'}}><div style={{fontSize:14,fontWeight:500}}>{s.name}</div></div>
            <div style={{width:20,height:20,borderRadius:10,border:f?'none':'2px solid var(--border2)',background:f?'var(--teal)':'transparent',display:'flex',alignItems:'center',justifyContent:'center'}}>{f&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}</div>
          </button>})}</div>
        </div>
        <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><span style={{fontSize:14,fontWeight:700}}>Recordatorios email</span><p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>24h antes de cada cita</p></div>
          <button onClick={toggleRemind} style={{width:44,height:24,borderRadius:12,position:'relative',cursor:'pointer',border:'none',background:profile?.email_reminders?'var(--teal)':'var(--border)',transition:'all .3s'}}>
            <div style={{width:20,height:20,borderRadius:10,background:'#fff',position:'absolute',top:2,left:profile?.email_reminders?22:2,transition:'all .3s',boxShadow:'0 1px 3px rgba(0,0,0,0.15)'}}/>
          </button>
        </div>
        <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:16}}>
          <span style={{fontSize:14,fontWeight:700,marginBottom:10,display:'block'}}>Datos personales</span>
          {[['Nombre',profile?.full_name],['Email',user.email],['Teléfono',profile?.phone||'—']].map(([k,v])=><div key={k} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid var(--border)',fontSize:14}}><span style={{color:'var(--text3)'}}>{k}</span><span style={{fontWeight:500}}>{v}</span></div>)}
        </div>
      </div>}
    </div>
  </div>
}

// ─── ADMIN PANEL ─────────────────────────────────────────────

function AdminPanel({ user, onBack }) {
  const [tab, setTab] = useState('calendar')
  const [selDate, setSelDate] = useState(new Date())
  const [appts, setAppts] = useState([])
  const [blocks, setBlocks] = useState([])
  const [stylists, setStylists] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [bSty, setBSty] = useState(null)
  const [bDate, setBDate] = useState(toKey(new Date()))
  const [bStart, setBStart] = useState('09:00')
  const [bEnd, setBEnd] = useState('10:00')
  const [bReason, setBReason] = useState('')
  const [calM, setCalM] = useState(new Date().getMonth())
  const [calY, setCalY] = useState(new Date().getFullYear())

  const loadDay = useCallback(async (d) => {
    const dk = toKey(d)
    const [{ data: ap }, { data: bl }, { data: st }, { data: sv }] = await Promise.all([
      supabase.from('appointments').select('*,stylists(name),services(name,price,duration),profiles(full_name,phone)').eq('appointment_date',dk).order('appointment_time'),
      supabase.from('blocked_slots').select('*,stylists(name)').eq('blocked_date',dk).order('start_time'),
      supabase.from('stylists').select('*').eq('active',true).order('display_order'),
      supabase.from('services').select('*').eq('active',true).order('display_order'),
    ])
    setAppts(ap||[]); setBlocks(bl||[]); setStylists(st||[]); setServices(sv||[])
    if(!bSty && st?.length) setBSty(st[0].id)
    setLoading(false)
  },[bSty])

  useEffect(()=>{loadDay(selDate)},[selDate])

  const cancelAppt = async id => { await supabase.from('appointments').update({status:'cancelled',cancelled_by:'admin'}).eq('id',id); loadDay(selDate) }

  const addBlock = async () => {
    await supabase.from('blocked_slots').insert({stylist_id:bSty,blocked_date:bDate,start_time:bStart,end_time:bEnd,reason:bReason||'Bloqueado',created_by:user.id})
    setShowBlockModal(false); setBReason(''); loadDay(selDate)
  }

  const removeBlock = async id => { await supabase.from('blocked_slots').delete().eq('id',id); loadDay(selDate) }

  const statusMap = {confirmed:{label:'Confirmada',color:'var(--green)',bg:'var(--green-bg)'},cancelled:{label:'Cancelada',color:'var(--red)',bg:'var(--red-bg)'},completed:{label:'Completada',color:'var(--text3)',bg:'var(--bg)'},no_show:{label:'No presentado',color:'var(--orange)',bg:'var(--orange-bg)'}}
  const confirmedCount = appts.filter(a=>a.status==='confirmed').length
  const days = getMonthDays(calY,calM)

  if (loading) return <Spinner/>

  const tabs = [
    {id:'calendar',label:'Calendario',icon:'📅'},
    {id:'team',label:'Equipo',icon:'👤'},
    {id:'services',label:'Servicios',icon:'✂️'},
  ]

  return <div style={{minHeight:'100vh'}}>
    {/* Admin header */}
    <div style={{padding:'14px 20px',background:'var(--white)',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:'#fff'}}>C</div>
        <div><div style={{fontSize:16,fontWeight:800}}>Panel Admin</div><div style={{fontSize:10,color:'var(--text3)'}}>Gestión de citas</div></div>
      </div>
      <Btn small variant="secondary" onClick={onBack}>← Salir</Btn>
    </div>

    {/* Tabs */}
    <div style={{display:'flex',background:'var(--white)',borderBottom:'1px solid var(--border)',padding:'0 20px'}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{
        padding:'13px 14px',fontFamily:'inherit',fontSize:13,fontWeight:500,background:'none',border:'none',cursor:'pointer',
        color:tab===t.id?'var(--teal)':'var(--text3)',borderBottom:tab===t.id?'2px solid var(--teal)':'2px solid transparent',
        display:'flex',alignItems:'center',gap:5
      }}>{t.icon} {t.label}</button>)}
    </div>

    <div style={{padding:20}}>
      {/* CALENDAR */}
      {tab==='calendar'&&<div>
        {/* Mini calendar */}
        <div style={{background:'var(--white)',borderRadius:12,border:'1px solid var(--border)',padding:16,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <h3 style={{fontSize:15,fontWeight:700}}>{months[calM]} {calY}</h3>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>{if(calM===0){setCalM(11);setCalY(calY-1)}else setCalM(calM-1)}} style={{width:30,height:30,borderRadius:6,border:'1px solid var(--border)',background:'var(--white)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg></button>
              <button onClick={()=>{if(calM===11){setCalM(0);setCalY(calY+1)}else setCalM(calM+1)}} style={{width:30,height:30,borderRadius:6,border:'1px solid var(--border)',background:'var(--white)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg></button>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
            {dayLabels.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:600,color:'var(--text3)',padding:'3px 0'}}>{d}</div>)}
            {days.map((d,i)=>{
              if(!d) return <div key={'e'+i}/>
              const sel=toKey(selDate)===toKey(d), today=isToday(d)
              return <button key={toKey(d)} onClick={()=>setSelDate(d)} style={{height:32,borderRadius:16,background:sel?'var(--teal)':'transparent',border:'none',cursor:'pointer',fontSize:12,fontWeight:today||sel?700:400,color:sel?'#fff':'var(--text)'}}>{d.getDate()}</button>
            })}
          </div>
        </div>

        {/* Day view */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div>
            <h3 style={{fontSize:16,fontWeight:700}}>{fmtDateFull(selDate)}</h3>
            <p style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{confirmedCount} cita{confirmedCount!==1?'s':''} confirmada{confirmedCount!==1?'s':''}</p>
          </div>
          <Btn small variant="secondary" onClick={()=>{setBDate(toKey(selDate));setShowBlockModal(true)}}>🚫 Bloquear</Btn>
        </div>

        {/* Blocks */}
        {blocks.map(b=><div key={b.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--red-bg)',border:'1px solid rgba(229,57,53,0.1)',borderRadius:10,marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:700,color:'var(--red)',minWidth:44}}>{b.start_time?.slice(0,5)}</span>
          <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:'var(--red)'}}>{b.reason}</div><div style={{fontSize:11,color:'var(--text3)'}}>{b.stylists?.name} · hasta {b.end_time?.slice(0,5)}</div></div>
          <button onClick={()=>removeBlock(b.id)} style={{fontSize:11,color:'var(--red)',background:'none',border:'1px solid rgba(229,57,53,0.2)',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}>Quitar</button>
        </div>)}

        {/* Appointments */}
        {appts.length===0&&blocks.length===0&&<Empty icon="📅" text="Sin citas para este día"/>}
        {appts.sort((a,b)=>a.appointment_time.localeCompare(b.appointment_time)).map(a=>{
          const st=statusMap[a.status]||statusMap.confirmed
          return <div key={a.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px',background:'var(--white)',border:'1px solid var(--border)',borderRadius:10,marginBottom:8,opacity:a.status==='cancelled'?0.4:1,boxShadow:'var(--shadow)'}}>
            <span style={{fontSize:14,fontWeight:700,color:'var(--teal)',minWidth:44}}>{a.appointment_time?.slice(0,5)}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:600}}>{a.profiles?.full_name||'—'}</div>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:1}}>{a.services?.name} · {a.services?.duration}min · {a.stylists?.name}</div>
              {a.profiles?.phone&&<div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>📞 {a.profiles.phone}</div>}
            </div>
            <Badge color={st.color} bg={st.bg}>{st.label}</Badge>
            {a.status==='confirmed'&&<button onClick={()=>cancelAppt(a.id)} style={{fontSize:11,color:'var(--red)',background:'var(--red-bg)',border:'1px solid rgba(229,57,53,0.12)',borderRadius:6,padding:'5px 10px',cursor:'pointer',fontFamily:'inherit'}}>Cancelar</button>}
          </div>
        })}

        {/* Block modal */}
        {showBlockModal&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,padding:20}}>
          <div className="scale-in" style={{background:'var(--white)',borderRadius:16,padding:24,maxWidth:380,width:'100%',boxShadow:'var(--shadow-md)'}}>
            <h3 style={{fontSize:18,fontWeight:800,marginBottom:18}}>Bloquear horario</h3>
            <Select label="Profesional" value={bSty} onChange={e=>setBSty(Number(e.target.value))}>
              {stylists.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Input label="Fecha" type="date" value={bDate} onChange={e=>setBDate(e.target.value)}/>
            <div style={{display:'flex',gap:10}}>
              <div style={{flex:1}}><Select label="Desde" value={bStart} onChange={e=>setBStart(e.target.value)}>{genSlots().map(h=><option key={h} value={h}>{h}</option>)}</Select></div>
              <div style={{flex:1}}><Select label="Hasta" value={bEnd} onChange={e=>setBEnd(e.target.value)}>{genSlots('09:30','20:30').map(h=><option key={h} value={h}>{h}</option>)}</Select></div>
            </div>
            <Input label="Motivo" value={bReason} onChange={e=>setBReason(e.target.value)} placeholder="Ej: Descanso, formación..."/>
            <div style={{display:'flex',gap:10,marginTop:8}}>
              <Btn variant="secondary" onClick={()=>setShowBlockModal(false)} style={{flex:1}}>Cancelar</Btn>
              <Btn onClick={addBlock} style={{flex:1}}>Bloquear</Btn>
            </div>
          </div>
        </div>}
      </div>}

      {/* TEAM */}
      {tab==='team'&&<div>
        <h2 style={{fontSize:18,fontWeight:800,marginBottom:16}}>Equipo</h2>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {stylists.map((s,i)=><div key={s.id} className={`anim anim-d${i+1}`} style={{display:'flex',alignItems:'center',gap:14,padding:18,background:'var(--white)',border:'1px solid var(--border)',borderRadius:12,boxShadow:'var(--shadow)'}}>
            <div style={{width:48,height:48,borderRadius:24,background:'var(--teal-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:700,color:'var(--teal)',flexShrink:0}}>{s.name[0]}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:600}}>{s.name}</div>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{s.role_title} · {s.username}</div>
            </div>
            <Badge>{s.active?'Activo':'Inactivo'}</Badge>
          </div>)}
        </div>
      </div>}

      {/* SERVICES */}
      {tab==='services'&&<div>
        <h2 style={{fontSize:18,fontWeight:800,marginBottom:16}}>Servicios</h2>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {services.map((s,i)=><div key={s.id} className={`anim anim-d${(i%5)+1}`} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'var(--white)',border:'1px solid var(--border)',borderRadius:10,boxShadow:'var(--shadow)'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600}}>{s.name}</div>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>{s.duration} min · {s.category==='popular'?'⭐ Popular':'Otro'}</div>
            </div>
            <div style={{fontSize:16,fontWeight:800,color:'var(--teal)'}}>{Number(s.price).toFixed(2)} €</div>
          </div>)}
        </div>
      </div>}
    </div>
  </div>
}

// ─── DONE ────────────────────────────────────────────────────

function DoneScreen({ booking, onReset }) {
  return <div className="scale-in" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 28px',textAlign:'center',minHeight:'80vh'}}>
    <div style={{width:76,height:76,borderRadius:38,background:'var(--green-bg)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:24,boxShadow:'0 0 0 10px rgba(67,160,71,0.04)'}}>
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
    <h1 style={{fontSize:24,fontWeight:800,marginBottom:8}}>¡Reserva confirmada!</h1>
    <p style={{fontSize:14,color:'var(--text2)',lineHeight:1.7,maxWidth:300}}>
      <strong>{booking.service.name}</strong> con {booking.stylist.name}<br/>{fmtDateFull(booking.date)} a las <strong>{booking.time}h</strong>
    </p>
    <div style={{marginTop:14,padding:'11px 22px',background:'var(--bg)',borderRadius:10,fontSize:13,color:'var(--text2)'}}>📩 Recibirás confirmación por email</div>
    <Btn onClick={onReset} style={{marginTop:28}}>Volver al inicio</Btn>
  </div>
}

// ─── MAIN ────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [view, setView] = useState('loading')
  const [lastBooking, setLastBooking] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{session} }) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id); setView('account') }
      else setView('auth')
    })
    const { data:{subscription} } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); loadProfile(session.user.id) }
      else { setUser(null); setProfile(null); setView('auth') }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async id => {
    const { data } = await supabase.from('profiles').select('*').eq('id',id).single()
    setProfile(data)
  }

  const handleLogin = u => { setUser(u); loadProfile(u.id); setView('account') }
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setProfile(null); setView('auth') }

  if (view === 'loading') return <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:'var(--white)',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{CSS}</style><Spinner/></div>

  const isAdmin = profile?.role === 'admin'

  return <div style={{maxWidth:480,margin:'0 auto',minHeight:'100vh',background:'var(--bg)',boxShadow:'0 0 40px rgba(0,0,0,0.03)'}}>
    <style>{CSS}</style>

    {/* Header */}
    {view!=='auth'&&view!=='admin'&&<header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',background:'var(--white)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:60}}>
      <div style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}} onClick={()=>setView('account')}>
        <div style={{width:34,height:34,borderRadius:9,background:'var(--teal)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:800,color:'#fff'}}>C</div>
        <div><div style={{fontSize:16,fontWeight:800}}>Clocks <span style={{color:'var(--teal)'}}>Estudio</span></div><div style={{fontSize:10,color:'var(--text3)'}}>Reservas online</div></div>
      </div>
      <div style={{display:'flex',gap:8}}>
        {isAdmin&&<button onClick={()=>setView('admin')} style={{fontSize:11,fontWeight:600,color:'var(--teal)',background:'var(--teal-bg)',border:'1px solid var(--teal)',borderRadius:16,padding:'6px 12px',cursor:'pointer',fontFamily:'inherit'}}>Admin</button>}
        <button onClick={()=>setView('account')} style={{width:34,height:34,borderRadius:17,border:'1px solid var(--border)',background:view==='account'?'var(--teal-bg)':'var(--white)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={view==='account'?'var(--teal)':'var(--text3)'} strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>
    </header>}

    {view==='auth'&&<AuthScreen onLogin={handleLogin}/>}
    {view==='account'&&user&&<AccountScreen user={user} profile={profile} onBook={()=>setView('booking')} onLogout={handleLogout} onUpdateProfile={setProfile}/>}
    {view==='booking'&&user&&<BookingFlow user={user} profile={profile} onDone={b=>{setLastBooking(b);setView('done')}} onBack={()=>setView('account')}/>}
    {view==='done'&&lastBooking&&<DoneScreen booking={lastBooking} onReset={()=>setView('account')}/>}
    {view==='admin'&&user&&<AdminPanel user={user} onBack={()=>setView('account')}/>}
  </div>
}
