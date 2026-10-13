import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
const BACKEND = (import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app").replace(/\/api\/?$/,'');
const API_URL = `${BACKEND}/api/data`;
const cleanNode = (s) => { let v=String(s||''); v=v.replace(/^\s*[\d\.\-\)\:\s\u00A0\xA0]+/g,'').trim(); const m=v.match(/[A-Za-z].*/s); return m? m[0].split('\n')[0].trim() : v.split('\n')[0].trim(); };
const parseTgl=s=>{const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); const b={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11}; return m? new Date(+m[3],b[m[2]]??0,+m[1]):new Date(0);};

export default function App(){
  const [raw,setRaw]=useState([]); const [filter,setFilter]=useState('semua'); const [search,setSearch]=useState(''); const [menu,setMenu]=useState('icon');
  const [user,setUser]=useState(()=>{ try{ return JSON.parse(localStorage.getItem('esdm_user')||'null'); } catch{ return null; } });
  const [loginForm,setLoginForm]=useState({username:'',password:''});
  const [usersList,setUsersList]=useState([]); const [formUser,setFormUser]=useState({username:'',email:'',password:'',role:'Viewer'}); const [editUser,setEditUser]=useState(null);

  useEffect(()=>{ if(!user) return; fetch(`${API_URL}?gid=0`).then(r=>r.json()).then(j=>setRaw(j.data||[])); },[user]);
  const loadUsers=async()=>{ const {data}=await supabase.from('users').select('*').order('created_at',{ascending:false}); if(data) setUsersList(data); };
  useEffect(()=>{ if(user) loadUsers(); },[user,menu]);
  const handleLogin=async(e)=>{ e.preventDefault(); const {data,error}=await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single(); if(error||!data){ alert('Login gagal! '+ (error?.message||'')); return; } localStorage.setItem('esdm_user',JSON.stringify(data)); setUser(data); };
  const filtered=useMemo(()=>{ let arr=[...raw]; if(search){ const s=search.toLowerCase(); arr=arr.filter(d=> (d.Tanggal||'').toLowerCase().includes(s) || (d["Node/Pos"]||'').toLowerCase().includes(s) || (d.Kendala||d["KENDALA"]||'').toLowerCase().includes(s)); } if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus); return arr.sort((a,b)=>parseTgl(b.Tanggal)-parseTgl(a.Tanggal)); },[raw,filter,search]);

  if(!user){
    return <div style={{minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter'}}>
      <div style={{width:360,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:24,padding:28}}>
        <h1 style={{fontSize:28,fontWeight:900,color:'#fde047'}}>ESDM LOGIN</h1>
        <form onSubmit={handleLogin} style={{display:'grid',gap:12,marginTop:16}}>
          <input value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} placeholder="Username" style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff'}}/>
          <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Password" style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff'}}/>
          <button style={{padding:12,borderRadius:12,background:'#fde047',color:'#000',fontWeight:900,border:'none'}}>Login</button>
        </form>
      </div>
    </div>
  }

  return <div style={{minHeight:'100vh',background:'#0b1220',color:'#fff',fontFamily:'Inter,system-ui',display:'flex'}}>
    <div style={{width:250,background:'#070d1a',borderRight:'1px solid #1e293b',padding:18,display:'flex',flexDirection:'column',gap:10}}>
      <div style={{fontWeight:900,fontSize:14,letterSpacing:1}}>ESDM MONITORING</div>
      <div style={{fontSize:11,color:'#fde047'}}>{user.username} ({user.role}) • Total {filtered.length} | 3H+ {raw.filter(r=>r.is3HPlus).length}</div>
      <button onClick={()=>setMenu('icon')} style={{textAlign:'left',padding:12,borderRadius:10,background:menu==='icon'?'#fff':'#111c2f',color:menu==='icon'?'#000':'#fff',border:'1px solid #1e293b',fontWeight:700}}>📡 Node Icon</button>
      <button onClick={()=>setMenu('dtp')} style={{textAlign:'left',padding:12,borderRadius:10,background:menu==='dtp'?'#fff':'#111c2f',color:menu==='dtp'?'#000':'#fff',border:'1px solid #1e293b',fontWeight:700}}>📊 Node DTP</button>
      <button onClick={()=>setMenu('users')} style={{textAlign:'left',padding:12,borderRadius:10,background:menu==='users'?'#fff':'#111c2f',color:menu==='users'?'#000':'#fff',border:'1px solid #1e293b',fontWeight:700}}>👥 List Pemakai ({usersList.length})</button>
      <button onClick={()=>{localStorage.removeItem('esdm_user'); setUser(null);}} style={{marginTop:'auto',padding:10,borderRadius:10,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5'}}>Logout</button>
      <div style={{display:'flex',gap:6,marginTop:8}}><button onClick={()=>setFilter('semua')} style={{flex:1,padding:6,borderRadius:20,fontSize:11,background:filter==='semua'?'#fff':'transparent',color:filter==='semua'?'#000':'#fff',border:'1px solid #334155'}}>Semua</button><button onClick={()=>setFilter('3hari')} style={{flex:1,padding:6,borderRadius:20,fontSize:11,background:filter==='3hari'?'#ef4444':'transparent',color:filter==='3hari'?'#fff':'#fca5a5',border:'1px solid #7f1d1d'}}>🔥 3H+ ({raw.filter(r=>r.is3HPlus).length})</button></div>
    </div>

    <div style={{flex:1,padding:0,overflow:'auto',background:'#0f1a2f'}}>
      {menu==='users' ? (
        <div style={{padding:16}}>
          <div style={{background:'#111c2f',border:'1px solid #1e293b',borderRadius:12,padding:12,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:8}}>
            <input value={formUser.username} onChange={e=>setFormUser({...formUser,username:e.target.value})} placeholder="Username" style={{background:'#0b1220',border:'1px solid #1e293b',borderRadius:8,padding:8,color:'#fff'}}/>
            <input value={formUser.email} onChange={e=>setFormUser({...formUser,email:e.target.value})} placeholder="Email" style={{background:'#0b1220',border:'1px solid #1e293b',borderRadius:8,padding:8,color:'#fff'}}/>
            <input value={formUser.password} onChange={e=>setFormUser({...formUser,password:e.target.value})} placeholder="Password" style={{background:'#0b1220',border:'1px solid #1e293b',borderRadius:8,padding:8,color:'#fff'}}/>
            <select value={formUser.role} onChange={e=>setFormUser({...formUser,role:e.target.value})} style={{background:'#0b1220',border:'1px solid #1e293b',borderRadius:8,padding:8,color:'#fff'}}><option>Super Admin ESDM</option><option>Admin</option><option>Operator</option><option>Viewer</option></select>
            <button onClick={async()=>{ if(editUser){ await supabase.from('users').update({username:formUser.username,email:formUser.email,password:formUser.password,role:formUser.role}).eq('id',editUser.id); setEditUser(null);} else { await supabase.from('users').insert([{username:formUser.username,email:formUser.email,password:formUser.password,role:formUser.role}]);} setFormUser({username:'',email:'',password:'',role:'Viewer'}); loadUsers();}} style={{background:'#fff',color:'#000',fontWeight:800,borderRadius:8,padding:'0 16px',border:'none'}}>Save</button>
          </div>
          <div style={{marginTop:12,background:'#111c2f',borderRadius:12,overflow:'hidden',border:'1px solid #1e293b'}}><table style={{width:'100%',fontSize:13}}><thead><tr style={{background:'#0b1220',color:'#94a3b8',fontSize:11}}><th style={{padding:10,textAlign:'left'}}>USERNAME</th><th style={{padding:10,textAlign:'left'}}>ROLE</th></tr></thead><tbody>{usersList.map(u=><tr key={u.id} style={{borderTop:'1px solid #1e293b'}}><td style={{padding:10}}>{u.username}</td><td style={{padding:10}}>{u.role}</td></tr>)}</tbody></table></div>
        </div>
      ) : (
        <>
          <div style={{display:'flex',gap:8,padding:'12px 16px',background:'#0f1a2f',borderBottom:'1px solid #1e293b',position:'sticky',top:0,zIndex:2}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari tanggal / node / kendala..." style={{background:'#111c2f',border:'1px solid #1e293b',borderRadius:8,padding:'8px 14px',color:'#fff',width:320}}/>
            <span style={{marginLeft:'auto',fontSize:12,color:'#94a3b8',alignSelf:'center'}}>Total {filtered.length} | 3H+ {raw.filter(r=>r.is3HPlus).length}</span>
          </div>

          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead style={{position:'sticky',top:49,zIndex:1,background:'#1a2744'}}>
              <tr style={{color:'#94a3b8',fontSize:11,textTransform:'uppercase',letterSpacing:0.5}}>
                <th style={{padding:'14px 16px',textAlign:'left',fontWeight:700,borderBottom:'1px solid #1e293b'}}>TANGGAL</th>
                <th style={{padding:'14px 16px',textAlign:'left',fontWeight:700,borderBottom:'1px solid #1e293b'}}>NODE/POS</th>
                <th style={{padding:'14px 16px',textAlign:'left',fontWeight:700,borderBottom:'1px solid #1e293b'}}>KENDALA</th>
                <th style={{padding:'14px 16px',textAlign:'left',fontWeight:700,borderBottom:'1px solid #1e293b'}}>LINK</th>
                <th style={{padding:'14px 16px',textAlign:'left',fontWeight:700,borderBottom:'1px solid #1e293b'}}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row,i)=>{
                const kendala = row.Kendala || row.KENDALA || row.kendala || row["Deskripsi"] || row["Keterangan"] || (row.is3HPlus ? "Link down >3H" : "-");
                return (
                <tr key={i} style={{background: i%2===0 ? '#132042' : '#0f1a2f', borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'12px 16px',color:'#facc15',fontWeight:600,fontSize:13,whiteSpace:'nowrap'}}>{row.Tanggal}</td>
                  <td style={{padding:'12px 16px',color:'#fff',fontWeight:700}}>{cleanNode(row["Node/Pos"])}</td>
                  <td style={{padding:'12px 16px',color: kendala==='-' || !kendala ? '#64748b' : '#e2e8f0', maxWidth:280, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}} title={kendala}>{kendala}</td>
                  <td style={{padding:'12px 16px'}}><span style={{background:'#1e293b',border:'1px solid #334155',padding:'4px 12px',borderRadius:999,fontSize:12,color:'#cbd5e1'}}>{row.LINK || 'Normal'}</span></td>
                  <td style={{padding:'12px 16px'}}>{row.is3HPlus ? <span style={{background:'#ef4444',color:'#fff',padding:'6px 14px',borderRadius:999,fontSize:12,fontWeight:800,display:'inline-flex',alignItems:'center',gap:4}}>🔥 3H+ MERAH</span> : <span style={{background:'#10b981',color:'#fff',padding:'6px 14px',borderRadius:999,fontSize:12,fontWeight:800,display:'inline-flex',alignItems:'center',gap:4}}>☑ Bagus</span>}</td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  </div>
}
