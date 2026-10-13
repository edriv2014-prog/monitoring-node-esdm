import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
// FIX: BACKEND jangan pakai /api lagi di env, cukup base url
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

  const isLogin = !!user;
  const isSuperAdmin = user?.role === 'Super admin';

  useEffect(()=>{
    if(!isLogin) return;
    fetch(`${API_URL}?gid=0`).then(r=>r.json()).then(j=>{ setRaw(j.data||[]); setStats(j); const days=[...new Set((j.data||[]).map(d=>toDay(d.Tanggal)).filter(Boolean))].sort().reverse(); if(days[0]) setPatokan(days[0]); }).catch(()=>{});
  },[isLogin]);

  const loadUsers = async ()=>{
    const {data,error}=await supabase.from('users').select('*').order('created_at',{ascending:false});
    if(!error) setUsersList(data||[]);
  };
  useEffect(()=>{ if(isLogin) loadUsers(); },[isLogin,menu]);

  const handleLogin = async (e)=>{
    e.preventDefault(); setLoadingLogin(true);
    const {data,error}=await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single();
    setLoadingLogin(false);
    if(error||!data){ alert('Login gagal! User: superadmin / Pass: esdm2026. Pastikan tabel users sudah ada di Supabase!'); return; }
    localStorage.setItem('esdm_user', JSON.stringify(data)); setUser(data); setMenu('icon');
  };
  const handleLogout=()=>{ localStorage.removeItem('esdm_user'); setUser(null); setLoginForm({username:'',password:''}); };

  const handleSaveUser=async (e)=>{
    e.preventDefault();
    if(!isSuperAdmin) return alert('Hanya Super admin!');
    if(editUser){
      const {error}=await supabase.from('users').update({username:formUser.username,email:formUser.email,password:formUser.password,role:formUser.role}).eq('id',editUser.id);
      if(error) alert(error.message); else { setEditUser(null); setFormUser({username:'',email:'',password:'',role:'Viewer'}); loadUsers(); }
    } else {
      const {error}=await supabase.from('users').insert([{username:formUser.username,email:formUser.email,password:formUser.password,role:formUser.role}]);
      if(error) alert(error.message); else { setFormUser({username:'',email:'',password:'',role:'Viewer'}); loadUsers(); }
    }
  };
  const handleEdit=(u)=>{ setEditUser(u); setFormUser({username:u.username,email:u.email||'',password:u.password,role:u.role}); };
  const handleDelete=async (id)=>{ if(!isSuperAdmin) return; if(!confirm('Hapus user?')) return; const {error}=await supabase.from('users').delete().eq('id',id); if(error) alert(error.message); else loadUsers(); };

  const allDays=useMemo(()=>[...new Set(raw.map(d=>toDay(d.Tanggal)).filter(Boolean))].sort().reverse(),[raw]);
  const filtered=useMemo(()=>{
    let arr=[...raw];
    if(search){ const s=search.toLowerCase(); arr=arr.filter(d=> d.Tanggal?.toLowerCase().includes(s) || d["Node/Pos"]?.toLowerCase().includes(s) || d.KENDALA?.toLowerCase().includes(s)); }
    if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus);
    if(filter==='patokan'){ const map={}; arr.forEach(o=>{ const k=cleanNode(o["Node/Pos"]); if(!map[k]) map[k]=o; }); arr=Object.values(map); }
    if(patokan && ['1hari','7hari','30hari','90hari'].includes(filter)){
      const start=new Date(patokan); let days= filter==='1hari'?1: filter==='7hari'?7: filter==='30hari'?30:90; const end=new Date(start); end.setDate(start.getDate()+days-1);
      arr=arr.filter(o=>{ const d=toDay(o.Tanggal); if(!d) return false; const dt=new Date(d); return dt>=start&&dt<=end; });
    }
    return arr.sort((a,b)=>parseTgl(b.Tanggal)-parseTgl(a.Tanggal));
  },[raw,filter,patokan,search]);

  // === HALAMAN LOGIN AWAL ===
  if(!isLogin){
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-2xl font-black text-white mb-1 bg-gradient-to-r from-yellow-300 to-orange-500 bg-clip-text text-transparent">ESDM LOGIN</h1>
          <p className="text-white/50 text-xs mb-6">Supabase tabel users</p>
          <form onSubmit={handleLogin} className="space-y-3">
            <input value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} placeholder="Username (superadmin)" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30"/>
            <input type="password" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Password (esdm2026)" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30"/>
            <button disabled={loadingLogin} className="w-full bg-gradient-to-br from-yellow-400 to-orange-600 text-black font-black py-3 rounded-xl disabled:opacity-50">{loadingLogin?'Loading...':'Login Awal'}</button>
          </form>
          <div className="mt-3 text-[11px] text-white/40 space-y-1">
            <div>Default Super admin: superadmin / esdm2026</div>
            <div>Env: VITE_SUPABASE_URL & ANON_KEY harus ada di Vercel!</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white flex">
      <div className="w-64 bg-black/60 border-r border-white/10 p-4 flex flex-col sticky top-0 h-screen">
        <h1 className="text-sm font-black tracking-tight bg-gradient-to-r from-yellow-300 to-orange-500 bg-clip-text text-transparent mb-1">ESDM MONITORING</h1>
        <div className="text-[11px] text-white/40 mb-6">Login: {user.username} ({user.role})</div>
        <div className="space-y-2">
          {[
            {k:'icon', l:'📡 Node Icon', desc:'Backhaul Normal'},
            {k:'dtp', l:'📊 Node DTP', desc:'Duration & RFO'},
            {k:'users', l:'👥 List Pemakai', desc:`${usersList.length} Users`},
          ].map(m=>(
            <button key={m.k} onClick={()=>setMenu(m.k)} className={`w-full text-left px-4 py-3 rounded-xl border transition ${menu===m.k?'bg-white text-black border-white font-bold':'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'}`}>
              <div className="text-sm">{m.l}</div><div className="text-[10px] opacity-60">{m.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-white/10">
          <button onClick={handleLogout} className="w-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 py-2 rounded-xl text-sm font-bold">🚪 Logout (sesudah login)</button>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/60 border-b border-white/10 p-4">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <h2 className="text-xl font-black capitalize">{menu} {isSuperAdmin&&menu==='users'?' - Super admin CRUD':''}</h2>
            {menu!=='users' && <div className="flex gap-2"><div className="px-3 py-1 rounded bg-white text-black text-xs font-bold">Total {raw.length}</div><div className="px-3 py-1 rounded bg-red-500 text-white text-xs font-bold">3H+ {stats.total3H||0}</div></div>}
          </div>
        </div>
        {menu==='users' ? (
          <div className="p-6 space-y-4">
            {isSuperAdmin ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <h3 className="font-bold mb-3">{editUser?'✏️ Edit User':'➕ Tambah User Baru'}</h3>
                <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <input value={formUser.username} onChange={e=>setFormUser({...formUser,username:e.target.value})} placeholder="Username" required className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"/>
                  <input value={formUser.email} onChange={e=>setFormUser({...formUser,email:e.target.value})} placeholder="Email" className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"/>
                  <input value={formUser.password} onChange={e=>setFormUser({...formUser,password:e.target.value})} placeholder="Password" required className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"/>
                  <select value={formUser.role} onChange={e=>setFormUser({...formUser,role:e.target.value})} className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm"><option>Super admin</option><option>Admin</option><option>Operator</option><option>Viewer</option></select>
                  <button className="bg-white text-black font-bold rounded-xl px-4 py-2 text-sm">{editUser?'Update':'Create'}</button>
                </form>
                {editUser && <button onClick={()=>{setEditUser(null); setFormUser({username:'',email:'',password:'',role:'Viewer'});}} className="mt-2 text-xs text-white/50">Cancel edit</button>}
              </div>
            ) : <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 p-3 rounded-xl text-sm">⚠️ Hanya Super admin bisa CRUD user. Kamu login sebagai {user.role}</div>}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <table className="w-full text-sm"><thead className="bg-white/5 text-white/50 text-xs"><tr><th className="p-3 text-left">Username</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Role</th><th className="p-3 text-left">Created</th>{isSuperAdmin&&<th className="p-3 text-left">Aksi</th>}</tr></thead>
                <tbody>{usersList.map(u=><tr key={u.id} className="border-t border-white/5 hover:bg-white/5"><td className="p-3 font-bold">{u.username}</td><td className="p-3 text-white/60">{u.email}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-xs ${u.role==='Super admin'?'bg-purple-500/30 text-purple-200':'bg-white/10'}`}>{u.role}</span></td><td className="p-3 text-xs text-white/40">{new Date(u.created_at).toLocaleDateString()}</td>{isSuperAdmin&&<td className="p-3 flex gap-2"><button onClick={()=>handleEdit(u)} className="px-3 py-1 bg-white/10 rounded-lg text-xs">Edit</button><button onClick={()=>handleDelete(u.id)} className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg text-xs">Hapus</button></td>}</tr>)}</tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-3">
            <div className="flex gap-2 mb-3 flex-wrap"><input type="date" value={patokan} onChange={e=>setPatokan(e.target.value)} className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-sm"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari Node..." className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm w-64 ml-auto"/><div className="flex gap-2">{[{k:'semua',l:'Semua'}, {k:'3hari',l:`3H+ (${stats.total3H||0})`}, {k:'1hari',l:'1H'}, {k:'7hari',l:'7H'}].map(f=><button key={f.k} onClick={()=>setFilter(f.k)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${filter===f.k?'bg-white text-black':'bg-white/5 border-white/10'}`}>{f.l}</button>)}</div></div>
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5"><div className="overflow-auto max-h-[80vh]"><table className="w-full text-sm"><thead className="bg-white/10 sticky top-0"><tr className="text-white/60 text-xs uppercase"><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Node/Pos</th><th className="p-3 text-left">ICON / LINK</th><th className="p-3 text-left">KENDALA</th><th className="p-3 text-left">STATUS</th></tr></thead><tbody>{filtered.map((row,i)=><tr key={i} className={`border-b border-white/5 ${row.is3HPlus?'bg-red-500/10':''}`}><td className="p-3 text-yellow-200 font-bold text-xs">{row.Tanggal}</td><td className="p-3 font-black">{cleanNode(row["Node/Pos"])}</td><td className="p-3"><span className="px-2 py-1 rounded bg-white/10 text-xs">{row.LINK}</span></td><td className="p-3 text-white/70 text-xs max-w-[500px]">{row.KENDALA}</td><td className="p-3">{row.is3HPlus?<span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold">🔥 3H+ MERAH</span>:<span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">☑ Bagus</span>}</td></tr>)}</tbody></table></div></div>
          </div>
        )}
      </div>
    </div>
  );
}