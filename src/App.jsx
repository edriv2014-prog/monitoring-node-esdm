import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app").replace(/\/api\/?$/,'');
const API_URL = `${BACKEND}/api/data`;

const clean = (s) => String(s||'').replace(/^\s*[\d\.\-\)\:\s\u00A0]+/g,'').trim().split('\n')[0].trim();
const getDuration = (row) => {
  let t = row.Duration || row._raw || row.Kendala || '';
  let m = t.match(/Duration\s*:\s*([^\n]+)/i); if(m) return m[1].trim();
  return row.Duration || '-';
};
const getRFO = (row) => {
  let t = row.RFO || row._raw || row.Kendala || '';
  let m = t.match(/RFO\s*:\s*([^\n]+)/i); if(m) return m[1].trim();
  return row.RFO || '-';
};
const parseTgl=s=>{const mm={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11}; const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); return m? new Date(+m[3],mm[m[2]]??0,+m[1]):new Date(0);};

export default function App(){
  const [raw,setRaw]=useState([]); const [search,setSearch]=useState(''); const [menu,setMenu]=useState('icon'); const [filter,setFilter]=useState('semua');
  const [user,setUser]=useState(()=>{ try{ return JSON.parse(localStorage.getItem('esdm_user')||'null'); }catch{ return null; }});
  const [loginForm,setLoginForm]=useState({username:'',password:''});
  const [detail,setDetail]=useState(null);

  useEffect(()=>{
    if(!user) return;
    // FIX UTAMA: pakai?menu=icon/dtp bukan?gid=0/1
    fetch(`${API_URL}?menu=${menu}&t=${Date.now()}`)
     .then(r=>r.json())
     .then(j=>setRaw(j.data||[]));
  },[user,menu]);

  const handleLogin=async(e)=>{
    e.preventDefault();
    const {data} = await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single();
    if(!data){ alert('Login gagal'); return; }
    localStorage.setItem('esdm_user',JSON.stringify(data));
    setUser(data);
  };

  const filtered=useMemo(()=>{
    let arr=[...raw];
    // 3H+ = 3 hari berturut-turut muncul node yang sama
    const freq={};
    raw.forEach(d=>{ freq[d["Node/Pos"]] = (freq[d["Node/Pos"]]||0)+1; });
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

  return (
    <div style={{minHeight:'100vh',background:'#0b1220',color:'#fff',fontFamily:'Inter',display:'flex'}}>
      <div style={{width:250,background:'#070d1a',borderRight:'1px solid #1e293b',padding:16,display:'flex',flexDirection:'column',gap:8}}>
        <div style={{fontWeight:900}}>ESDM MONITORING</div>
        <div style={{fontSize:11,color:'#fde047'}}>{user.username} ({user.role})</div>
        <button onClick={()=>setMenu('icon')} style={{padding:10,borderRadius:8,background:menu==='icon'?'#fff':'#111c2f',color:menu==='icon'?'#000':'#fff',fontWeight:700,textAlign:'left'}}>📡 Node Icon</button>
        <button onClick={()=>setMenu('dtp')} style={{padding:10,borderRadius:8,background:menu==='dtp'?'#fff':'#111c2f',color:menu==='dtp'?'#000':'#fff',fontWeight:700,textAlign:'left'}}>📊 Node DTP</button>
        <button onClick={()=>{localStorage.removeItem('esdm_user'); setUser(null);}} style={{marginTop:'auto',padding:10,borderRadius:8,background:'rgba(239,68,68,0.15)',color:'#fca5a5',border:'1px solid rgba(239,68,68,0.3)'}}>Logout</button>
      </div>
      <div style={{flex:1,overflow:'auto',background:'#0f1a2f'}}>
        <div style={{display:'flex',gap:8,padding:12,position:'sticky',top:0,background:'#0f1a2f',borderBottom:'1px solid #1e293b',zIndex:2}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari..." style={{background:'#111c2f',border:'1px solid #1e293b',borderRadius:8,padding:'8px 12px',color:'#fff',width:280}}/>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            <button onClick={()=>setFilter('semua')} style={{padding:'6px 12px',borderRadius:20,fontSize:11,background:filter==='semua'?'#fff':'transparent',color:filter==='semua'?'#000':'#fff',border:'1px solid #334155'}}>Semua {raw.length}</button>
            <button onClick={()=>setFilter('3hari')} style={{padding:'6px 12px',borderRadius:20,fontSize:11,background:filter==='3hari'?'#ef4444':'transparent',color:filter==='3hari'?'#fff':'#fca5a5',border:'1px solid #7f1d1d'}}>3H+ {raw.filter(r=>{ const f={}; raw.forEach(x=>{f[x["Node/Pos"]]=(f[x["Node/Pos"]]||0)+1}); return f[r["Node/Pos"]]>=3; }).length}</button>
          </div>
        </div>

        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead style={{background:'#1a2744',position:'sticky',top:49,zIndex:1}}>
            <tr style={{color:'#94a3b8',fontSize:11,textTransform:'uppercase'}}>
              <th style={{padding:'12px 14px',textAlign:'left',borderBottom:'1px solid #1e293b'}}>TANGGAL</th>
              <th style={{padding:'12px 14px',textAlign:'left',borderBottom:'1px solid #1e293b'}}>NODE/POS</th>
              <th style={{padding:'12px 14px',textAlign:'left',borderBottom:'1px solid #1e293b'}}>KENDALA / DURATION</th>
              <th style={{padding:'12px 14px',textAlign:'left',borderBottom:'1px solid #1e293b'}}>LINK</th>
              <th style={{padding:'12px 14px',textAlign:'left',borderBottom:'1px solid #1e293b'}}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row,i)=>{
              const dur = row.Duration || getDuration(row);
              const rfo = row.RFO || getRFO(row);
              return (
              <tr key={i} style={{background:i%2===0?'#132042':'#0f1a2f',borderBottom:'1px solid #1e293b'}}>
                <td style={{padding:'12px 14px',color:'#facc15',whiteSpace:'nowrap'}}>{row.Tanggal}</td>
                <td style={{padding:'12px 14px',fontWeight:700}}>{clean(row["Node/Pos"])}</td>
                <td style={{padding:'12px 14px',maxWidth:520}}>
                  <div style={{display:'flex',flexDirection:'column',gap:2}}>
                    <span style={{color:'#e2e8f0'}}>Duration : {dur}</span>
                    <span style={{color:'#94a3b8',fontSize:12,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}} title={rfo}>RFO : {rfo}</span>
                  </div>
                </td>
                <td style={{padding:'12px 14px'}}><span style={{background:'#1e293b',padding:'4px 10px',borderRadius:999,fontSize:11}}>Normal</span></td>
                <td style={{padding:'12px 14px'}}>{row.is3HPlus? <span style={{background:'#ef4444',color:'#fff',padding:'5px 12px',borderRadius:999,fontSize:11,fontWeight:800}}>🔥 3H+ MERAH</span> : <span style={{background:'#10b981',color:'#fff',padding:'5px 12px',borderRadius:999,fontSize:11,fontWeight:800,cursor:'pointer'}} onClick={()=>setDetail(row)}>☑ Bagus</span>}</td>
              </tr>
              )
            })}
          </tbody>
        </table>

        {detail && (
          <div onClick={()=>setDetail(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{background:'#111c2f',border:'1px solid #1e293b',borderRadius:16,padding:20,maxWidth:600,width:'100%'}}>
              <h3 style={{fontWeight:800,marginBottom:8}}>{detail["Node/Pos"]}</h3>
              <div style={{fontSize:12,color:'#facc15'}}>{detail.Tanggal}</div>
              <div style={{marginTop:12,background:'#0b1220',padding:12,borderRadius:10,fontSize:13,whiteSpace:'pre-wrap'}}>{detail._raw}</div>
              <button onClick={()=>setDetail(null)} style={{marginTop:12,background:'#fff',color:'#000',padding:'8px 16px',borderRadius:8,fontWeight:700}}>Tutup</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}