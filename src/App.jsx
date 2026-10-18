import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
const API_URL = `${BACKEND}/api/data`;
const SEND_EMAIL_URL = `${BACKEND}/api/send-email`;


//const BACKEND = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "").replace(/\/api\/?$/, "");
//const API_URL = BACKEND ? `${BACKEND}/api/data` : `/api/data`;


const clean = (s) => String(s||'').replace(/^\s*[\d\.\-\)\:\s\u00A0]+/g,'').trim().split('\n')[0].trim();

const parseTgl = s => {
  const mm={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11};
  const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if(!m) return null;
  return new Date(+m[3], mm[m[2]]??0, +m[1]);
};

// === FIX BUG PATGTL BKAT - CUMA CEK 3 HARI TERAKHIR ===
const check3HariBerturut = (allData) => {
  const map = {};
  allData.forEach(d=>{
    const t = parseTgl(d.Tanggal);
    if(!t) return;
    const day = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
    const key = (d["Node/Pos"]||'').trim().toLowerCase().replace(/\s+/g,' ');
    if(!key) return;
    if(!map[key]) map[key]=new Set();
    map[key].add(day);
  });
  const merah = {};
  const oneDay = 86400000;
  Object.entries(map).forEach(([node, setDays])=>{
    const days = Array.from(setDays).sort((a,b)=>b-a); // terbaru dulu
    if(days.length < 3) return;
    const d0 = days[0], d1 = days[1], d2 = days[2];
    if(d0 - d1 === oneDay && d1 - d2 === oneDay){
      merah[node]=true;
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
  const [usersList,setUsersList]=useState([]);
  const [userForm,setUserForm]=useState({ username:'', email:'', password:'', role:'operator', nama_lengkap:'' });
  const [editUserId,setEditUserId]=useState(null);

  useEffect(()=>{
    if(!user) return;
    if(menu==='pengguna'){ fetchUsers(); return; }
    setLoading(true);
    fetch(`${API_URL}?menu=${menu}&t=${Date.now()}`)
     .then(r=>r.json())
     .then(j=>{ setRaw(j.data||[]); setLoading(false); })
     .catch(()=>{ setRaw([]); setLoading(false); });
  },[user,menu]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('*').order('created_at',{ascending:false});
    setUsersList(data||[]);
    setLoading(false);
  };

  const sendEmailNotif = async (to, subject, html) => {
    if(!to || !to.includes('@')) return;
    try {
      const url =  `${SEND_EMAIL_URL}/api/send-email`;
      await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ to, subject, html }) });
    } catch(e){ console.log('Email skip:', e.message); }
  };

  const handleLogin=async(e)=>{
    e.preventDefault();
    const loginInput = loginForm.username.trim();
    const {data, error} = await supabase.from('users').select('*').or(`username.eq.${loginInput},email.eq.${loginInput}`).eq('password', loginForm.password).single();
    if(error || !data){ alert('Login gagal - cek username/emaDil & password'); return; }
    localStorage.setItem('esdm_user',JSON.stringify(data));
    setUser(data);
  };

  const handleLogout = () => {
    localStorage.removeItem('esdm_user');
    setUser(null); setRaw([]); setSearch(''); setFilter('semua');
  };

  const handleUserSubmit = async (e)=>{
    e.preventDefault();
    if(!userForm.email){ alert('Email wajib!'); return; }
    if(editUserId){
      const oldUser = usersList.find(u=>u.id===editUserId);
      const isGantiPassword = oldUser.password !== userForm.password;
      const { error } = await supabase.from('users').update(userForm).eq('id', editUserId);
      if(error) alert(error.message);
      else {
        if(isGantiPassword){
          await sendEmailNotif(userForm.email, 'Password ESDM Diubah', `<div style="font-family:Arial;padding:20px"><h3>Halo ${userForm.nama_lengkap}</h3><p>Password diubah.</p><p><b>Username:</b> ${userForm.username}<br/><b>Password Baru:</b> ${userForm.password}</p></div>`);
        }
        setEditUserId(null); setUserForm({ username:'', email:'', password:'', role:'operator', nama_lengkap:'' }); fetchUsers();
      }
    } else {
      const { data, error } = await supabase.from('users').insert([userForm]).select().single();
      if(error) alert(error.message);
      else {
        await sendEmailNotif(data.email, 'Akun ESDM Monitoring Baru', `<div style="font-family:Arial;padding:20px"><h2>Selamat Datang ${data.nama_lengkap}</h2><p><b>Username:</b> ${data.username}<br/><b>Email:</b> ${data.email}<br/><b>Password:</b> ${data.password}<br/><b>Role:</b> ${data.role}</p><p>Login pakai username ATAU email di: https://monitoring-node-esdm.vercel.app</p></div>`);
        setUserForm({ username:'', email:'', password:'', role:'operator', nama_lengkap:'' }); fetchUsers();
      }
    }
  };

  const handleEditUser = (u)=>{
    setUserForm({ username: u.username, email: u.email||'', password: u.password, role: u.role, nama_lengkap: u.nama_lengkap||'' });
    setEditUserId(u.id);
  };
  const handleDeleteUser = async (id)=>{
    if(!confirm('Hapus pengguna ini?')) return;
    await supabase.from('users').delete().eq('id', id);
    fetchUsers();
  };

  const nodesMerah = useMemo(()=> check3HariBerturut(raw), [raw]);
  const searchFiltered = useMemo(()=>{
    if(!search.trim()) return raw;
    const s = search.toLowerCase().trim();
    return raw.filter(d => (d["Node/Pos"]||'').toLowerCase().includes(s));
  },[raw, search]);
  const countAllSearch = searchFiltered.length;
  const count3HSearch = useMemo(()=> searchFiltered.filter(r=> nodesMerah[(r["Node/Pos"]||'').trim().toLowerCase().replace(/\s+/g,' ')]).length, [searchFiltered, nodesMerah]);
  const filtered = useMemo(()=>{
    let arr = [...searchFiltered].map(d=>({...d, is3HPlus: !!nodesMerah[(d["Node/Pos"]||'').trim().toLowerCase().replace(/\s+/g,' ')]}));
    if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus);
    return arr.sort((a,b)=>(parseTgl(b.Tanggal)?.getTime()||0)-(parseTgl(a.Tanggal)?.getTime()||0));
  },[searchFiltered, filter, nodesMerah]);

  const exportExcel = () => {
    if(filtered.length===0){ alert('Tidak ada data untuk diexport!'); return; }
    const header = ["Tanggal","Node/Pos","Duration","RFO","Status 3H+"];
    const rows = filtered.map(r=>[ r.Tanggal, clean(r["Node/Pos"]), r.Duration, r.RFO, r.is3HPlus ? "MERAH 3H+" : "Bagus" ]);
    const csv = [header, ...rows].map(row=> row.map(v=> `"${String(v||'').replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url;
    link.download = `ESDM_${menu.toUpperCase()}_${search||'semua'}_${new Date().toISOString().slice(0,10)}.csv`;
    link.click(); URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if(filtered.length===0){ alert('Tidak ada data untuk diexport!'); return; }
    const win = window.open('', '_blank');
    const tableRows = filtered.map((r,i)=>`
      <tr style="border-bottom:1px solid #ddd; background:${i%2===0?'#f8fafc':'#fff'}">
        <td style="padding:8px; font-size:12px;">${r.Tanggal}</td>
        <td style="padding:8px; font-size:12px; font-weight:700;">${clean(r["Node/Pos"])}</td>
        <td style="padding:8px; font-size:12px;">Duration: ${r.Duration}<br/><span style="color:#64748b; font-size:10px;">RFO: ${r.RFO}</span></td>
        <td style="padding:8px; font-size:11px; text-align:center;">${r.is3HPlus ? '<span style="background:#ef4444;color:#fff;padding:4px 8px;border-radius:12px;">MERAH 3H+</span>' : '<span style="background:#10b981;color:#fff;padding:4px 8px;border-radius:12px;">Bagus</span>'}</td>
      </tr>`).join('');
    win.document.write(`<html><head><title>ESDM - ${menu.toUpperCase()}</title><style>body{font-family:Arial;padding:20px} th{background:#1e293b;color:#fff;padding:10px;font-size:11px;text-align:left} table{width:100%;border-collapse:collapse}</style></head><body><h1>ESDM MONITORING - ${menu.toUpperCase()}</h1><p>Filter: ${search||'Semua'} | Total: ${filtered.length} | ${new Date().toLocaleString('id-ID')}</p><table><thead><tr><th>TANGGAL</th><th>NODE/POS</th><th>KENDALA</th><th>STATUS</th></tr></thead><tbody>${tableRows}</tbody></table><script>window.onload=()=>window.print();<\/script></body></html>`);
    win.document.close();
  };

  if(!user) return (
    <div style={{minHeight:'100vh',background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <form onSubmit={handleLogin} style={{background:'#111c2f',padding:32,borderRadius:16,display:'grid',gap:16,width:360, border:'1px solid #1e293b'}}>
        <h2 style={{color:'#fde047',fontWeight:900, textAlign:'center', margin:0}}>ESDM LOGIN</h2>
        <p style={{color:'#94a3b8', fontSize:12, textAlign:'center', margin:'-8px 0 0'}}>Login pakai username atau email</p>
        <input value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} placeholder="Username atau Email" style={{padding:14,borderRadius:10,background:'#0b1220',border:'1px solid #1e293b',color:'#fff'}}/>
        <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Password" style={{padding:14,borderRadius:10,background:'#0b1220',border:'1px solid #1e293b',color:'#fff'}}/>
        <button style={{padding:14,borderRadius:10,background:'#fde047',fontWeight:900, border:'none', cursor:'pointer'}}>Login</button>
      </form>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#0b1220',color:'#fff',display:'flex'}}>
      <div style={{width:260,background:'#070d1a',borderRight:'1px solid #1e293b',padding:16,display:'flex',flexDirection:'column', minHeight:'100vh'}}>
        <div style={{fontWeight:900,fontSize:18}}>ESDM MONITORING</div>
        <div style={{fontSize:12,color:'#fde047', marginTop:4}}>{user.username} ({user.role})<br/><span style={{color:'#94a3b8', fontSize:10}}>{user.email}</span></div>
        <button onClick={handleLogout} style={{marginTop:16,marginBottom:16,padding:14,borderRadius:10,background:'#ef4444',color:'#fff',fontWeight:900,border:'none',cursor:'pointer'}}>🚪 LOGOUT</button>
        <button onClick={()=>{setMenu('icon'); setFilter('semua');}} style={{padding:14,borderRadius:10,background:menu==='icon'?'#fff':'#111c2f',color:menu==='icon'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:10, border:'1px solid #1e293b', cursor:'pointer'}}>📡 Node Icon</button>
        <button onClick={()=>{setMenu('dtp'); setFilter('semua');}} style={{padding:14,borderRadius:10,background:menu==='dtp'?'#fff':'#111c2f',color:menu==='dtp'?'#000':'#fff',fontWeight:700,textAlign:'left',marginBottom:10, border:'1px solid #1e293b', cursor:'pointer'}}>📊 Node DTP</button>
        <button onClick={()=>setMenu('pengguna')} style={{padding:14,borderRadius:10,background:menu==='pengguna'?'#fde047':'#111c2f',color:menu==='pengguna'?'#000':'#fde047',fontWeight:900,textAlign:'left',marginBottom:10, border:'1px solid #fde047', cursor:'pointer'}}>👥 CRUD Pengguna</button>
        {menu!=='pengguna' && (<div style={{marginTop:16, display:'grid', gap:8}}><button onClick={exportExcel} style={{padding:12,borderRadius:10,background:'#10b981',color:'#fff',fontWeight:800,border:'none',cursor:'pointer', fontSize:13}}>📥 Export Excel</button><button onClick={exportPDF} style={{padding:12,borderRadius:10,background:'#3b82f6',color:'#fff',fontWeight:800,border:'none',cursor:'pointer', fontSize:13}}>📄 Export PDF</button></div>)}
        <div style={{marginTop:'auto',fontSize:10,color:'#475569'}}>MENU: {menu}<br/>TAMPIL: {menu==='pengguna'? usersList.length : filtered.length}</div>
      </div>
      <div style={{flex:1,overflow:'auto',background:'#0f1a2f'}}>
        {menu==='pengguna' ? (
          <div style={{padding:20}}>
            <h2 style={{fontSize:20, fontWeight:900, marginBottom:16}}>👥 CRUD Pengguna + Email Notif</h2>
            <form onSubmit={handleUserSubmit} style={{background:'#111c2f', padding:16, borderRadius:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20, border:'1px solid #1e293b'}}>
              <input value={userForm.username} onChange={e=>setUserForm({...userForm, username:e.target.value})} placeholder="Username" required style={{padding:12, borderRadius:8, background:'#0b1220', border:'1px solid #1e293b', color:'#fff'}}/>
              <input value={userForm.email} onChange={e=>setUserForm({...userForm, email:e.target.value})} placeholder="Email (wajib)" type="email" required style={{padding:12, borderRadius:8, background:'#0b1220', border:'1px solid #1e293b', color:'#fff'}}/>
              <input value={userForm.nama_lengkap} onChange={e=>setUserForm({...userForm, nama_lengkap:e.target.value})} placeholder="Nama Lengkap" required style={{padding:12, borderRadius:8, background:'#0b1220', border:'1px solid #1e293b', color:'#fff'}}/>
              <input value={userForm.password} onChange={e=>setUserForm({...userForm, password:e.target.value})} placeholder="Password" required style={{padding:12, borderRadius:8, background:'#0b1220', border:'1px solid #1e293b', color:'#fff'}}/>
              <select value={userForm.role} onChange={e=>setUserForm({...userForm, role:e.target.value})} style={{padding:12, borderRadius:8, background:'#0b1220', border:'1px solid #1e293b', color:'#fff'}}>
                <option value="operator">Operator</option>
                <option value="admin">Admin</option>
                <option value="Super admin">Super Admin</option>
                <option value="Super Admin ESDM">Super Admin ESDM</option>
              </select>
              <button type="submit" style={{gridColumn:'1 / -1', padding:12, borderRadius:8, background: editUserId ? '#f59e0b' : '#fde047', color:'#000', fontWeight:900, border:'none', cursor:'pointer'}}>{editUserId ? '💾 Update & Kirim Email' : '+ Tambah & Kirim Email'}</button>
              {editUserId && <button type="button" onClick={()=>{setEditUserId(null); setUserForm({username:'',email:'',password:'',role:'operator',nama_lengkap:''})}} style={{gridColumn:'1 / -1', padding:10, borderRadius:8, background:'transparent', color:'#94a3b8', border:'1px solid #334155', cursor:'pointer'}}>Batal Edit</button>}
            </form>
            <table style={{width:'100%', borderCollapse:'collapse', background:'#111c2f', borderRadius:12, overflow:'hidden'}}>
              <thead style={{background:'#1e293b'}}><tr style={{fontSize:11, color:'#94a3b8'}}><th style={{padding:12}}>USERNAME</th><th style={{padding:12}}>EMAIL</th><th style={{padding:12}}>NAMA</th><th style={{padding:12}}>ROLE</th><th style={{padding:12}}>AKSI</th></tr></thead>
              <tbody>{usersList.map(u=>(<tr key={u.id} style={{borderTop:'1px solid #1e293b'}}><td style={{padding:12, fontWeight:700}}>{u.username}</td><td style={{padding:12, fontSize:12, color:'#94a3b8'}}>{u.email||'-'}</td><td style={{padding:12}}>{u.nama_lengkap}</td><td style={{padding:12}}><span style={{background:'#fde047', color:'#000', padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:800}}>{u.role}</span></td><td style={{padding:12, display:'flex', gap:6}}><button onClick={()=>handleEditUser(u)} style={{padding:'6px 12px', borderRadius:6, background:'#f59e0b', color:'#fff', border:'none', cursor:'pointer', fontSize:12}}>Edit</button><button onClick={()=>handleDeleteUser(u.id)} style={{padding:'6px 12px', borderRadius:6, background:'#ef4444', color:'#fff', border:'none', cursor:'pointer', fontSize:12}}>Hapus</button></td></tr>))}</tbody>
            </table>
            {loading && <div style={{textAlign:'center', padding:20, color:'#fde047'}}>Loading...</div>}
          </div>
        ) : (
          <>
            <div style={{display:'flex',gap:12,padding:12,position:'sticky',top:0,background:'#0f1a2f',borderBottom:'1px solid #1e293b', zIndex:10, alignItems:'center'}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari Node/Pos..." style={{background:'#111c2f',border:'1px solid #1e293b',borderRadius:10,padding:'10px 14px',color:'#fff',width:260}}/>
              {loading && <span style={{fontSize:12, color:'#fde047'}}>Loading {menu}...</span>}
              <div style={{marginLeft:'auto',display:'flex',gap:8}}>
                <button onClick={()=>setFilter('semua')} style={{padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:700,background:filter==='semua'?'#fff':'transparent',color:filter==='semua'?'#000':'#fff',border:'1px solid #334155', cursor:'pointer'}}>Semua {countAllSearch}</button>
                <button onClick={()=>setFilter('3hari')} style={{padding:'8px 16px',borderRadius:20,fontSize:12,fontWeight:700,background:filter==='3hari'?'#ef4444':'transparent',color:filter==='3hari'?'#fff':'#fca5a5',border:'1px solid #7f1d1d', cursor:'pointer'}}>🔥 3H+ {count3HSearch}</button>
              </div>
            </div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead style={{background:'#1a2744',position:'sticky',top:57}}><tr style={{color:'#94a3b8',fontSize:11}}><th style={{padding:14}}>TANGGAL</th><th style={{padding:14}}>NODE/POS</th><th style={{padding:14}}>KENDALA</th><th style={{padding:14, textAlign:'center'}}>STATUS</th></tr></thead>
              <tbody>{filtered.map((row,i)=>(<tr key={i} style={{background:i%2===0?'#132042':'#0f1a2f',borderBottom:'1px solid #1e293b'}}><td style={{padding:14,color:'#facc15', fontWeight:600}}>{row.Tanggal}</td><td style={{padding:14,fontWeight:700}}>{clean(row["Node/Pos"])}</td><td style={{padding:14}}><div style={{fontWeight:600}}>Duration : {row.Duration}</div><div style={{color:'#94a3b8',fontSize:11, marginTop:4}}>RFO : {row.RFO}</div></td><td style={{padding:14, textAlign:'center'}}>{row.is3HPlus? <span style={{background:'#ef4444',color:'#fff',padding:'6px 12px',borderRadius:999,fontSize:11, fontWeight:800}}>🔥 3H+ MERAH</span> : <span style={{background:'#10b981',color:'#fff',padding:'6px 12px',borderRadius:999,fontSize:11, fontWeight:700}}>☑ Bagus</span>}</td></tr>))}</tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}