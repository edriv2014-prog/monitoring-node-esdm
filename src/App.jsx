import { useEffect, useMemo, useState } from 'react';

const API = "https://monitoring-node-esdm-api.vercel.app/api/data?gid=285923348"
const MONTHS = {Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, Jun:5, Jul:6, Agu:7, Sep:8, Okt:9, Nov:10, Des:11}
const parseTgl = (s)=>{ try{ const [d,m,y]=s.split(' '); return new Date(Number(y), MONTHS[m]??8, Number(d)) }catch{return new Date()} }

export default function App(){
  const [data,setData]=useState([])
  const [q,setQ]=useState("")
  const [link,setLink]=useState("Semua")
  const [period,setPeriod]=useState("Semua")
  const [page,setPage]=useState(0)
  
  useEffect(()=>{ fetch(API).then(r=>r.json()).then(j=>setData(j.data||j||[])) },[])

  const filtered = useMemo(()=>{
    const now = Date.now()
    return data.filter(d=>{
      const dt = parseTgl(d.Tanggal)
      const diff = (now - dt.getTime())/86400000
      const okQ =!q || d["Node/Pos"].toLowerCase().includes(q.toLowerCase())
      const okLink = link==="Semua" || d.LINK===link
      let okP = true
      if(period==="1H") okP = diff<=1
      if(period==="7H") okP = diff<=7
      if(period==="30H") okP = diff<=30
      if(period==="90H") okP = diff<=90
      return okQ && okLink && okP
    })
  },[data,q,link,period])

  useEffect(()=>setPage(0),[q,link,period])
  const pageData = filtered.slice(page*50,(page+1)*50)
  const total = Math.ceil(filtered.length/50)

  return(
    <div className="min-h-screen bg-slate-50 p-4">
      <h1 className="text-2xl font-bold">Rekap Laporan Harian 2026 - Monitoring ICON & DTP</h1>
      <p className="text-xs text-slate-500 mb-3">Total: {data.length} | Filtered: {filtered.length} | Terbaru: {data[0]?.Tanggal}</p>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        <div className="bg-white p-3 rounded-xl shadow"><div className="text-xs">TOTAL</div><div className="text-xl font-bold">{data.length}</div></div>
        {["1H","7H","30H","90H","Semua"].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} className={`p-3 rounded-xl shadow border-2 ${period===p?'border-black bg-black text-white':'bg-white'}`}>{p}<br/><span className="text-xs">{p==="Semua"?filtered.length:data.filter(d=> (Date.now()-parseTgl(d.Tanggal).getTime())/86400000 <= (p==="1H"?1:p==="7H"?7:p==="30H"?30:90)).length}</span></button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari Node/Pos" className="border px-3 py-2 rounded flex-1"/>
        <select value={link} onChange={e=>setLink(e.target.value)} className="border px-3 py-2 rounded"><option>Semua</option><option>Icon</option><option>DTP</option></select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-white"><tr><th className="p-2 text-left">Tanggal</th><th className="p-2 text-left">Node/Pos</th><th className="p-2">LINK</th><th className="p-2 text-left">KENDALA</th></tr></thead>
          <tbody>
            {pageData.map((r,i)=><tr key={i} className="border-b"><td className="p-2">{r.Tanggal}</td><td className="p-2">{r["Node/Pos"]}</td><td className="p-2">{r.LINK}</td><td className="p-2 truncate max-w-">{r.KENDALA}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-2"><button onClick={()=>setPage(p=>Math.max(0,p-1))}>Prev</button><span>{page+1}/{total}</span><button onClick={()=>setPage(p=>p+1)}>Next</button></div>
    </div>
  )
}