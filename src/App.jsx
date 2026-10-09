import { useEffect, useMemo, useState } from 'react';
const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app/api";
const GID = import.meta.env.VITE_GID || "285923348";

const API_URL=`${BACKEND}/api/data`;

const bulan={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11};
const toDay=s=>{const m=s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); return m? new Date(+m[3],bulan[m[2]]??0,+m[1]).toISOString().slice(0,10):null;}
const parseTgl=s=>{const m=s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); return m? new Date(+m[3],bulan[m[2]]??0,+m[1]):new Date(0);};

export default function App(){
  const [raw,setRaw]=useState([]); const [stats,setStats]=useState({}); const [filter,setFilter]=useState('semua');
  const [patokan,setPatokan]=useState(''); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true);

  useEffect(()=>{
    //alert(`${API_URL}?gid=${GID}&filter=semua`);
    fetch(`${API_URL}?gid=${GID}&filter=semua`).then(r=>r.json()).then(j=>{
      alert("sdsdsd")
      //console.log(j.data);
      setRaw(j.data||[]); setStats(j);
      const days=[...new Set((j.data||[]).map(d=>toDay(d.Tanggal)).filter(Boolean))].sort().reverse();
      if(days[0]) setPatokan(days[0]); setLoading(false);
    });
  },[]);

  const allDays=useMemo(()=>[...new Set(raw.map(d=>toDay(d.Tanggal)).filter(Boolean))].sort().reverse(),[raw]);

  const filtered=useMemo(()=>{
    let arr=[...raw];
    if(search){ const s=search.toLowerCase(); arr=arr.filter(d=> d.Tanggal?.toLowerCase().includes(s) || d["Node/Pos"]?.toLowerCase().includes(s) || d.KENDALA?.toLowerCase().includes(s)); }
    if(filter==='patokan'){ const map={}; arr.forEach(o=>{ if(!map[o._prosesKey]) map[o._prosesKey]=o; }); arr=Object.values(map); }
    if(patokan){
      const start=new Date(patokan);
      if(filter==='1hari') arr=arr.filter(o=>toDay(o.Tanggal)===patokan);
      if(filter==='7hari'){ const end=new Date(start); end.setDate(start.getDate()+6); arr=arr.filter(o=>{ const d=toDay(o.Tanggal); if(!d) return false; const dt=new Date(d); return dt>=start&&dt<=end; }); }
      if(filter==='30hari'){ const end=new Date(start); end.setDate(start.getDate()+29); arr=arr.filter(o=>{ const d=toDay(o.Tanggal); if(!d) return false; const dt=new Date(d); return dt>=start&&dt<=end; }); }
      if(filter==='90hari'){ const end=new Date(start); end.setDate(start.getDate()+89); arr=arr.filter(o=>{ const d=toDay(o.Tanggal); if(!d) return false; const dt=new Date(d); return dt>=start&&dt<=end; }); }
    }
    if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus);
    return arr.sort((a,b)=>parseTgl(b.Tanggal)-parseTgl(a.Tanggal));
  },[raw,filter,patokan,search]);

  const judul = filter==='1hari'? `Laporan Harian (1H) - ${patokan}` : filter==='7hari'? `Laporan Mingguan (7H) - 7 Hari dari ${patokan}` : filter==='30hari'? `Laporan 30 Hari dari ${patokan}` : filter==='90hari'? `Laporan 90 Hari dari ${patokan}` : filter==='3hari'? `3H+ Kendala 3 Hari Berturut2` : filter==='patokan'? `Patokan Tanggal Awal` : `Semua Laporan`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
      {/* HEADER GENJRENG */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/60 border-b border-white/10 p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-yellow-300 to-orange-500 bg-clip-text text-transparent">ESDM MONITORING DASHBOARD</h1>
          <div className="flex gap-2 flex-wrap">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-white to-slate-200 text-black font-bold shadow-lg">Total: {raw.length}</div>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-white font-bold shadow-lg shadow-green-500/30">☑ Bagus: {raw.length-(stats.total3H||0)}</div>
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white font-bold shadow-lg shadow-red-500/30 animate-pulse">🔥 3H+: {stats.total3H||0} baris / {stats.count3hari||0} Node</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-white/60">Patokan:</span>
          <input type="date" value={patokan} onChange={e=>setPatokan(e.target.value)} className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-sm" />
          <select value={patokan} onChange={e=>setPatokan(e.target.value)} className="bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-sm">
            {allDays.map(d=><option key={d} value={d} className="text-black">{d}</option>)}
          </select>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari Pos PGA / RFO / km..." className="bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm w-64 ml-auto" />
        </div>
      </div>

      {/* FILTER BUTTON GENJRENG */}
      <div className="p-3 flex flex-wrap gap-2 bg-gradient-to-r from-slate-900 to-black border-b border-white/5">
        {[
          {k:'semua', l:`Semua`, c:'from-slate-600 to-slate-700', count:raw.length},
          {k:'patokan', l:`Patokan Tanggal Awal`, c:'from-blue-600 to-indigo-600', count:stats.totalPotongan||0},
          {k:'1hari', l:`Laporan Harian (1H)`, c:'from-cyan-500 to-blue-500', count:filter==='1hari'?filtered.length:''},
          {k:'7hari', l:`Laporan Mingguan (7H)`, c:'from-violet-500 to-purple-600', count:filter==='7hari'?filtered.length:''},
          {k:'30hari', l:`Laporan 30 Hari`, c:'from-fuchsia-500 to-pink-600', count:filter==='30hari'?filtered.length:''},
          {k:'90hari', l:`Laporan 90 Hari`, c:'from-orange-500 to-red-500', count:filter==='90hari'?filtered.length:''},
          {k:'3hari', l:`3H+ Kendala 3 Hari`, c:'from-red-600 to-red-800', count:stats.total3H||0},
        ].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${filter===f.k? `bg-gradient-to-br ${f.c} text-white border-white/30 scale-105 shadow-lg` : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/70'}`}>
            {f.l} {f.count? `(${f.count})` : ''}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 text- text-white/40">{judul} | Hasil: {filtered.length} | Patokan: {patokan}</div>

      {/* TABLE GENJRENG */}
      <div className="p-3">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur shadow-2xl">
          <div className="overflow-auto max-h-">
            <table className="w-full text-sm">
              <thead className="bg-white/10 sticky top-0 backdrop-blur">
                <tr className="text-white/70 text-xs uppercase tracking-widest"><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Node/Pos</th><th className="p-3 text-left">LINK</th><th className="p-3 text-left">KENDALA</th><th className="p-3 text-left">STATUS</th></tr>
              </thead>
              <tbody>
                {filtered.map((row,i)=>(
                  <tr key={i} className={`border-b border-white/5 hover:bg-white/10 transition ${row.is3HPlus?'bg-red-500/10':''}`}>
                    <td className="p-3 align-top whitespace-nowrap text-yellow-200 font-bold">{row.Tanggal}</td>
                    <td className="p-3 align-top font-black text-white">{row["Node/Pos"]}</td>
                    <td className="p-3 align-top"><span className="px-2 py-1 rounded bg-white/10 text-">{row.LINK}</span></td>
                    <td className="p-3 align-top text-white/80 whitespace-pre-wrap leading-relaxed max-w-">{row.KENDALA}</td>
                    <td className="p-3 align-top">{row.is3HPlus? <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-white text-xs font-bold shadow">🔥 3H+ MERAH</span> : <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 text-white text-xs font-bold">☑ Bagus</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}