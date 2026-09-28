"use client"
import { useState, useEffect, useMemo } from 'react'
const API = "https://monitoring-node-esdm-api.vercel.app/api/data?gid=285923348"

export default function App(){
  const [data,setData]=useState<any[]>([])
  const [q,setQ]=useState("")
  const [period,setPeriod]=useState("Semua")
  const [page,setPage]=useState(0)

  useEffect(()=>{ fetch(API).then(r=>r.json()).then(j=>setData(j.data||[])) },[])

  const filtered = useMemo(()=> data.filter((d:any)=>{
    const diff = (Date.now()-new Date(d.Tanggal.replace('Sep','Sep')).getTime())/86400000
    if(period==="1H") return diff<=1
    if(period==="7H") return diff<=7
    if(period==="30H") return diff<=30
    if(period==="90H") return diff<=90
    return d["Node/Pos"].toLowerCase().includes(q.toLowerCase())
  }),[data,q,period])

  const pageData = filtered.slice(page*50, (page+1)*50)

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-xl font-bold mb-2">Rekap Laporan Harian 2026 - ICON & DTP</h1>
      <div className="flex gap-2 mb-4">
        {["1H","7H","30H","90H","Semua"].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} className={`px-3 py-1 rounded border ${period===p?'bg-black text-white':''}`}>{p}</button>
        ))}
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari Node/Pos" className="border px-3 py-1 rounded"/>
      </div>
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-black text-white"><tr><th className="p-2">Tanggal</th><th className="p-2">Node/Pos</th><th className="p-2">LINK</th><th className="p-2">KENDALA</th></tr></thead>
          <tbody>{pageData.map((r,i)=><tr key={i} className="border-b"><td className="p-2">{r.Tanggal}</td><td className="p-2">{r["Node/Pos"]}</td><td className="p-2">{r.LINK}</td><td className="p-2 truncate max-w-">{r.KENDALA}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-2"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Prev</button><button onClick={()=>setPage(p=>p+1)}>Next</button></div>
    </div>
  )
}