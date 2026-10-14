import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "").replace(/\/api\/?$/, "");
const API_URL = BACKEND ? `${BACKEND}/api/data` : `/api/data`;

const clean = (s) => String(s||'').replace(/^\s*[\d\.\-\)\:\s\u00A0]+/g,'').trim().split('\n')[0].trim();

const parseTgl = s => {
  const mm={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11};
  const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if(!m) return null;
  return new Date(+m[3], mm[m[2]]??0, +m[1]);
};

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
        merah[node]=true; break;
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
     .then(j=>{ setRaw(j.data||[]); setLoading(false); })
     .catch(()=>{ setRaw([]); setLoading(false); });
  },[user,menu]);

  const handleLogin=async(e)=>{
    e.preventDefault();
    const {data, error} = await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single();
    if(error || !data){ alert('Login gagal'); return; }
    localStorage.setItem('esdm_user',JSON.stringify(data));
    setUser(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('esdm_user');
    setUser(null); setRaw([]); setSearch(''); setFilter('semua');
  };

  const nodesMerah = useMemo(()=> check3HariBerturut(raw), [raw]);

  const searchFiltered = useMemo(()=>{
    if(!search.trim()) return raw;
    const s = search.toLowerCase().trim();
    return raw.filter(d => (d["Node/Pos"]||'').toLowerCase().includes(s));
  },[raw, search]);

  const countAllSearch = searchFiltered.length;
  const count3HSearch = useMemo(()=>{
    return searchFiltered.filter(r=> nodesMerah[(r["Node/Pos"]||'').trim().toLowerCase()]).length;
  },[searchFiltered, nodesMerah]);

  const filtered = useMemo(()=>{
    let arr = [...searchFiltered].map(d=>({...d, is3HPlus: !!nodesMerah[(d["Node/Pos"]||'').trim().toLowerCase()]}));
    if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus);
    return arr.sort((a,b)=>(parseTgl(b.Tanggal)?.getTime()||0)-(parseTgl(a.Tanggal)?.getTime()||0));
  },[searchFiltered, filter, nodesMerah]);

  // EXPORT EXCEL (CSV yang bisa dibuka Excel)
  const exportExcel = () => {
    if(filtered.length===0){ alert('Tidak ada data untuk diexport!'); return; }
    const header = ["Tanggal","Node/Pos","Duration","RFO","Status 3H+"];
    const rows = filtered.map(r=>[
      r.Tanggal,
      clean(r["Node/Pos"]),
      r.Duration,
      r.RFO,
      r.is3HPlus ? "MERAH 3H+" : "Bagus"
    ]);
    const csv = [header, ...rows].map(row=> row.map(v=> `"${String(v||'').replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const fileName = `ESDM_${menu.toUpperCase()}_${search||'semua'}_${new Date().toISOString().slice(0,10)}.csv`;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // EXPORT PDF (pakai print window)
  const exportPDF = () => {
    if(filtered.length===0){ alert('Tidak ada data untuk diexport!'); return; }
    const win = window.open('', '_blank');
    const tableRows = filtered.map((r,i)=>`
      <tr style="border-bottom:1px solid #ddd; background:${i%2===0?'#f8fafc':'#fff'}">
        <td style="padding:8px; font-size:12px;">${r.Tanggal}</td>
        <td style="padding:8px; font-size:12px; font-weight:700;">${clean(r["Node/Pos"])}</td>
        <td style="padding:8px; font-size:12px;">Duration: ${r.Duration}<br/><span style="color:#64748b; font-size:10px;">RFO: ${r.RFO}</span></td>
        <td style="padding:8px; font-size:11px; text-align:center;">${r.is3HPlus ? '<span style="background:#ef4444;color:#fff;padding:4px 8px;border-radius:12px;">MERAH 3H+</span>' : '<span style="background:#10b981;color:#fff;padding:4px 8px;border-radius:12px;">Bagus</span>'}</td>
      </tr>
    `).join('');
    
    win.document.write(`
      <html>
        <head>
          <title>ESDM Monitoring - ${menu.toUpperCase()} - ${search||'Semua'}</title>
          <style>
            body{font-family:Inter, Arial, sans-serif; padding:20px; color:#0f172a;}
            h1{font-size:18px; margin:0;}
            p{font-size:12px; color:#64748b;}
            table{width:100%; border-collapse:collapse; margin-top:16px;}
            th{background:#1e293b; color:#fff; padding:10px; font-size:11px; text-align:left;}
          </style>
        </head>
        <body>
          <h1>ESDM MONITORING - ${menu.toUpperCase()}</h1>
          <p>Filter: ${search ? `Pencarian "${search}"` : 'Semua'} | Status: ${filter==='3hari' ? 'Hanya 3H+ Merah' : 'Semua'} | Total: ${filtered.length} data | Tanggal Export: ${new Date().toLocaleString('id-ID')}</p>
          <table>
            <thead><tr><th>TANGGAL</th><th>NODE/POS</th><th>KENDALA</th><th>STATUS</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <p style="margin-top:20px; font-size:10px; text-align:center;">Generated by ESDM Monitoring System - ${new Date().toLocaleString('id-ID')}</p>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  if(!user) return (
    <div style={{minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <form onSubmit={handleLogin} style={{background:'#111c2f',padding:32,borderRadius:16,display:'grid',gap:16,width:340, border:'1px solid #1e293b'}}>
        <h2 style={{color:'#fde047',fontWeight:900, textAlign:'center', margin:0}}>ESDM LOGIN</h2>
        <input value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} placeholder="Username" style={{padding:14,borderRadius:10,background:'#0b1220',border:'1px solid #1e293b',color:'#fff'}}/>
        <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Password" style={{padding:14,borderRadius:10,background:'#0b1220',border:'1px solid #1e293b',color:'#fff'}}/>
        <button style={{padding:14,borderRadius:10,background:'#fde047',fontWeight:900, border:'none', cursor:'pointer'}}>Login</button>
      </form>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0b1220',color:'#fff',display:'flex'}}>
      <div style={{width:260,background:'#070d1a',borderRight:'1px solid #1e293b',padding:16,display:'flex',flexDirection:'column', minHeight:'100vh'}}>
        <div style={{fontWeight:900,fontSize:18}}>ESDM MONITORING</div>
        <div style={{fontSize:12,color:'#fde047', marginTop:4}}>{user.username} ({user.role})</div>
        <button onClick={handleLogout} style={{marginTop:16,marginBottom:16,padding:14,borderRadius:10,background:'#ef4444',color:'#fff',fontWeight:900,border:'none',cursor:'pointer'}}>🚪 LOGOUT</button>
        <button onClick={()=>{setMenu('icon'); setFilter('semua');}} style={{padding:14,borderRadius:10,background:menu==='icon'?'#fff':'#111c2f',color:menu==='icon'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:10, border:'1px solid #1e293b', cursor:'pointer'}}>📡 Node Icon</button>
        <button onClick={()=>{setMenu('dtp'); setFilter('semua');}} style={{padding:14,borderRadius:10,background:menu==='dtp'?'#fff':'#111c2f',color:menu==='dtp'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:10, border:'1px solid #1e293b', cursor:'pointer'}}>📊 Node DTP</button>
        
        <div style={{marginTop:16, display:'grid', gap:8}}>
          <button onClick={exportExcel} style={{padding:12,borderRadius:10,background:'#10b981',color:'#fff',fontWeight:800,border:'none',cursor:'pointer', fontSize:13}}>📥 Export Excel (CSV)</button>
          <button onClick={exportPDF} style={{padding:12,borderRadius:10,background:'#3b82f6',color:'#fff',fontWeight:800,border:'none',cursor:'pointer', fontSize:13}}>📄 Export PDF</button>
        </div>

        <div style={{marginTop:'auto',fontSize:10,color:'#475569', lineHeight:'1.6'}}>MENU: {menu.toUpperCase()}<br/>TOTAL RAW: {raw.length}<br/>SEARCH: {countAllSearch}<br/>3H+ SEARCH: {count3HSearch}<br/>TAMPIL: {filtered.length}<br/>API: {API_URL}</div>
      </div>

      <div style={{flex:1,overflow:'auto',background:'#0f1a2f'}}>
        <div style={{display:'flex',gap:12,padding:12,position:'sticky',top:0,background:'#0f1a2f',borderBottom:'1px solid #1e293b', zIndex:10, alignItems:'center', flexWrap:'wrap'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari Node/Pos..." style={{background:'#111c2f',border:'1px solid #1e293b',borderRadius:10,padding:'10px 14px',color:'#fff',width:260}}/>
          {loading && <span style={{fontSize:12, color:'#fde047'}}>Loading {menu}...</span>}
          <div style={{display:'flex',gap:8, alignItems:'center'}}>
            <button onClick={exportExcel} style={{padding:'8px 14px',borderRadius:20,fontSize:12,fontWeight:700,background:'#10b981',color:'#fff',border:'none', cursor:'pointer'}}>📥 Excel</button>
            <button onClick={exportPDF} style={{padding:'8px 14px',borderRadius:20,fontSize:12,fontWeight:700,background:'#3b82f6',color:'#fff',border:'none', cursor:'pointer'}}>📄 PDF</button>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:8}}>
            <button onClick={()=>setFilter('semua')} style={{padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:700,background:filter==='semua'?'#fff':'transparent',color:filter==='semua'?'#000':'#fff',border:'1px solid #334155', cursor:'pointer'}}>Semua {countAllSearch}</button>
            <button onClick={()=>setFilter('3hari')} style={{padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:700,background:filter==='3hari'?'#ef4444':'transparent',color:filter==='3hari'?'#fff':'#fca5a5',border:'1px solid #7f1d1d', cursor:'pointer'}}>🔥 3H+ {count3HSearch}</button>
          </div>
        </div>

        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead style={{background:'#1a2744',position:'sticky',top:57}}><tr style={{color:'#94a3b8',fontSize:11}}><th style={{padding:14}}>TANGGAL</th><th style={{padding:14}}>NODE/POS</th><th style={{padding:14}}>KENDALA</th><th style={{padding:14, textAlign:'center'}}>STATUS</th></tr></thead>
          <tbody>
            {filtered.map((row,i)=>(
              <tr key={i} style={{background:i%2===0?'#132042':'#0f1a2f',borderBottom:'1px solid #1e293b'}}>
                <td style={{padding:14,color:'#facc15', fontWeight:600}}>{row.Tanggal}</td>
                <td style={{padding:14,fontWeight:700}}>{clean(row["Node/Pos"])}</td>
                <td style={{padding:14}}><div style={{fontWeight:600}}>Duration : {row.Duration}</div><div style={{color:'#94a3b8',fontSize:11, marginTop:4}}>RFO : {row.RFO}</div></td>
                <td style={{padding:14, textAlign:'center'}}>{row.is3HPlus? <span style={{background:'#ef4444',color:'#fff',padding:'6px 12px',borderRadius:999,fontSize:11, fontWeight:800}}>🔥 3H+ MERAH</span> : <span style={{background:'#10b981',color:'#fff',padding:'6px 12px',borderRadius:999,fontSize:11, fontWeight:700}}>☑ Bagus</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
