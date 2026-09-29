"use client"
import { useEffect, useState } from "react"
type Row = { Tanggal: string; "Node/Pos": string; LINK: string; KENDALA: string }
const API_BASE = "https://monitoring-node-esdm-api.vercel.app/api/data?gid=285923348"

export default function Page(){
  const [data, setData] = useState<Row[]>([])
  const [mode, setMode] = useState<'all'|'3hari'>('3hari') // default 3hari biar kayak image_fc7402.png
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    setLoading(true)
    const url = mode==='3hari'? `${API_BASE}&filter=3hari` : API_BASE
    fetch(url).then(r=>r.json()).then(j=>{
      setData(j.data||[])
      setLoading(false)
    })
  },[mode])

  return (
    <div className="min-h-screen bg-[#fef3c7] p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow overflow-hidden">
        <div className="bg-black text-white p-4 flex justify-between items-center">
          <h1 className="font-bold">Monitoring ESDM {mode==='3hari'? '- 3 Hari Berturut ('+data.length+')' : ''}</h1>
          <div className="flex gap-2">
            <button onClick={()=>setMode('all')} className={`px-4 py-1 rounded-full text-sm ${mode==='all'?'bg-white text-black':'bg-zinc-700'}`}>Semua</button>
            <button onClick={()=>setMode('3hari')} className={`px-4 py-1 rounded-full text-sm ${mode==='3hari'?'bg-red-600 text-white':'bg-zinc-700'}`}>🔥 3 Hari</button>
          </div>
        </div>

        <div className="overflow-auto">
          <div className="min-w-">
            <div className="grid grid-cols-[90px_180px_60px_1fr_130px] gap-2 bg-black text-white p-3 text-sm font-bold">
              <div>Tanggal</div><div>Node/Pos</div><div>LINK</div><div>KENDALA</div><div>STATUS</div>
            </div>
            {loading? <div className="p-10 text-center">Loading...</div> : data.map((r,i)=>(
              <div key={i} className={`grid grid-cols-[90px_180px_60px_1fr_130px] gap-2 p-3 text-sm border-b ${i%2?'bg-amber-100':'bg-amber-50'}`}>
                <div>{r.Tanggal}</div>
                <div className="font-bold">{r["Node/Pos"]}</div>
                <div><span className="bg-zinc-300 px-2 py-0.5 rounded text-xs">Icon</span></div>
                <div className="whitespace-pre-wrap">{r.KENDALA}</div>
                <div>{mode==='3hari'? <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold">🔥 3 HARI</span> : <span className="text-gray-400 text-xs">-</span>}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}