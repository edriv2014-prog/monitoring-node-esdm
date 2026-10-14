import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

// PAKAI INTERNAL API GAMMA SENDIRI - JANGAN EXTERNAL LAGI
const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "").replace(/\/api\/?$/, "");
const API_URL = BACKEND ? `${BACKEND}/api/data` : `/api/data`;

const clean = (s) => String(s||'').replace(/^\s*[\d\.\-\)\:\s\u00A0]+/g,'').trim().split('\n')[0].trim();

const parseTgl = s => {
  const mm={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11};
  const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if(!m) return null;
  return new Date(+m[3], mm[m[2]]??0, +m[1]);
};

// LOGIC BENER: 3 HARI BERTURUT = 11,12,13 OKT HARUS ADA SEMUA
const check3HariBerturut = (allData) => {
  const map = {};
  allData.forEach(d=>{
    const t = parseTgl(d.Tanggal);
    if(!t) return;
    const day = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    const key = (d["Node/Pos"]||'').trim().toLowerCase();
    if(!map[key]) map[key]=new Set();
    map[key].add(day);
  });
  const merah = {};
  Object.keys(map).forEach(node=>{
    const days = Array.from(map[node]).sort((a,b)=>a-b);
    for(let i=0;i<=days.length-3;i++){
      const oneDay = 86400000;
      if(days[i+1]-days[i]===oneDay && days[i+2]-days[i+1]===oneDay){
        merah[node]=true;
        break;
      }
    }
  });
  return merah;
};

export default function App(){
  const [raw,setRaw]=useState([]);
  const [search,setSearch]=useState('');
  const [menu,setMenu]=useState('icon');
  const [filter,setFilter]=useState('semua');
  const [loading,setLoading]=useState(false);
  const [user,setUser]=useState(()=>{
    try{ return JSON.parse(localStorage.getItem('esdm_user')||'null'); }catch{ return null; }
  });
  const [loginForm,setLoginForm]=useState({username:'',password:''});

  useEffect(()=>{
    if(!user) return;
    setLoading(true);
    fetch(`${API_URL}?menu=${menu}&t=${Date.now()}`)
     .then(r=>r.json())
     .then(j=>{
       setRaw(j.data||[]);
       setLoading(false);
     })
     .catch(()=>{
       setRaw([]);
       setLoading(false);
     });
  },[user,menu]);

  const handleLogin=async(e)=>{
    e.preventDefault();
    const {data, error} = await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single();
    if(error || !data){ alert('Login gagal - cek username/password'); return; }
    localStorage.setItem('esdm_user',JSON.stringify(data));
    setUser(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('esdm_user');
    setUser(null);
    setRaw([]);
    setSearch('');
    setFilter('semua');
  };

  const nodesMerah = useMemo(()=> check3HariBerturut(raw), [raw]);

  const filtered = useMemo(()=>{
    let arr = [...raw].map(d=>({
     ...d,
      is3HPlus: !!nodesMerah[(d["Node/Pos"]||'').trim().toLowerCase()]
    }));
    if(search){
      const s=search.toLowerCase();
      arr=arr.filter(d=> JSON.stringify(d).toLowerCase().includes(s));
    }
    if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus);
    return arr.sort((a,b)=>(parseTgl(b.Tanggal)?.getTime()||0)-(parseTgl(a.Tanggal)?.getTime()||0));
  },[raw, search, filter, nodesMerah]);

  const count3H = useMemo(()=>{
    return raw.filter(r=> nodesMerah[(r["Node/Pos"]||'').trim().toLowerCase()]).length;
  },[raw, nodesMerah]);

  if(!user) return (
    <div style={{minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <form onSubmit={handleLogin} style={{background:'#111c2f',padding:32,borderRadius:16,display:'grid',gap:16,width:340, border:'1px solid #1e293b'}}>
        <h2 style={{color:'#fde047',fontWeight:900, textAlign:'center', margin:0}}>ESDM LOGIN</h2>
        <input value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} placeholder="Username (admin)" style={{padding:14,borderRadius:10,background:'#0b1220',border:'1px solid #1e293b',color:'#fff', outline:'none'}}/>
        <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Password" style={{padding:14,borderRadius:10,background:'#0b1220',border:'1px solid #1e293b',color:'#fff', outline:'none'}}/>
        <button style={{padding:14,borderRadius:10,background:'#fde047',fontWeight:900, border:'none', cursor:'pointer', color:'#000'}}>Login</button>
      </form>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0b1220',color:'#fff',display:'flex', fontFamily:'Inter, system-ui, sans-serif'}}>
      <div style={{width:260,background:'#070d1a',borderRight:'1px solid #1e293b',padding:16,display:'flex',flexDirection:'column', minHeight:'100vh', position:'sticky', top:0}}>
        <div style={{fontWeight:900,fontSize:18, letterSpacing:'-0.5px'}}>ESDM MONITORING</div>
        <div style={{fontSize:12,color:'#fde047', marginTop:4}}>{user.username} ({user.role})</div>
        
        <button onClick={handleLogout} style={{marginTop:16,marginBottom:16,padding:14,borderRadius:10,background:'#ef4444',color:'#fff',fontWeight:900,border:'none',cursor:'pointer', fontSize:14}}>🚪 LOGOUT</button>
        
        <button onClick={()=>{setMenu('icon'); setFilter('semua');}} style={{padding:14,borderRadius:10,background:menu==='icon'?'#fff':'#111c2f',color:menu==='icon'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:10, border: menu==='icon'?'1px solid #fff':'1px solid #1e293b', cursor:'pointer'}}>📡 Node Icon</button>
        <button onClick={()=>{setMenu('dtp'); setFilter('semua');}} style={{padding:14,borderRadius:10,background:menu==='dtp'?'#fff':'#111c2f',color:menu==='dtp'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:10, border: menu==='dtp'?'1px solid #fff':'1px solid #1e293b', cursor:'pointer'}}>📊 Node DTP</button>
        
        <div style={{marginTop:'auto',fontSize:10,color:'#475569', lineHeight:'1.5'}}>
          MENU: {menu.toUpperCase()}<br/>
          TOTAL: {raw.length} data<br/>
          3H+: {count3H} data<br/>
          API: /api/data?menu={menu}
        </div>
      </div>

      <div style={{flex:1,overflow:'auto',background:'#0f1a2f'}}>
        <div style={{display:'flex',gap:12,padding:12,position:'sticky',top:0,background:'#0f1a2f',borderBottom:'1px solid #1e293b', zIndex:10, alignItems:'center'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari Node/Pos, RFO, Duration..." style={{background:'#111c2f',border:'1px solid #1e293b',borderRadius:10,padding:'10px 14px',color:'#fff',width:320, outline:'none'}}/>
          {loading && <span style={{fontSize:12, color:'#fde047'}}>Loading {menu}...</span>}
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <button onClick={()=>setFilter('semua')} style={{padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:700,background:filter==='semua'?'#fff':'transparent',color:filter==='semua'?'#000':'#fff',border:'1px solid #334155', cursor:'pointer'}}>Semua {raw.length}</button>
            <button onClick={()=>setFilter('3hari')} style={{padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:700,background:filter==='3hari'?'#ef4444':'transparent',color:filter==='3hari'?'#fff':'#fca5a5',border:'1px solid #7f1d1d', cursor:'pointer'}}>🔥 3H+ {count3H}</button>
          </div>
        </div>

        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead style={{background:'#1a2744',position:'sticky',top:57, zIndex:5}}><tr style={{color:'#94a3b8',fontSize:11, textAlign:'left'}}><th style={{padding:14}}>TANGGAL</th><th style={{padding:14}}>NODE/POS</th><th style={{padding:14}}>KENDALA</th><th style={{padding:14, textAlign:'center'}}>STATUS</th></tr></thead>
          <tbody>
            {filtered.length===0 && !loading && (
              <tr><td colSpan={4} style={{padding:40, textAlign:'center', color:'#64748b'}}>Tidak ada data untuk menu {menu.toUpperCase()} - cek API /api/data?menu={menu}</td></tr>
            )}
            {filtered.map((row,i)=>(
              <tr key={i} style={{background:i%2===0?'#132042':'#0f1a2f',borderBottom:'1px solid #1e293b'}}>
                <td style={{padding:14,color:'#facc15', fontWeight:600, whiteSpace:'nowrap'}}>{row.Tanggal}</td>
                <td style={{padding:14,fontWeight:700}}>{clean(row["Node/Pos"])}</td>
                <td style={{padding:14}}><div style={{fontWeight:600}}>Duration : {row.Duration}</div><div style={{color:'#94a3b8',fontSize:11, marginTop:4, lineHeight:'1.4'}}>RFO : {row.RFO}</div></td>
                <td style={{padding:14, textAlign:'center'}}>{row.is3HPlus? <span style={{background:'#ef4444',color:'#fff',padding:'6px 12px',borderRadius:999,fontSize:11, fontWeight:800, display:'inline-block'}}>🔥 3H+ MERAH</span> : <span style={{background:'#10b981',color:'#fff',padding:'6px 12px',borderRadius:999,fontSize:11, fontWeight:700, display:'inline-block'}}>☑ Bagus</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
