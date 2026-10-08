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
  const [raw,setRaw]=useState([]); const [stats,setStats]=useState({}); const [filter,setFilter]=useState('semua');
  const [patokan,setPatokan]=useState(''); const [search,setSearch]=useState(''); const [loading,setLoading]=useState(true);

  useEffect(()=>{
    fetch(`${API_URL}?gid=${GID}&filter=semua&t=${Date.now()}`).then(r=>r.json()).then(j=>{
      // FILTER DEFENSIF DI FRONTEND BIAR DURATION/RFO GAK JADI NODE
      let data = (j.data||[]).filter(o=>{
        const n = (o["Node/Pos"]||'').toLowerCase()
        return!n.startsWith('duration') &&!n.startsWith('rfo')
      })
      setRaw(data); setStats(j);
      const days=[...new Set(data.map(d=>d._day||toDay(d.Tanggal)).filter(Boolean))].sort().reverse();
      if(days[0]) setPatokan(days[0]); setLoading(false);
    });
  },[]);

  const allDays=useMemo(()=>[...new Set(raw.map(d=>d._day||toDay(d.Tanggal)).filter(Boolean))].sort().reverse(),[raw]);

  const filtered = useMemo(()=>{
    let arr = [...raw]
    if(search){
      const s=search.toLowerCase()
      arr=arr.filter(o=>o["Node/Pos"]?.toLowerCase().includes(s) || o.KENDALA?.toLowerCase().includes(s))
    }
    // FIX 1H: CUMA 1 TANGGAL
    if(filter==='1hari'){
      arr=arr.filter(o=> (o._day||toDay(o.Tanggal)) === patokan)
    }
    if(filter==='7hari' && patokan){
      const start=new Date(patokan); const end=new Date(start); end.setDate(start.getDate()+6);
      arr=arr.filter(o=>{ const d=new Date(o._day||toDay(o.Tanggal)); return d>=start && d<=end })
    }
    if(filter==='patokan') return stats.potongan||[]
    if(filter==='3hari') arr=arr.filter(o=>o.is3HPlus)
    return arr
  },[raw,filter,patokan,search,stats.potongan])

  const judul = filter==='1hari'? `Laporan Harian (1H) - ${patokan}` : `Semua`

  return (
    <div className="min-h-screen bg-[#fdf6e3] text-black p-4">
      <h1 className="text-2xl font-black mb-2">ESDM MONITORING DASHBOARD</h1>
      <div>Total: {raw.length} | Bagus: {raw.length-(stats.total3H||0)} | 3H+: {stats.total3H||0}</div>
      <div className="flex gap-2 my-2">
        <input type="date" value={patokan} onChange={e=>setPatokan(e.target.value)} className="border px-2" />
        <select value={patokan} onChange={e=>setPatokan(e.target.value)} className="border px-2">{allDays.map(d=><option key={d} value={d}>{d}</option>)}</select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari" className="border px-2" />
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setFilter('semua')} className="border px-2">Semua ({raw.length})</button>
        <button onClick={()=>setFilter('patokan')} className="border px-2">Patokan ({stats.potongan?.length||0})</button>
        <button onClick={()=>setFilter('1hari')} className="border px-2 bg-yellow-200">Laporan Harian (1H) ({filter==='1hari'?filtered.length:''})</button>
        <button onClick={()=>setFilter('3hari')} className="border px-2">3H+ ({stats.total3H||0})</button>
      </div>
      <div className="mt-2">{judul} | Hasil: {filtered.length} | Patokan: {patokan}</div>
      <table className="w-full mt-2 text-sm border">
        <thead><tr><th className="border">Tanggal</th><th className="border">Node/Pos</th><th className="border">KENDALA</th></tr></thead>
        <tbody>{filtered.map((r,i)=><tr key={i}><td className="border p-1">{r.Tanggal}</td><td className="border p-1">{r["Node/Pos"]}</td><td className="border p-1 whitespace-pre-wrap">{r.KENDALA}</td></tr>)}</tbody>
      </table>
    </div>
  )
}