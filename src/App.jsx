import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
const BACKEND = (import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app").replace(/\/api\/?$/,'');
const API_URL = `${BACKEND}/api/data`;
const cleanNode = (s) => { let v=String(s||''); v=v.replace(/^\s*[\d\.\-\)\:\s\u00A0\xA0]+/g,'').trim(); const m=v.match(/[A-Za-z].*/s); return m? m[0].split('\n')[0].trim() : v.split('\n')[0].trim(); };
const bulan={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11};
const toDay=s=>{const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); return m? new Date(+m[3],bulan[m[2]]??0,+m[1]).toISOString().slice(0,10):null;}
const parseTgl=s=>{const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); return m? new Date(+m[3],bulan[m[2]]??0,+m[1]):new Date(0);};

export default function App(){
  const [raw,setRaw]=useState([]); const [filter,setFilter]=useState('semua'); const [search,setSearch]=useState(''); const [menu,setMenu]=useState('icon');
  const [user,setUser]=useState(()=>{ try{ return JSON.parse(localStorage.getItem('esdm_user')||'null'); } catch{ return null; } });
  const [loginForm,setLoginForm]=useState({username:'',password:''});
  const [usersList,setUsersList]=useState([]); const [formUser,setFormUser]=useState({username:'',email:'',password:'',role:'Viewer'}); const [editUser,setEditUser]=useState(null);

  const isSuperAdmin = user?.role?.includes('Super');
  useEffect(()=>{ if(!user) return; fetch(`${API_URL}?gid=0`).then(r=>r.json()).then(j=>setRaw(j.data||[])); },[user]);
  const loadUsers=async()=>{ const {data}=await supabase.from('users').select('*').order('created_at',{ascending:false}); if(data) setUsersList(data); };
  useEffect(()=>{ if(user) loadUsers(); },[user,menu]);

  const handleLogin=async(e)=>{ e.preventDefault(); const {data,error}=await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single(); if(error||!data){ alert('Login gagal! '+ (error?.message||'user tidak ada')); return; } localStorage.setItem('esdm_user',JSON.stringify(data)); setUser(data); };
  const filtered=useMemo(()=>{ let arr=[...raw]; if(search){ const s=search.toLowerCase(); arr=arr.filter(d=> d.Tanggal?.toLowerCase().includes(s)||d["Node/Pos"]?.toLowerCase().includes(s)); } if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus); return arr.sort((a,b)=>parseTgl(b.Tanggal)-parseTgl(a.Tanggal)); },[raw,filter,search]);
  const count3H = raw.filter(r=>r.is3HPlus).length;

  if(!user){
    return <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f172a,#000)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif'}}>
      <div style={{width:360,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:24,padding:28,backdropFilter:'blur(12px)'}}>
        <h1 style={{fontSize:28,fontWeight:900,background:'linear-gradient(90deg,#fde047,#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>ESDM LOGIN</h1>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:12,marginBottom:16}}>Total {raw.length||784} Node Monitoring</p>
        <form onSubmit={handleLogin} style={{display:'grid',gap:12}}>
          <input value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} placeholder="Username" style={{width:'100%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:12,padding:'12px 16px',color:'#fff',outline:'none'}}/>
          <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Password" style={{width:'100%',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:12,padding:'12px 16px',color:'#fff',outline:'none'}}/>
          <button style={{width:'100%',background:'linear-gradient(135deg,#fde047,#f97316)',color:'#000',fontWeight:900,padding:12,borderRadius:12,border:'none',cursor:'pointer'}}>Login Awal</button>
        </form>
        <div style={{marginTop:12,fontSize:10,color:'rgba(255,255,255,0.3)',wordBreak:'break-all'}}>{import.meta.env.VITE_SUPABASE_URL}</div>
      </div>
    </div>
  }

  return <div style={{minHeight:'100vh',background:'#0f172a',color:'#fff',fontFamily:'Inter,sans-serif',display:'flex'}}>
    <style>{`*{box-sizing:border-box} table{border-collapse:collapse} .badge{padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800}`}</style>
    <div style={{width:260,background:'rgba(0,0,0,0.6)',borderRight:'1px solid rgba(255,255,255,0.1)',padding:20,display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontWeight:900,letterSpacing:1}}>ESDM MONITORING</div>
      <div style={{fontSize:12,color:'#fde047',fontWeight:700}}>{user.username} ({user.role})</div>
      <button onClick={()=>setMenu('icon')} style={{textAlign:'left',padding:'12px 16px',borderRadius:12,border:'1px solid rgba(255,255,255,0.1)',background:menu==='icon'?'#fff':'rgba(255,255,255,0.05)',color:menu==='icon'?'#000':'#fff',fontWeight:800,cursor:'pointer'}}>📡 Node Icon</button>
      <button onClick={()=>setMenu('dtp')} style={{textAlign:'left',padding:'12px 16px',borderRadius:12,border:'1px solid rgba(255,255,255,0.1)',background:menu==='dtp'?'#fff':'rgba(255,255,255,0.05)',color:menu==='dtp'?'#000':'#fff',fontWeight:800,cursor:'pointer'}}>📊 Node DTP</button>
      <button onClick={()=>setMenu('users')} style={{textAlign:'left',padding:'12px 16px',borderRadius:12,border:'1px solid rgba(255,255,255,0.1)',background:menu==='users'?'#fff':'rgba(255,255,255,0.05)',color:menu==='users'?'#000':'#fff',fontWeight:800,cursor:'pointer'}}>👥 List Pemakai ({usersList.length})</button>
      <div style={{marginTop:'auto'}}>
        <button onClick={()=>{localStorage.removeItem('esdm_user'); setUser(null);}} style={{width:'100%',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',padding:10,borderRadius:12,cursor:'pointer',fontWeight:700}}>🚪 Logout</button>
        <div style={{marginTop:12,display:'flex',gap:6}}><button onClick={()=>setFilter('semua')} style={{flex:1,padding:'6px 8px',borderRadius:20,border:'1px solid rgba(255,255,255,0.15)',background:filter==='semua'?'#fff':'transparent',color:filter==='semua'?'#000':'#fff',fontSize:11}}>Semua</button><button onClick={()=>setFilter('3hari')} style={{flex:1,padding:'6px 8px',borderRadius:20,border:'1px solid rgba(239,68,68,0.3)',background:filter==='3hari'?'#ef4444':'transparent',color:filter==='3hari'?'#fff':'#fca5a5',fontSize:11}}>🔥 3H+ ({count3H})</button></div>
      </div>
    </div>
    <div style={{flex:1,padding:16,overflow:'auto'}}>
      {menu==='users' ? (
        <div style={{display:'grid',gap:16}}>
          <div style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,padding:16,display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr auto',gap:8}}>
            <input value={formUser.username} onChange={e=>setFormUser({...formUser,username:e.target.value})} placeholder="Username" style={{background:'#000',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:10,color:'#fff'}}/>
            <input value={formUser.email} onChange={e=>setFormUser({...formUser,email:e.target.value})} placeholder="Email" style={{background:'#000',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:10,color:'#fff'}}/>
            <input value={formUser.password} onChange={e=>setFormUser({...formUser,password:e.target.value})} placeholder="Password" style={{background:'#000',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:10,color:'#fff'}}/>
            <select value={formUser.role} onChange={e=>setFormUser({...formUser,role:e.target.value})} style={{background:'#000',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:10,color:'#fff'}}><option>Super Admin ESDM</option><option>Admin</option><option>Operator</option><option>Viewer</option></select>
            <button onClick={async(e)=>{e.preventDefault(); if(editUser){ await supabase.from('users').update({username:formUser.username,email:formUser.email,password:formUser.password,role:formUser.role}).eq('id',editUser.id); setEditUser(null);} else { await supabase.from('users').insert([{username:formUser.username,email:formUser.email,password:formUser.password,role:formUser.role}]);} setFormUser({username:'',email:'',password:'',role:'Viewer'}); loadUsers();}} style={{background:'#fff',color:'#000',fontWeight:800,borderRadius:10,padding:'0 20px',border:'none',cursor:'pointer'}}>{editUser?'Update':'Create'}</button>
          </div>
          <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,overflow:'hidden'}}>
            <table style={{width:'100%',fontSize:13}}><thead style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',fontSize:11,textTransform:'uppercase'}}><tr><th style={{padding:12,textAlign:'left'}}>Username</th><th style={{padding:12,textAlign:'left'}}>Email</th><th style={{padding:12,textAlign:'left'}}>Role</th><th style={{padding:12}}>Aksi</th></tr></thead><tbody>{usersList.map(u=><tr key={u.id} style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}><td style={{padding:12}}>{u.username}</td><td style={{padding:12,color:'rgba(255,255,255,0.5)'}}>{u.email||'-'}</td><td style={{padding:12}}><span style={{background:'#fde047',color:'#000',padding:'2px 8px',borderRadius:999,fontSize:11,fontWeight:800}}>{u.role}</span></td><td style={{padding:12,textAlign:'center',display:'flex',gap:6,justifyContent:'center'}}><button onClick={()=>{setEditUser(u); setFormUser({username:u.username,email:u.email||'',password:u.password,role:u.role});}} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',padding:'4px 10px',borderRadius:8,cursor:'pointer',fontSize:11}}>Edit</button><button onClick={async()=>{ if(!confirm('Hapus?')) return; await supabase.from('users').delete().eq('id',u.id); loadUsers();}} style={{background:'rgba(239,68,68,0.2)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5',padding:'4px 10px',borderRadius:8,cursor:'pointer',fontSize:11}}>Hapus</button></td></tr>)}</tbody></table>
          </div>
        </div>
      ) : (
        <div style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:20,overflow:'hidden'}}>
          <div style={{padding:12,display:'flex',gap:8,borderBottom:'1px solid rgba(255,255,255,0.08)'}}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari tanggal / node..." style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:999,padding:'8px 16px',color:'#fff',width:260,outline:'none'}}/><span style={{marginLeft:'auto',background:'#fff',color:'#000',padding:'6px 14px',borderRadius:999,fontSize:12,fontWeight:800}}>Total {filtered.length} | 3H+ {count3H}</span></div>
          <table style={{width:'100%',fontSize:13}}><thead style={{background:'rgba(255,255,255,0.08)'}}><tr style={{color:'rgba(255,255,255,0.6)',fontSize:11,textTransform:'uppercase'}}><th style={{padding:12,textAlign:'left'}}>Tanggal</th><th style={{padding:12,textAlign:'left'}}>Node/Pos</th><th style={{padding:12,textAlign:'left'}}>LINK</th><th style={{padding:12,textAlign:'left'}}>STATUS</th></tr></thead><tbody>{filtered.map((row,i)=><tr key={i} style={{borderBottom:'1px solid rgba(255,255,255,0.05)',background:row.is3HPlus?'rgba(239,68,68,0.1)':''}}><td style={{padding:'10px 12px',color:'#fde68a',fontSize:12}}>{row.Tanggal}</td><td style={{padding:'10px 12px',fontWeight:700}}>{cleanNode(row["Node/Pos"])}</td><td style={{padding:'10px 12px'}}><span style={{background:'rgba(255,255,255,0.08)',padding:'3px 8px',borderRadius:6,fontSize:11}}>{row.LINK}</span></td><td style={{padding:'10px 12px'}}>{row.is3HPlus?<span className="badge" style={{background:'#ef4444',color:'#fff'}}>🔥 3H+ MERAH</span>:<span className="badge" style={{background:'#10b981',color:'#fff'}}>☑ Bagus</span>}</td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  </div>
}
