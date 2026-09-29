import { useEffect, useMemo, useState } from 'react';

const API = "https://monitoring-node-esdm-api.vercel.app/api/data?gid=285923348"
const MONTHS = {Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, Jun:5, Jul:6, Agu:7, Sep:8, Okt:9, Nov:10, Des:11}
const parseTgl = (s)=>{ try{ const [d,m,y]=s.split(' '); return new Date(Number(y), MONTHS[m]??8, Number(d)) }catch{return new Date(0)} }
const LS_USERS = "esdm_users"
const LS_SESSION = "esdm_session"

const defaultUsers = [
  {id:1, username:'admin', password:'admin123', role:'admin', nama:'Admin ESDM'},
  {id:2, username:'operator', password:'operator123', role:'user', nama:'Operator Icon'},
]

export default function App(){
  // --- AUTH ---
  const [session,setSession]=useState(()=>{ try{ return JSON.parse(localStorage.getItem(LS_SESSION)||'null') }catch{return null} })
  const [users,setUsers]=useState(()=>{ try{ const u=JSON.parse(localStorage.getItem(LS_USERS)||'null'); return u||defaultUsers }catch{return defaultUsers} })
  const [loginForm,setLoginForm]=useState({username:'',password:''})
  const [tab,setTab]=useState('dashboard') // dashboard | users

  // --- MONITORING DATA ---
  const [data,setData]=useState([])
  const [q,setQ]=useState("")
  const [link,setLink]=useState("Semua")
  const [period,setPeriod]=useState("Semua")
  const [page,setPage]=useState(0)

  // --- CRUD USER FORM ---
  const [editUser,setEditUser]=useState(null)
  const [formUser,setFormUser]=useState({username:'',password:'',role:'user',nama:''})

  // REKAP >3 HARI BERTURUT-TURUT
  const rekap3HariBurut = useMemo(()=>{
    const map = {}
    data.forEach(d=>{
      const node = d["Node/Pos"]?.trim()
      if(!node) return
      if(!map[node]) map[node] = []
      map[node].push(d)
    })

    const hasil = []

    Object.entries(map).forEach(([node, rows])=>{
      // sort by tanggal asc
      const sorted = rows
      .map(r=>({...r, _tgl: parseTgl(r.Tanggal)}))
      .sort((a,b)=>a._tgl - b._tgl)

      let streak = [sorted[0]]
      for(let i=1;i<sorted.length;i++){
        const diff = (sorted[i]._tgl - sorted[i-1]._tgl)/86400000 // selisih hari
        if(diff <= 1.5){ // masih berturut ( toleransi 1 hari )
          streak.push(sorted[i])
        }else{
          if(streak.length >= 3){
            hasil.push({
              node,
              LINK: streak[0].LINK,
              mulai: streak[0].Tanggal,
              sampai: streak[streak.length-1].Tanggal,
              durasi: streak.length,
              kendala_terakhir: streak[streak.length-1].KENDALA,
              detail: streak
            })
          }
          streak = [sorted[i]]
        }
      }
      // cek sisa streak terakhir
      if(streak.length >= 3){
        hasil.push({
          node,
          LINK: streak[0].LINK,
          mulai: streak[0].Tanggal,
          sampai: streak[streak.length-1].Tanggal,
          durasi: streak.length,
          kendala_terakhir: streak[streak.length-1].KENDALA,
          detail: streak
        })
      }
    })

    // sort yang paling lama dulu
    return hasil.sort((a,b)=>b.durasi - a.durasi)
  },[data])

  useEffect(()=>{ localStorage.setItem(LS_USERS, JSON.stringify(users)) },[users])
  useEffect(()=>{ fetch(API).then(r=>r.json()).then(j=>setData(j.data||[])) },[])

  // --- LOGIC TANGGAL PATOKAN = TERBARU DI DATA ---
  const tglTerbaru = useMemo(()=>{
    if(!data.length) return new Date()
    return data.reduce((max,d)=>{ const t=parseTgl(d.Tanggal); return t>max?t:max }, parseTgl(data[0].Tanggal))
  },[data])

  const filtered = useMemo(()=>{
    if(!data.length) return []
    const anchor = tglTerbaru.getTime()
    return data.filter(d=>{
      const diff = (anchor - parseTgl(d.Tanggal).getTime())/86400000
      const okQ =!q || d["Node/Pos"].toLowerCase().includes(q.toLowerCase()) || d.KENDALA.toLowerCase().includes(q.toLowerCase())
      const okLink = link==="Semua" || d.LINK===link
      let okP=true
      if(period==="1H") okP=diff<=1
      if(period==="7H") okP=diff<=7
      if(period==="30H") okP=diff<=30
      if(period==="90H") okP=diff<=90
      if(period==="3H+"){ // >3 hari berturut logic: akan dihitung di bawah, disini tampilkan semua dulu
        okP=true
      }
      return okQ && okLink && okP
    })
  },[data,q,link,period,tglTerbaru])

  // Hitung node down 3 hari berturut2
  const down3Hari = useMemo(()=>{
    const map={}
    data.forEach(d=>{
      const key=d["Node/Pos"]
      if(!map[key]) map[key]=[]
      map[key].push(parseTgl(d.Tanggal))
    })
    const result=[]
    Object.entries(map).forEach(([node, dates])=>{
      dates.sort((a,b)=>a-b)
      let streak=1
      for(let i=1;i<dates.length;i++){
        const diff=(dates[i]-dates[i-1])/86400000
        if(diff<=1.5) streak++; else streak=1
        if(streak>=3){ result.push(node); break }
      }
    })
    return result
  },[data])

  const filtered3Hari = period==="3H+"? filtered.filter(d=>down3Hari.includes(d["Node/Pos"])) : filtered
  const finalData = period==="3H+"? filtered3Hari : filtered
  const pageData = finalData.slice(page*50,(page+1)*50)

  const btn = (active)=>({padding:'12px 16px',borderRadius:12,border:'2px solid #000',background:active?'#000':'#fff',color:active?'#fff':'#000',cursor:'pointer',fontWeight:'bold',minWidth:90})

  // --- LOGIN HANDLER ---
  const handleLogin=()=>{
    const u=users.find(x=>x.username===loginForm.username && x.password===loginForm.password)
    if(!u){ alert('Username / password salah! default admin/admin123'); return }
    localStorage.setItem(LS_SESSION, JSON.stringify(u))
    setSession(u)
  }
  const handleLogout=()=>{ localStorage.removeItem(LS_SESSION); setSession(null) }

  // --- CRUD USER ---
  const handleSaveUser=()=>{
    if(!formUser.username ||!formUser.password){ alert('Lengkapi username & password'); return }
    if(editUser){
      setUsers(users.map(u=>u.id===editUser.id? {...u,...formUser}:u))
    }else{
      setUsers([...users,{id:Date.now(),...formUser}])
    }
    setFormUser({username:'',password:'',role:'user',nama:''}); setEditUser(null)
  }
  const handleDeleteUser=(id)=>{ if(!confirm('Hapus user?')) return; setUsers(users.filter(u=>u.id!==id)) }

  // --- JIKA BELUM LOGIN ---
  if(!session){
    return (
      <div style={{minHeight:'100vh',display:'grid',placeItems:'center',background:'#f1f5f9',fontFamily:'sans-serif'}}>
        <div style={{background:'#fff',padding:24,borderRadius:16,boxShadow:'0 4px 12px #0002',width:360}}>
          <h2 style={{fontWeight:800,fontSize:20,marginBottom:4}}>Login Monitoring ESDM</h2>
          <div style={{fontSize:12,color:'#64748b',marginBottom:16}}>default: admin / admin123</div>
          <input placeholder="Username" value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} style={{width:'100%',border:'1px solid #ccc',padding:10,borderRadius:8,marginBottom:8}}/>
          <input type="password" placeholder="Password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} style={{width:'100%',border:'1px solid #ccc',padding:10,borderRadius:8,marginBottom:12}}/>
          <button onClick={handleLogin} style={{width:'100%',background:'#000',color:'#fff',padding:12,borderRadius:8,fontWeight:'bold'}}>LOGIN</button>
        </div>
      </div>
    )
  }

  return(
    {period==='3H+' && (
  <div style={{background:'#fff',borderRadius:12,padding:12}}>
    <h3 style={{fontWeight:800,marginBottom:8}}>Rekap Node Down >3 Hari Berturut ({rekap3HariBurut.length} Node)</h3>
    <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
      <thead style={{background:'#000',color:'#fff'}}>
        <tr><th style={{padding:10,textAlign:'left'}}>Node/Pos</th><th>LINK</th><th>Mulai</th><th>Sampai</th><th>Durasi</th><th style={{textAlign:'left'}}>Kendala Terakhir</th></tr>
      </thead>
      <tbody>
        {rekap3HariBurut.map((r,i)=>(
          <tr key={i} style={{borderBottom:'1px solid #eee',background:r.durasi>=5?'#fee2e2':'#fef3c7'}}>
            <td style={{padding:10,fontWeight:700}}>{r.node}</td>
            <td style={{padding:10,textAlign:'center'}}>{r.LINK}</td>
            <td style={{padding:10}}>{r.mulai}</td>
            <td style={{padding:10}}>{r.sampai}</td>
            <td style={{padding:10,textAlign:'center',fontWeight:800}}>{r.durasi} hari</td>
            <td style={{padding:10,maxWidth:400}}>{r.kendala_terakhir}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{fontSize:11,color:'#64748b',marginTop:8}}>* Kuning = 3-4 hari, Merah = 5 hari+ berturut-turut down</div>
  </div>
    )}
    <div style={{minHeight:'100vh',background:'#f1f5f9',padding:16,fontFamily:'sans-serif'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h1 style={{fontSize:22,fontWeight:800}}>Rekap Laporan 2026 - ICON & DTP | Hi, {session.nama} ({session.role})</h1>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setTab('dashboard')} style={btn(tab==='dashboard')}>Dashboard</button>
          {session.role==='admin' && <button onClick={()=>setTab('users')} style={btn(tab==='users')}>CRUD User</button>}
          <button onClick={handleLogout} style={{padding:'8px 12px',borderRadius:8,border:'1px solid #ccc',background:'#fff'}}>Logout</button>
        </div>
      </div>

      {tab==='dashboard'? <>
        <div style={{fontSize:12,color:'#64748b',margin:'8px 0'}}>Patokan: {tglTerbaru.toDateString()} (tanggal terbaru di Sheet) | Total: {data.length} | Filtered: {finalData.length} | Node down 3H+: {down3Hari.length}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8,marginBottom:12}}>
          <div style={{background:'#fff',padding:14,borderRadius:12}}>TOTAL<div style={{fontSize:22,fontWeight:800}}>{data.length}</div></div>
          {[
            {l:'1H',v:data.filter(d=>(tglTerbaru-parseTgl(d.Tanggal))/86400000<=1).length},
            {l:'7H',v:data.filter(d=>(tglTerbaru-parseTgl(d.Tanggal))/86400000<=7).length},
            {l:'30H',v:data.filter(d=>(tglTerbaru-parseTgl(d.Tanggal))/86400000<=30).length},
            {l:'90H',v:data.filter(d=>(tglTerbaru-parseTgl(d.Tanggal))/86400000<=90).length},
            {l:'3H+',v:down3Hari.length},
            {l:'Semua',v:data.length},
          ].map(k=><button key={k.l} onClick={()=>{setPeriod(k.l);setPage(0)}} style={btn(period===k.l)}>{k.l}<br/>{k.v}</button>)}
        </div>

        <div style={{background:'#fff',padding:10,borderRadius:12,display:'flex',gap:8,marginBottom:10}}>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari Node/Pos / KENDALA" style={{flex:1,border:'1px solid #ccc',padding:8,borderRadius:8}}/>
          <select value={link} onChange={e=>setLink(e.target.value)} style={{border:'1px solid #ccc',padding:8,borderRadius:8}}><option>Semua</option><option>Icon</option><option>DTP</option></select>
        </div>

        <div style={{background:'#fff',borderRadius:12,overflow:'auto'}}>
          <table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}>
            <thead style={{background:'#000',color:'#fff'}}><tr><th style={{padding:10,textAlign:'left'}}>Tanggal</th><th style={{padding:10,textAlign:'left'}}>Node/Pos</th><th style={{padding:10}}>LINK</th><th style={{padding:10,textAlign:'left'}}>KENDALA</th></tr></thead>
            <tbody>{pageData.map((r,i)=><tr key={i} style={{borderBottom:'1px solid #eee',background:down3Hari.includes(r["Node/Pos"])?'#fef3c7':'#fff'}}><td style={{padding:8}}>{r.Tanggal}</td><td style={{padding:8,fontWeight:600}}>{r["Node/Pos"]}</td><td style={{padding:8,textAlign:'center'}}>{r.LINK}</td><td style={{padding:8}}>{r.KENDALA}</td></tr>)}</tbody>
          </table>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}><span>{page*50+1}-{Math.min((page+1)*50,finalData.length)} / {finalData.length}</span><span><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Prev</button> {page+1} / {Math.ceil(finalData.length/50)} <button disabled={(page+1)*50>=finalData.length} onClick={()=>setPage(p=>p+1)}>Next</button></span></div>
      </>:<>

        {/* CRUD USER TAB */}
        <div style={{background:'#fff',padding:16,borderRadius:12,marginTop:12}}>
          <h3 style={{fontWeight:800,marginBottom:12}}>CRUD User (hanya admin)</h3>
          <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
            <input placeholder="Nama" value={formUser.nama} onChange={e=>setFormUser({...formUser,nama:e.target.value})} style={{border:'1px solid #ccc',padding:8,borderRadius:8}}/>
            <input placeholder="Username" value={formUser.username} onChange={e=>setFormUser({...formUser,username:e.target.value})} style={{border:'1px solid #ccc',padding:8,borderRadius:8}}/>
            <input placeholder="Password" value={formUser.password} onChange={e=>setFormUser({...formUser,password:e.target.value})} style={{border:'1px solid #ccc',padding:8,borderRadius:8}}/>
            <select value={formUser.role} onChange={e=>setFormUser({...formUser,role:e.target.value})} style={{border:'1px solid #ccc',padding:8,borderRadius:8}}><option value="user">user</option><option value="admin">admin</option></select>
            <button onClick={handleSaveUser} style={{background:'#000',color:'#fff',padding:'8px 16px',borderRadius:8}}>{editUser?'Update':'Tambah'}</button>
            {editUser && <button onClick={()=>{setEditUser(null);setFormUser({username:'',password:'',role:'user',nama:''})}} style={{border:'1px solid #ccc',padding:'8px 12px',borderRadius:8}}>Batal</button>}
          </div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:14}}>
            <thead><tr style={{background:'#f1f5f9'}}><th style={{padding:8,textAlign:'left'}}>Nama</th><th>Username</th><th>Role</th><th>Aksi</th></tr></thead>
            <tbody>{users.map(u=><tr key={u.id} style={{borderBottom:'1px solid #eee'}}><td style={{padding:8}}>{u.nama}</td><td style={{padding:8}}>{u.username}</td><td style={{padding:8}}>{u.role}</td><td style={{padding:8,display:'flex',gap:6}}><button onClick={()=>{setEditUser(u);setFormUser(u)}} style={{padding:'4px 8px',borderRadius:6,border:'1px solid #ccc'}}>Edit</button><button onClick={()=>handleDeleteUser(u.id)} style={{padding:'4px 8px',borderRadius:6,background:'#ef4444',color:'#fff'}}>Hapus</button></td></tr>)}</tbody>
          </table>
        </div>
      </>}
    </div>
  )
}