import { useEffect, useMemo, useState } from 'react';
const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app";
const GID = import.meta.env.VITE_GID || "285923348";
const API_URL=`${BACKEND}/api/data`;

const toDay = (s)=>{
  if(!s) return null
  s = s.toString().trim()
  const bulan = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',Mei:'05',May:'05',Jun:'06',Jul:'07',Agu:'08',Aug:'08',Sep:'09',Okt:'10',Oct:'10',Nov:'11',Des:'12',Dec:'12'}
  let m = s.match(/(\d{1,2})-([A-Za-z]{3})-(\d{2,4})/)
  if(m){ let y=+m[3]; if(y<100) y+=2000; return `${y}-${bulan[m[2]]}-${String(m[1]).padStart(2,'0')}` }
  m = s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/)
  if(m){ return `${m[3]}-${bulan[m[2]]}-${String(m[1]).padStart(2,'0')}` }
  return null
}

export default function App(){
  const [raw,setRaw]=useState([]); const [stats,setStats]=useState({});
  const [filter,setFilter]=useState('semua');
  const [patokan,setPatokan]=useState(''); const [search,setSearch]=useState('');

  useEffect(()=>{
    fetch(`${API_URL}?gid=${GID}&t=${Date.now()}`).then(r=>r.json()).then(j=>{
      let data = (j.data||[]).filter(o=>{
        const n = (o["Node/Pos"]||'').toLowerCase()
        return!n.startsWith('duration') &&!n.startsWith('rfo')
      })
      setRaw(data); setStats(j);
      const days=[...new Set(data.map(d=>d._day||toDay(d.Tanggal)).filter(Boolean))].sort().reverse();
      if(days[0] &&!patokan) setPatokan(days[0]);
    });
  },[]);

  const allDays=useMemo(()=>[...new Set(raw.map(d=>d._day||toDay(d.Tanggal)).filter(Boolean))].sort().reverse(),[raw]);

  const filtered = useMemo(()=>{
    let arr = [...raw]
    if(search){
      const s=search.toLowerCase()
      arr=arr.filter(o=>o["Node/Pos"]?.toLowerCase().includes(s) || o.KENDALA?.toLowerCase().includes(s))
    }
    if(!patokan) return arr

    const getDay = o => o._day || toDay(o.Tanggal)
    const start = new Date(patokan)

    if(filter==='1hari'){
      arr=arr.filter(o=> getDay(o) === patokan)
    } else if(filter==='7hari'){
      const end=new Date(start); end.setDate(start.getDate()+6);
      arr=arr.filter(o=>{ const d=new Date(getDay(o)); return d>=start && d<=end })
    } else if(filter==='30hari'){
      const end=new Date(start); end.setDate(start.getDate()+29);
      arr=arr.filter(o=>{ const d=new Date(getDay(o)); return d>=start && d<=end })
    } else if(filter==='90hari'){
      const end=new Date(start); end.setDate(start.getDate()+89);
      arr=arr.filter(o=>{ const d=new Date(getDay(o)); return d>=start && d<=end })
    } else if(filter==='patokan'){
      return stats.potongan||[]
    } else if(filter==='3hari'){
      arr=arr.filter(o=>o.is3HPlus)
    }
    return arr
  },[raw,filter,patokan,search,stats.potongan])

  // Hitung jumlah untuk semua tombol biar tidak kosong ()
  const counts = useMemo(()=>{
    if(!patokan ||!raw.length) return {}
    const getDay = o => o._day || toDay(o.Tanggal)
    const start = new Date(patokan)
    const d7 = new Date(start); d7.setDate(start.getDate()+6);
    const d30 = new Date(start); d30.setDate(start.getDate()+29);
    const d90 = new Date(start); d90.setDate(start.getDate()+89);
    return {
      '1hari': raw.filter(o=> getDay(o)===patokan).length,
      '7hari': raw.filter(o=>{ const d=new Date(getDay(o)); return d>=start && d<=d7 }).length,
      '30hari': raw.filter(o=>{ const d=new Date(getDay(o)); return d>=start && d<=d30 }).length,
      '90hari': raw.filter(o=>{ const d=new Date(getDay(o)); return d>=start && d<=d90 }).length,
    }
  },[raw,patokan])

  const judul = filter==='1hari'? `Laporan Harian (1H) - ${patokan}` : filter==='7hari'? `Laporan Mingguan (7H) - 7 Hari dari ${patokan}` : filter==='30hari'? `Laporan 30 Hari dari ${patokan}` : filter==='90hari'? `Laporan 90 Hari dari ${patokan}` : filter==='3hari'? `3H+ Kendala 3 Hari` : filter==='patokan'? `Patokan Tanggal Awal` : `Semua Laporan`;

  return (
    <div className="min-h-screen bg-[#fdf6e3] text-black p-4">
      <h1 className="text-xl font-black">ESDM MONITORING DASHBOARD</h1>
      <div className="my-2">Total: {raw.length} | Bagus: {raw.length-(stats.total3H||0)} | 3H+: {stats.total3H||0}</div>

      <div className="flex gap-2 flex-wrap items-center">
        <input type="date" value={patokan} onChange={e=>setPatokan(e.target.value)} className="border px-2 py-1" />
        <select value={patokan} onChange={e=>setPatokan(e.target.value)} className="border px-2 py-1">
          {allDays.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari Pos PGA / RFO" className="border px-2 py-1 w-64" />
      </div>

      <div className="flex gap-2 flex-wrap my-3">
        <button onClick={()=>setFilter('semua')} className={`border px-3 py-1 ${filter==='semua'?'bg-black text-white':''}`}>Semua ({raw.length})</button>
        <button onClick={()=>setFilter('patokan')} className={`border px-3 py-1 ${filter==='patokan'?'bg-black text-white':''}`}>Patokan ({stats.potongan?.length||0})</button>
        <button onClick={()=>setFilter('1hari')} className={`border px-3 py-1 ${filter==='1hari'?'bg-yellow-300':''}`}>Laporan Harian (1H) ({counts['1hari']||0})</button>
        <button onClick={()=>setFilter('7hari')} className={`border px-3 py-1 ${filter==='7hari'?'bg-black text-white':''}`}>Laporan Mingguan (7H) ({counts['7hari']||0})</button>
        <button onClick={()=>setFilter('30hari')} className={`border px-3 py-1 ${filter==='30hari'?'bg-black text-white':''}`}>Laporan 30 Hari ({counts['30hari']||0})</button>
        <button onClick={()=>setFilter('90hari')} className={`border px-3 py-1 ${filter==='90hari'?'bg-black text-white':''}`}>Laporan 90 Hari ({counts['90hari']||0})</button>
        <button onClick={()=>setFilter('3hari')} className={`border px-3 py-1 ${filter==='3hari'?'bg-red-600 text-white':''}`}>3H+ ({stats.total3H||0})</button>
      </div>

      <div className="my-2 text-sm">{judul} | Hasil: {filtered.length} | Patokan: {patokan}</div>

      <table className="w-full text-sm border">
        <thead><tr><th className="border p-2 text-left">Tanggal</th><th className="border p-2 text-left">Node/Pos</th><th className="border p-2 text-left">KENDALA</th></tr></thead>
        <tbody>
          {filtered.map((r,i)=><tr key={i}><td className="border p-2">{r.Tanggal}</td><td className="border p-2 font-bold">{r["Node/Pos"]}</td><td className="border p-2 whitespace-pre-wrap">{r.KENDALA}</td></tr>)}
        </tbody>
      </table>
    </div>
  )
}