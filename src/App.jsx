import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app").replace(/\/api\/?$/,'');
const API_URL = `${BACKEND}/api/data`;

const clean = (s) => String(s||'').replace(/^\s*[\d\.\-\)\:\s\u00A0]+/g,'').trim().split('\n')[0].trim();

const parseTgl = s => {
  const mm={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11};
  const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if(!m) return null;
  return new Date(+m[3], mm[m[2]]??0, +m[1]);
};

// 3 HARI BERTURUT = 11,12,13 Okt semua ADA kendala node yang SAMA
const check3HariBerturut = (allData) => {
  const map = {};
  allData.forEach(d=>{
    const t = parseTgl(d.Tanggal);
    if(!t) return;
    const day = new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
    const key = d["Node/Pos"].trim().toLowerCase(); // biar Pos PGA Lamongan = pos pga lamongan
    if(!map[key]) map[key]=new Set();
    map[key].add(day);
  });

  const merah = {};
  Object.keys(map).forEach(node=>{
    const days = Array.from(map[node]).sort((a,b)=>a-b);
    for(let i=0;i<=days.length-3;i++){
      const oneDay = 86400000;
      // harus selisih tepat 1 hari
      if(days[i+1]-days[i]===oneDay && days[i+2]-days[i+1]===oneDay){
        merah[node]=true;
        break;
      }
    }
  });
  return merah; // isinya { "pos pga lamongan": true }
};

// di dalam component
const nodesMerah = useMemo(()=> check3HariBerturut(raw), [raw]);


export default function App(){
  const [raw,setRaw]=useState([]); const [search,setSearch]=useState(''); const [menu,setMenu]=useState('icon'); const [filter,setFilter]=useState('semua');
  const [user,setUser]=useState(()=>{ try{ return JSON.parse(localStorage.getItem('esdm_user')||'null'); }catch{ return null; }});
  const [loginForm,setLoginForm]=useState({username:'',password:''});

  useEffect(()=>{
    if(!user) return;
    fetch(`${API_URL}?menu=${menu}&t=${Date.now()}`).then(r=>r.json()).then(j=>setRaw(j.data||[]));
  },[user,menu]);

  const handleLogin=async(e)=>{
    e.preventDefault();
    const {data}=await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single();
    if(!data){ alert('Login gagal'); return; }
    localStorage.setItem('esdm_user',JSON.stringify(data)); setUser(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('esdm_user');
    setUser(null);
    setRaw([]);
  };

 
  
  
  
  
  
  
  

const filtered = useMemo(()=>{
  let arr = [...raw].map(d=>({
   ...d,
    is3HPlus:!!nodesMerah[d["Node/Pos"].trim().toLowerCase()]
  }));
  if(filter==='3hari') arr = arr.filter(o=>o.is3HPlus);
  return arr.sort((a,b)=>(parseTgl(b.Tanggal)?.getTime()||0)-(parseTgl(a.Tanggal)?.getTime()||0));
},[raw, filter, nodesMerah]);
// Untuk hitung badge 3H+ di atas
const count3H = useMemo(()=>{
  const nodes = check3HariBerturut(raw);
  return raw.filter(r=>nodes[r["Node/Pos"]]).length;
},[raw]);

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

  
  return (
    <div style={{minHeight:'100vh',background:'#0b1220',color:'#fff',display:'flex'}}>
      {/* SIDEBAR */}
      <div style={{width:260,background:'#070d1a',borderRight:'1px solid #1e293b',padding:16,display:'flex',flexDirection:'column',minHeight:'100vh'}}>
        <div style={{fontWeight:900,fontSize:18}}>ESDM MONITORING</div>
        <div style={{fontSize:11,color:'#fde047'}}>{user.username} ({user.role})</div>

        {/* LOGOUT DI ATAS - PASTI KELIATAN */}
        <button onClick={handleLogout} style={{marginTop:12,marginBottom:16,padding:12,borderRadius:8,background:'#ef4444',color:'#fff',fontWeight:900,cursor:'pointer',border:'none'}}>
          🚪 LOGOUT - KELUAR
        </button>

        <button onClick={()=>setMenu('icon')} style={{padding:12,borderRadius:8,background:menu==='icon'?'#fff':'#111c2f',color:menu==='icon'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:8}}>📡 Node Icon</button>
        <button onClick={()=>setMenu('dtp')} style={{padding:12,borderRadius:8,background:menu==='dtp'?'#fff':'#111c2f',color:menu==='dtp'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:8}}>📊 Node DTP</button>

        <div style={{marginTop:'auto',fontSize:10,color:'#475569',paddingTop:20}}>
          API: {menu} - {raw.length} data<br/>
          {menu==='icon'?'Pusdatin':'Tekmira'} Mode
        </div>
      </div>

      <div style={{flex:1,overflow:'auto',background:'#0f1a2f'}}>
        <div style={{display:'flex',gap:8,padding:12,position:'sticky',top:0,background:'#0f1a2f',borderBottom:'1px solid #1e293b'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari..." style={{background:'#111c2f',border:'1px solid #1e293b',borderRadius:8,padding:'8px 12px',color:'#fff',width:280}}/>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            <button onClick={()=>setFilter('semua')} style={{padding:'6px 12px',borderRadius:20,fontSize:11,background:filter==='semua'?'#fff':'transparent',color:filter==='semua'?'#000':'#fff',border:'1px solid #334155'}}>Semua {raw.length}</button>
            <button onClick={()=>setFilter('3hari')} style={{padding:'6px 12px',borderRadius:20,fontSize:11,background:filter==='3hari'?'#ef4444':'#fff',color:filter==='3hari'?'#fff':'#000',border:'1px solid #7f1d1d'}}>3H+ {count3H}</button>
          </div>
        </div>

        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead style={{background:'#1a2744',position:'sticky',top:49}}><tr style={{color:'#94a3b8',fontSize:11}}><th style={{padding:12,textAlign:'left'}}>TANGGAL</th><th style={{padding:12,textAlign:'left'}}>NODE/POS</th><th style={{padding:12,textAlign:'left'}}>KENDALA</th><th style={{padding:12}}>STATUS</th></tr></thead>
          <tbody>
            {filtered.map((row,i)=>(
              <tr key={i} style={{background:i%2===0?'#132042':'#0f1a2f',borderBottom:'1px solid #1e293b'}}>
                <td style={{padding:12,color:'#facc15'}}>{row.Tanggal}</td>
                <td style={{padding:12,fontWeight:700}}>{clean(row["Node/Pos"])}</td>
                <td style={{padding:12}}><div>Duration : {row.Duration}</div><div style={{color:'#94a3b8',fontSize:11}}>RFO : {row.RFO}</div></td>
                <td style={{padding:12}}>{row.is3HPlus? <span style={{background:'#ef4444',color:'#fff',padding:'5px 12px',borderRadius:999,fontSize:11}}>🔥 3H+</span> : <span style={{background:'#10b981',color:'#fff',padding:'5px 12px',borderRadius:999,fontSize:11}}>☑ Bagus</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}