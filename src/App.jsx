import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
const BACKEND = (import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app").replace(/\/api\/?$/,'');
const API_URL = `${BACKEND}/api/data`;

const cleanNode = (s) => {
  let v = String(s||''); v = v.replace(/^\s*[\d\.\-\)\:\s\u00A0\xA0]+/g,'').trim(); v = v.replace(/^\d+\W+/g,'').trim();
  const m = v.match(/[A-Za-z].*/s); return m ? m[0].split('\n')[0].trim() : v.split('\n')[0].trim();
};
const bulan={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11};
const toDay=s=>{const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); return m? new Date(+m[3],bulan[m[2]]??0,+m[1]).toISOString().slice(0,10):null;}
const parseTgl=s=>{const m=s?.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); return m? new Date(+m[3],bulan[m[2]]??0,+m[1]):new Date(0);};

export default function App(){
  const [raw,setRaw]=useState([]); const [stats,setStats]=useState({});
  const [filter,setFilter]=useState('semua'); const [patokan,setPatokan]=useState('');
  const [search,setSearch]=useState(''); const [menu,setMenu]=useState('icon');
  const [user,setUser]=useState(()=>{ try{ return JSON.parse(localStorage.getItem('esdm_user')||'null'); } catch{ return null; } });
  const [loginForm,setLoginForm]=useState({username:'',password:''});
  const [usersList,setUsersList]=useState([]); const [editUser,setEditUser]=useState(null);
  const [formUser,setFormUser]=useState({username:'',email:'',password:'',role:'Viewer'});
  const [loadingLogin,setLoadingLogin]=useState(false);
  const [debug,setDebug]=useState('');

  const isLogin = !!user;
  const isSuperAdmin = user?.role === 'Super admin';

  useEffect(()=>{
    if(!isLogin) return;
    fetch(`${API_URL}?gid=0`).then(r=>r.json()).then(j=>{ setRaw(j.data||[]); setStats(j); const days=[...new Set((j.data||[]).map(d=>toDay(d.Tanggal)).filter(Boolean))].sort().reverse(); if(days[0]) setPatokan(days[0]); }).catch(()=>{});
  },[isLogin]);

  const loadUsers = async ()=>{
    const {data}=await supabase.from('users').select('*').order('created_at',{ascending:false});
    if(data) setUsersList(data);
  };
  useEffect(()=>{ if(isLogin) loadUsers(); },[isLogin,menu]);

  const handleLogin = async (e)=>{
    e.preventDefault(); setLoadingLogin(true); setDebug('');
    try {
      console.log("SUPABASE URL", import.meta.env.VITE_SUPABASE_URL);
      console.log("LOGIN ATTEMPT", loginForm.username, loginForm.password);
      const {data,error}=await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single();
      console.log("SUPABASE RESULT", data, error);
      if(error){
        setDebug(`ERROR SUPABASE: ${error.message} | Code: ${error.code} | Hint: Cek RLS / Env Vercel`);
        alert(`Login gagal! ERROR: ${error.message}\n\nCek: 1. Env VITE_SUPABASE_URL ada? 2. Tabel users ada? 3. RLS dimatikan?`);
        setLoadingLogin(false);
        return;
      }
      if(!data){
        setDebug('DATA NULL - user tidak ditemukan');
        alert('User tidak ditemukan! Cek username/password di tabel users Supabase');
        setLoadingLogin(false);
        return;
      }
      localStorage.setItem('esdm_user', JSON.stringify(data)); setUser(data); setMenu('icon');
    } catch(err){
      console.error(err); setDebug(`EXCEPTION: ${err.message}`); alert(`Exception: ${err.message}`);
    }
    setLoadingLogin(false);
  };
  const handleLogout=()=>{ localStorage.removeItem('esdm_user'); setUser(null); };

  const handleSaveUser=async (e)=>{
    e.preventDefault();
    if(!isSuperAdmin) return alert('Hanya Super admin!');
    if(editUser){
      await supabase.from('users').update({username:formUser.username,email:formUser.email,password:formUser.password,role:formUser.role}).eq('id',editUser.id);
      setEditUser(null); setFormUser({username:'',email:'',password:'',role:'Viewer'}); loadUsers();
    } else {
      await supabase.from('users').insert([{username:formUser.username,email:formUser.email,password:formUser.password,role:formUser.role}]);
      setFormUser({username:'',email:'',password:'',role:'Viewer'}); loadUsers();
    }
  };

  const filtered=useMemo(()=>{
    let arr=[...raw];
    if(search){ const s=search.toLowerCase(); arr=arr.filter(d=> d.Tanggal?.toLowerCase().includes(s) || d["Node/Pos"]?.toLowerCase().includes(s)); }
    if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus);
    return arr.sort((a,b)=>parseTgl(b.Tanggal)-parseTgl(a.Tanggal));
  },[raw,filter,search]);

  if(!isLogin){
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6">
          <h1 className="text-2xl font-black bg-gradient-to-r from-yellow-300 to-orange-500 bg-clip-text text-transparent mb-1">ESDM LOGIN</h1>
          <p className="text-white/50 text-xs mb-4">Debug mode - lihat Console F12</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} placeholder="Username admin" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"/>
            <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Password admin" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"/>
            <button disabled={loadingLogin} className="w-full bg-gradient-to-br from-yellow-400 to-orange-600 text-black font-black py-3 rounded-xl">{loadingLogin?'Loading...':'Login Awal'}</button>
          </form>
          {debug && <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-xl break-words">{debug}</div>}
          <div className="mt-3 text-[10px] text-white/30 break-all">URL: {import.meta.env.VITE_SUPABASE_URL || 'KOSONG! SET ENV DI VERCEL!'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      <div className="w-64 bg-black/60 border-r border-white/10 p-4 flex flex-col">
        <h1 className="text-sm font-black mb-1">ESDM MONITORING</h1>
        <div className="text-[11px] text-white/40 mb-6">{user.username} ({user.role})</div>
        <div className="space-y-2">
          <button onClick={()=>setMenu('icon')} className={`w-full text-left px-4 py-3 rounded-xl border ${menu==='icon'?'bg-white text-black':'bg-white/5 border-white/10'}`}>📡 Node Icon</button>
          <button onClick={()=>setMenu('dtp')} className={`w-full text-left px-4 py-3 rounded-xl border ${menu==='dtp'?'bg-white text-black':'bg-white/5 border-white/10'}`}>📊 Node DTP</button>
          <button onClick={()=>setMenu('users')} className={`w-full text-left px-4 py-3 rounded-xl border ${menu==='users'?'bg-white text-black':'bg-white/5 border-white/10'}`}>👥 List Pemakai ({usersList.length})</button>
        </div>
        <button onClick={handleLogout} className="mt-auto bg-red-500/20 border border-red-500/30 text-red-300 py-2 rounded-xl text-sm font-bold">🚪 Logout</button>
      </div>
      <div className="flex-1 p-4">
        {menu==='users' ? (
          <div className="space-y-4">
            <form onSubmit={handleSaveUser} className="bg-white/5 border border-white/10 rounded-2xl p-4 grid grid-cols-5 gap-2">
              <input value={formUser.username} onChange={e=>setFormUser({...formUser,username:e.target.value})} placeholder="Username" required className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"/>
              <input value={formUser.email} onChange={e=>setFormUser({...formUser,email:e.target.value})} placeholder="Email" className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"/>
              <input value={formUser.password} onChange={e=>setFormUser({...formUser,password:e.target.value})} placeholder="Password" required className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"/>
              <select value={formUser.role} onChange={e=>setFormUser({...formUser,role:e.target.value})} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"><option>Super admin</option><option>Admin</option><option>Operator</option><option>Viewer</option></select>
              <button className="bg-white text-black font-bold rounded-xl">{editUser?'Update':'Create'}</button>
            </form>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-white/5 text-white/50 text-xs"><tr><th className="p-3 text-left">Username</th><th className="p-3 text-left">Role</th></tr></thead><tbody>{usersList.map(u=><tr key={u.id} className="border-t border-white/5"><td className="p-3">{u.username}</td><td className="p-3">{u.role}</td></tr>)}</tbody></table></div>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5"><div className="p-3 flex gap-2"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari..." className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm w-64"/><span className="ml-auto text-xs bg-white text-black px-3 py-1 rounded-full">Total {filtered.length} | 3H+ {raw.filter(r=>r.is3HPlus).length}</span></div><table className="w-full text-sm"><thead className="bg-white/10"><tr className="text-white/60 text-xs uppercase"><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Node/Pos</th><th className="p-3 text-left">LINK</th><th className="p-3 text-left">STATUS</th></tr></thead><tbody>{filtered.map((row,i)=><tr key={i} className={`border-b border-white/5 ${row.is3HPlus?'bg-red-500/10':''}`}><td className="p-3 text-yellow-200 text-xs">{row.Tanggal}</td><td className="p-3 font-bold">{cleanNode(row["Node/Pos"])}</td><td className="p-3"><span className="px-2 py-1 rounded bg-white/10 text-xs">{row.LINK}</span></td><td className="p-3">{row.is3HPlus?<span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs">🔥 3H+ MERAH</span>:<span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-xs">☑ Bagus</span>}</td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
