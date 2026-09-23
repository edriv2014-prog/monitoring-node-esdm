
import { useState, useEffect, useMemo } from 'react'
import Papa from 'papaparse'
import { supabase, fetchSheet, loginWithSupabase } from './supabaseClient'

const NODES=["PGA Rinjani","PGA Agung","PGA Merapi","PGA Semeru","PGA Sinabung","PGA Krakatau","PGA Bromo","PGA Kerinci"]
function getStreaks(dates){
  if(!dates.length) return []
  dates=[...new Set(dates.map(d=>new Date(d).toISOString().slice(0,10)))].map(s=>new Date(s)).sort((a,b)=>a-b)
  let streaks=[], cur=[dates[0]]
  for(let i=1;i<dates.length;i++){ const diff=(dates[i]-dates[i-1])/(1000*3600*24); if(diff===1) cur.push(dates[i]); else {streaks.push(cur); cur=[dates[i]]} }
  streaks.push(cur); return streaks.map(s=>({start:s[0],end:s[s.length-1],len:s.length, dates:s}))
}

export default function App(){
  const DS = import.meta.env.VITE_DATA_SOURCE || 'google_sheet'
  const [isLogin,setIsLogin]=useState(!!localStorage.getItem('user'))
  const [user,setUser]=useState(()=>{ try{return JSON.parse(localStorage.getItem('user')||'null')}catch{return null}})
  const role = user?.role || ''
  const [loginForm,setLoginForm]=useState({u:'',p:''})
  const [tab,setTab]=useState('dashboard')
  const [env,setEnv]=useState({VITE_DATA_SOURCE:DS, VITE_SHEET_ID:import.meta.env.VITE_SHEET_ID||'1f83CxoN-7Oqa_F7LwqejfK8bIrpW0wGJgZAkkeVgbik', VITE_GID:import.meta.env.VITE_GID||'1399857480', VITE_SHEET_NAME:import.meta.env.VITE_SHEET_NAME||'Sheet1', VITE_SHEET_API_KEY:import.meta.env.VITE_SHEET_API_KEY||'', VITE_SUPABASE_URL:import.meta.env.VITE_SUPABASE_URL||'', VITE_SUPABASE_ANON_KEY:import.meta.env.VITE_SUPABASE_ANON_KEY||''})
  const [data,setData]=useState([])
  const [acuan,setAcuan]=useState('2026-09-01'); const [rentang,setRentang]=useState('7')
  const [fLink,setFLink]=useState('Semua'); const [fKendala,setFKendala]=useState('Semua'); const [fNode,setFNode]=useState('Semua')
  const [supaTable,setSupaTable]=useState('monitoring_node')
  const [users,setUsers]=useState([])

  useEffect(()=>{
    const mock=[]
    for(let i=0;i<80;i++){ const d=new Date(2026,8,Math.floor(Math.random()*10)+1); mock.push({tanggal:d.toISOString().slice(0,10), node_pos:NODES[i%NODES.length], link:i%2?'DTP':'ICON', kendala:['FO CUT','PLN','POP','Router'][i%4], durasi:20+Math.floor(Math.random()*200), rfo:'Gangguan'})}
    mock.push({tanggal:'2026-09-01',node_pos:'PGA Rinjani',link:'ICON',kendala:'FO CUT',durasi:120,rfo:'1,2,3'},{tanggal:'2026-09-02',node_pos:'PGA Rinjani',link:'ICON',kendala:'FO CUT',durasi:90,rfo:'1,2,3'},{tanggal:'2026-09-03',node_pos:'PGA Rinjani',link:'ICON',kendala:'FO CUT',durasi:110,rfo:'1,2,3'},{tanggal:'2026-09-06',node_pos:'PGA Rinjani',link:'ICON',kendala:'FO CUT',durasi:30,rfo:'6,7'},{tanggal:'2026-09-07',node_pos:'PGA Rinjani',link:'ICON',kendala:'FO CUT',durasi:40,rfo:'6,7'})
    setData(mock)
    if(DS==='google_sheet'){ fetchSheet().then(res=>{ if(res?.type==='csv'){ const parsed=Papa.parse(res.text,{header:true}); const rows=parsed.data.filter(r=>r.tanggal||r.Tanggal); if(rows.length) setData(rows.map(r=>({tanggal:r.tanggal||r.Tanggal, node_pos:r.node_pos||r.Node, link:r.link||'ICON', kendala:r.kendala||'FO CUT', durasi:parseInt(r.durasi||60), rfo:r.rfo||''}))) } }) }
    if(supabase){ supabase.from('users').select('*').then(({data})=>{ if(data) setUsers(data) }) }
  },[])

  const login=async()=>{
alert("sqsqsq="+loginForm.p);
    const u = await loginWithSupabase(loginForm.u, loginForm.p)
    if(!u) return alert('Login gagal! Cek tabel users di Supabase. Default: admin/admin super_admin, operator/admin admin')
    localStorage.setItem('user', JSON.stringify(u)); localStorage.setItem('role', u.role); setUser(u); setIsLogin(true)
  }
  const logout=()=>{localStorage.clear(); setIsLogin(false); setUser(null)}

  const filtered=useMemo(()=>{
    let res=[...data]
    if(rentang!=='Semua'){ const s=new Date(acuan); const e=new Date(s); e.setDate(s.getDate()+parseInt(rentang)-1); res=res.filter(r=>{const d=new Date(r.tanggal); return d>=s && d<=e})}
    if(fLink!=='Semua') res=res.filter(r=>r.link===fLink)
    if(fKendala!=='Semua') res=res.filter(r=>r.kendala===fKendala)
    if(fNode!=='Semua') res=res.filter(r=>r.node_pos===fNode)
    return res
  },[data,rentang,acuan,fLink,fKendala,fNode])

  const sering=useMemo(()=>{
    const map={}; data.forEach(r=>{ if(!map[r.node_pos]) map[r.node_pos]=[]; map[r.node_pos].push(r.tanggal)})
    const out=[]; Object.entries(map).forEach(([node,dates])=>{ const streaks=getStreaks(dates); const max=Math.max(...streaks.map(s=>s.len),0); if(max>=3){ const longest=streaks.reduce((a,b)=>a.len>b.len?a:b); out.push({node,max,longest}) } }); return out
  },[data])

  if(!isLogin) return <div className="min-h-screen bg-[#0f2a44] flex items-center justify-center"><div className="bg-white p-8 rounded-2xl w-[420px]"><h1 className="font-bold text-xl">ESDM PUSDATIN LOGIN</h1><p className="text-xs text-gray-500 mb-4">Pakai table users Supabase. Default: admin/admin (super_admin)</p><input placeholder="Username" value={loginForm.u} onChange={e=>setLoginForm({...loginForm,u:e.target.value})} className="w-full border p-2.5 rounded-xl mb-3"/><input type="password" placeholder="Password" value={loginForm.p} onChange={e=>setLoginForm({...loginForm,p:e.target.value})} className="w-full border p-2.5 rounded-xl mb-4"/><button onClick={login} className="w-full bg-[#0f2a44] text-white py-2.5 rounded-xl font-bold">Login</button><div className="mt-4 bg-gray-50 p-3 rounded-xl text-[11px]"><p className="font-bold">TABLE users:</p><p>username: admin | password: admin | role: super_admin</p><p>username: operator | password: admin | role: admin</p><p className="mt-2">SQL di supabase.sql sudah include</p></div></div></div>

  return <div className="flex min-h-screen">
    <div className="w-64 bg-[#0f2a44] text-white p-4 flex flex-col">
      <h1 className="font-bold">ESDM PUSDATIN</h1><p className="text-[11px] opacity-60 mb-1">{user?.nama} - {role}</p><p className="text-[10px] opacity-40 mb-6">{DS} | GID {env.VITE_GID}</p>
      <nav className="space-y-1 flex-1">
        <button onClick={()=>setTab('dashboard')} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${tab==='dashboard'?'bg-white/15':''}`}>📊 Dashboard</button>
        <button onClick={()=>setTab('gangguan')} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${tab==='gangguan'?'bg-white/15':''}`}>⚠️ Laporan Gangguan</button>
        <button onClick={()=>setTab('sering')} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${tab==='sering'?'bg-white/15':''}`}>🔥 Sering &gt;3x</button>
        {(DS==='CSV' || env.VITE_DATA_SOURCE==='CSV') && <button onClick={()=>setTab('upload')} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${tab==='upload'?'bg-white/15':''}`}>⊞ Upload Sheet</button>}
        {role==='super_admin' && <><button onClick={()=>setTab('users')} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${tab==='users'?'bg-white/15':''}`}>👥 Kelola User</button><button onClick={()=>setTab('settings')} className={`w-full text-left px-3 py-2.5 rounded-xl text-sm ${tab==='settings'?'bg-white/15':''}`}>⚙️ Settings (.env)</button></>}
      </nav>
      <button onClick={logout} className="text-xs opacity-60">Logout</button>
    </div>
    <div className="flex-1 p-6 overflow-auto">
      {(tab==='dashboard'||tab==='gangguan') && <div className="bg-white rounded-2xl p-5 border mb-5"><h3 className="font-bold text-sm mb-3">FILTER MONITORING</h3><div className="flex flex-wrap gap-4"><div><p className="text-[11px] font-bold text-gray-500">RENTANG</p><div className="flex gap-2 mt-1">{['1','7','30','90','Semua'].map(v=><button key={v} onClick={()=>setRentang(v)} className={`px-3 py-1.5 rounded-full text-xs border ${rentang===v?'bg-[#0f2a44] text-white':''}`}>{v==='Semua'?v:v+' Hari'}</button>)}</div></div><div><p className="text-[11px] font-bold text-gray-500">Acuan</p><input type="date" value={acuan} onChange={e=>setAcuan(e.target.value)} className="border rounded-lg px-2 py-1 text-xs mt-1"/></div></div><div className="flex gap-2 mt-3"><select value={fLink} onChange={e=>setFLink(e.target.value)} className="border rounded-lg px-2 py-1 text-xs"><option>Semua</option><option>ICON</option><option>DTP</option></select><select value={fKendala} onChange={e=>setFKendala(e.target.value)} className="border rounded-lg px-2 py-1 text-xs"><option>Semua</option><option>FO CUT</option><option>PLN</option><option>POP</option><option>Router</option></select><select value={fNode} onChange={e=>setFNode(e.target.value)} className="border rounded-lg px-2 py-1 text-xs"><option>Semua</option>{NODES.map(n=><option key={n}>{n}</option>)}</select></div></div>}
      {tab==='dashboard' && <div className="grid grid-cols-4 gap-4"><div className="bg-white p-4 rounded-2xl border"><p className="text-[11px] text-gray-500">FO CUT</p><p className="text-2xl font-bold">{filtered.filter(d=>d.kendala==='FO CUT').length}</p></div><div className="bg-white p-4 rounded-2xl border"><p className="text-[11px] text-gray-500">TOTAL</p><p className="text-2xl font-bold">{filtered.length}</p></div><div className="bg-white p-4 rounded-2xl border"><p className="text-[11px] text-gray-500">NODE</p><p className="text-2xl font-bold">{new Set(filtered.map(d=>d.node_pos)).size}</p></div><div className="bg-white p-4 rounded-2xl border"><p className="text-[11px] text-gray-500">GID</p><p className="text-xl font-bold">{env.VITE_GID}</p></div></div>}
      {tab==='gangguan' && <div className="bg-white rounded-2xl border overflow-hidden"><table className="w-full text-xs"><thead className="bg-gray-50"><tr><th className="p-2.5 text-left">Tanggal</th><th className="p-2.5 text-left">Node/Pos</th><th className="p-2.5">LINK</th><th className="p-2.5">KENDALA</th><th className="p-2.5">Durasi</th></tr></thead><tbody>{filtered.map((r,i)=><tr key={i} className="border-t"><td className="p-2.5">{r.tanggal}</td><td className="p-2.5 font-bold">{r.node_pos}</td><td className="p-2.5 text-center">{r.link}</td><td className="p-2.5">{r.kendala}</td><td className="p-2.5">{r.durasi}m</td></tr>)}</tbody></table></div>}
      {tab==='sering' && <div className="bg-white rounded-2xl border p-5"><h2 className="font-bold">Sering Kendala &gt;3x berturut tanpa bolong</h2><table className="w-full text-xs mt-3"><thead className="bg-gray-50"><tr><th className="p-2 text-left">Node</th><th className="p-2">Max</th><th className="p-2 text-left">Rentang</th></tr></thead><tbody>{sering.map((r,i)=><tr key={i} className="border-t"><td className="p-2 font-bold">{r.node}</td><td className="p-2 text-center"><span className="bg-red-600 text-white px-2 py-0.5 rounded-full">{r.max}</span></td><td className="p-2">{r.longest.start.toISOString().slice(0,10)} - {r.longest.end.toISOString().slice(0,10)}</td></tr>)}</tbody></table></div>}
      {tab==='users' && role==='super_admin' && <div className="bg-white rounded-2xl border p-5"><h2 className="font-bold">👥 Kelola User (table users)</h2><p className="text-xs text-gray-500">Super admin only</p><table className="w-full text-xs mt-4"><thead className="bg-gray-50"><tr><th className="p-2 text-left">Username</th><th className="p-2 text-left">Nama</th><th className="p-2">Role</th><th className="p-2">Password</th></tr></thead><tbody>{(users.length?users:[{username:'admin',password:'admin',role:'super_admin',nama:'Super Admin'},{username:'operator',password:'admin',role:'admin',nama:'Operator'}]).map((u,i)=><tr key={i} className="border-t"><td className="p-2">{u.username}</td><td className="p-2">{u.nama}</td><td className="p-2 text-center"><span className={`px-2 py-0.5 rounded-full ${u.role==='super_admin'?'bg-[#0f2a44] text-white':'bg-gray-200'}`}>{u.role}</span></td><td className="p-2">{u.password}</td></tr>)}</tbody></table><p className="text-[11px] mt-3">Tambah user via Supabase: INSERT INTO users (username,password,role) VALUES ('baru','admin','admin')</p></div>}
      {tab==='upload' && <div className="bg-white rounded-2xl border p-5"><h2 className="font-bold">⊞ Upload Sheet - CSV + Supabase</h2><div className="flex gap-3 mt-4"><select value={supaTable} onChange={e=>setSupaTable(e.target.value)} className="border rounded-xl p-2 text-sm"><option value="monitoring_node">monitoring_node</option><option value="laphar">laphar</option></select><input type="file" accept=".csv" onChange={e=>{const f=e.target.files[0]; Papa.parse(f,{header:true,complete:async(res)=>{const rows=res.data.filter(r=>r.tanggal); setData(rows); if(supabase){await supabase.from(supaTable).insert(rows); alert('Simpan ke '+supaTable)} else alert('Parsed '+rows.length)}})}} className="border rounded-xl p-2 text-sm"/></div></div>}
      {tab==='settings' && role==='super_admin' && <div className="bg-white rounded-2xl border p-5 max-w-3xl"><h2 className="font-bold">Settings (.env) - Super Admin Only - GID {env.VITE_GID}</h2><div className="grid grid-cols-2 gap-3 mt-4"><label className="flex flex-col"><span className="text-xs font-bold">VITE_DATA_SOURCE (default google_sheet)</span><select value={env.VITE_DATA_SOURCE} onChange={e=>setEnv({...env,VITE_DATA_SOURCE:e.target.value})} className="border p-2 rounded-xl text-sm"><option value="google_sheet">google_sheet (default) - Upload HILANG</option><option value="CSV">CSV - Upload MUNCUL untuk laphar/monitoring_node</option></select></label><label className="flex flex-col"><span className="text-xs font-bold">VITE_GID = 1399857480</span><input value={env.VITE_GID} onChange={e=>setEnv({...env,VITE_GID:e.target.value})} className="border-2 border-blue-400 p-2 rounded-xl text-sm"/></label><label className="col-span-2 flex flex-col"><span className="text-xs font-bold">VITE_SHEET_ID</span><input value={env.VITE_SHEET_ID} onChange={e=>setEnv({...env,VITE_SHEET_ID:e.target.value})} className="border p-2 rounded-xl text-sm"/></label><label className="flex flex-col"><span className="text-xs font-bold">VITE_SHEET_NAME</span><input value={env.VITE_SHEET_NAME} onChange={e=>setEnv({...env,VITE_SHEET_NAME:e.target.value})} className="border p-2 rounded-xl text-sm"/></label><label className="flex flex-col"><span className="text-xs font-bold">VITE_SUPABASE_URL</span><input value={env.VITE_SUPABASE_URL} onChange={e=>setEnv({...env,VITE_SUPABASE_URL:e.target.value})} className="border p-2 rounded-xl text-sm"/></label></div><div className="mt-4 bg-gray-900 text-green-300 p-3 rounded-xl font-mono text-xs"><div>VITE_DATA_SOURCE={env.VITE_DATA_SOURCE}</div><div>VITE_SHEET_ID={env.VITE_SHEET_ID}</div><div>VITE_GID={env.VITE_GID}</div></div></div>}
    </div>
  </div>
}
