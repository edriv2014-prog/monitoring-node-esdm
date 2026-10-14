import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app").replace(/\/api\/?$/,'');
const API_URL = `${BACKEND}/api/data`;

const clean = (s) => String(s||'').replace(/^\s*[\d\.\-\)\:\s\u00A0]+/g,'').trim().split('\n')[0].trim();
const parseTgl=s=>{const mm={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11}; const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); return m? new Date(+m[3],mm[m[2]]??0,+m[1]):new Date(0);};

export default function App(){
  const [raw,setRaw]=useState([]);
  const [search,setSearch]=useState('');
  const [menu,setMenu]=useState('icon');
  const [filter,setFilter]=useState('semua');
  const [user,setUser]=useState(()=>{ try{ return JSON.parse(localStorage.getItem('esdm_user')||'null'); }catch{ return null; }});
  const [loginForm,setLoginForm]=useState({username:'',password:''});
  const [detail,setDetail]=useState(null);

  useEffect(()=>{
    if(!user) return;
    // FIX 1: pakai menu=icon/dtp BUKAN gid=0/1
    console.log('FETCH:', `${API_URL}?menu=${menu}`);
    fetch(`${API_URL}?menu=${menu}&t=${Date.now()}`)
    .then(r=>r.json())
    .then(j=>{
       console.log('DATA:', j);
       setRaw(j.data||[]);
     });
  },[user,menu]);

  const handleLogin=async(e)=>{
    e.preventDefault();
    const {data} = await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single();
    if(!data){ alert('Login gagal'); return; }
    localStorage.setItem('esdm_user',JSON.stringify(data));
    setUser(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('esdm_user');
    setUser(null);
    setRaw([]);
    setSearch('');
  };

  const filtered=useMemo(()=>{
    let arr=[...raw];
    // FIX 2: 3H+ = 3 hari berturut-turut muncul
    const freq={};
    raw.forEach(d=>{ const k=d["Node/Pos"]; freq[k]=(freq[k]||0)+1; });
    arr = arr.map(d=>({...d, is3HPlus: freq[d["Node/Pos"]] >= 3 }));

    if(search){ const s=search.toLowerCase(); arr=arr.filter(d=> JSON.stringify(d).toLowerCase().includes(s)); }
    if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus);
    return arr.sort((a,b)=>parseTgl(b.Tanggal)-parseTgl(a.Tanggal));
  },[raw,search,filter]);

  if(!user) return (
    <div style={{minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <form onSubmit={handleLogin} style={{background:'#111c2f',padding:24,borderRadius:16,display:'grid',gap:12,width:320}}>
        <h2 style={{color:'#fde047',fontWeight:900}}>ESDM LOGIN</h2>
        <input value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} placeholder="Username" style={{padding:12,borderRadius:10,background:'#0b1220',border:'1px solid #1e293b',color:'#fff'}}/>
        <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Password" style={{padding:12,borderRadius:10,background:'#0b1220',border:'1px solid #1e293b',color:'#fff'}}/>
        <button style={{padding:12,borderRadius:10,background:'#fde047',fontWeight:800}}>Login</button>
      </form>
    </div>
  );

  const count3H = raw.filter(r=>{
    const f={}; raw.forEach(x=>{f[x["Node/Pos"]]=(f[x["Node/Pos"]]||0)+1});
    return f[r["Node/Pos"]]>=3;
  }).length;

  return (
    <div style={{minHeight:'100vh',background:'#0b1220',color:'#fff',fontFamily:'Inter',display:'flex'}}>
      {/* SIDEBAR - FIX LOGOUT SELALU KELIATAN */}
      <div style={{width:260,background:'#070d1a',borderRight:'1px solid #1e293b',padding:16,display:'flex',flexDirection:'column',minHeight:'100vh'}}>
        <div style={{fontWeight:900,fontSize:18}}>ESDM MONITORING</div>
        <div style={{fontSize:11,color:'#fde047',marginBottom:16}}>{user.username} ({user.role})</div>

        <button onClick={()=>setMenu('icon')} style={{padding:12,borderRadius:8,background:menu==='icon'?'#fff':'#111c2f',color:menu==='icon'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:8,border:'1px solid #1e293b'}}>📡 Node Icon</button>
        <button onClick={()=>setMenu('dtp')} style={{padding:12,borderRadius:8,background:menu==='dtp'?'#fff':'#111c2f',color:menu==='dtp'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:8,border:'1px solid #1e293b'}}>📊 Node DTP</button>

        <div style={{flex:1}}></div>

        {/* LOGOUT - PASTI KELIATAN DI BAWAH */}
        <button onClick={handleLogout} style={{padding:12,borderRadius:8,background:'#7f1d1d',color:'#fff',fontWeight:800,border:'1px solid #ef4444',cursor:'pointer'}}>
          🚪 LOGOUT
        </button>
        <div style={{fontSize:10,color:'#475569',marginTop:8,textAlign:'center'}}>API: {menu} ({raw.length} data)</div>
      </div>

      <div style={{flex:1,overflow:'auto',background:'#0f1a2f'}}>
        <div style={{display:'flex',gap:8,padding:12,position:'sticky',top:0,background:'#0f1a2f',borderBottom:'1px solid #1e293b',zIndex:2}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari node..." style={{background:'#111c2f',border:'1px solid #1e293b',borderRadius:8,padding:'8px 12px',color:'#fff',width:280}}/>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            <button onClick={()=>setFilter('semua')} style={{padding:'6px 12px',borderRadius:20,fontSize:11,background:filter==='semua'?'#fff':'transparent',color:filter==='semua'?'#000':'#fff',border:'1px solid #334155'}}>Semua {raw.length}</button>
            <button onClick={()=>setFilter('3hari')} style={{padding:'6px 12px',borderRadius:20,fontSize:11,background:filter==='3hari'?'#ef4444':'transparent',color:filter==='3hari'?'#fff':'#fca5a5',border:'1px solid #7f1d1d'}}>3H+ {count3H}</button>
          </div>
        </div>

        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead style={{background:'#1a2744',position:'sticky',top:49,zIndex:1}}>
            <tr style={{color:'#94a3b8',fontSize:11,textTransform:'uppercase'}}>
              <th style={{padding:'12px 14px',textAlign:'left'}}>TANGGAL</th>
              <th style={{padding:'12px 14px',textAlign:'left'}}>NODE/POS</th>
              <th style={{padding:'12px 14px',textAlign:'left'}}>KENDALA / DURATION</th>
              <th style={{padding:'12px 14px',textAlign:'left'}}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row,i)=>(
              <tr key={i} style={{background:i%2===0?'#132042':'#0f1a2f',borderBottom:'1px solid #1e293b'}}>
                <td style={{padding:'12px 14px',color:'#facc15'}}>{row.Tanggal}</td>
                <td style={{padding:'12px 14px',fontWeight:700}}>{clean(row["Node/Pos"])}</td>
                <td style={{padding:'12px 14px',maxWidth:500}}>
                  <div>Duration : {row.Duration}</div>
                  <div style={{color:'#94a3b8',fontSize:11}}>RFO : {row.RFO}</div>
                </td>
                <td style={{padding:'12px 14px'}}>{row.is3HPlus? <span style={{background:'#ef4444',color:'#fff',padding:'5px 12px',borderRadius:999,fontSize:11,fontWeight:800}}>🔥 3H+ MERAH ({raw.filter(x=>x["Node/Pos"]===row["Node/Pos"]).length}x)</span> : <span style={{background:'#10b981',color:'#fff',padding:'5px 12px',borderRadius:999,fontSize:11}}>☑ Bagus</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}