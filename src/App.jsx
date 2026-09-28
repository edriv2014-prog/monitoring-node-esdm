"use client"
import { useEffect, useState, useMemo } from 'react'

const API = "https://monitoring-node-esdm-api.vercel.app/api/data?gid=285923348"

type Laporan = {
  Tanggal: string
  "Node/Pos": string
  LINK: "Icon" | "DTP" | string
  KENDALA: string
  Durasi: string
  Status?: string
}

const MONTHS: Record<string, number> = {
  Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, Jun:5, Jul:6, Agu:7, Sep:8, Okt:9, Nov:10, Des:11,
  Januari:0, Februari:1, Maret:2, April:3, Juni:5, Juli:6, Agustus:7, September:8, Oktober:9, November:10, Desember:11
}

function parseTgl(str:string): Date | null {
  try {
    const [d,m,y] = str.split(' ')
    if(!d||!m||!y) return null
    const month = MONTHS[m]?? MONTHS[m.slice(0,3)]?? 0
    return new Date(Number(y), month, Number(d))
  } catch { return null }
}

export default function App() {
  const [data,setData] = useState<Laporan[]>([])
  const [loading,setLoading] = useState(true)
  const [q,setQ] = useState("")
  const [link,setLink] = useState("Semua")
  const [period,setPeriod] = useState<"1H"|"7H"|"30H"|"90H"|"Semua">("Semua")
  const [page,setPage] = useState(0)
  const PER_PAGE = 50

  useEffect(()=>{
    const controller = new AbortController()
    const timer = setTimeout(()=>controller.abort(), 4500)
    fetch(API, {signal: controller.signal})
     .then(r=>r.json()).then(j=>{
        setData((j.data || j) as Laporan[])
        setLoading(false)
      }).catch(()=>setLoading(false))
    return ()=>clearTimeout(timer)
  },[])

  const filtered = useMemo(()=>{
    const now = new Date()
    return data.filter(d=>{
      const matchQ =!q || d["Node/Pos"].toLowerCase().includes(q.toLowerCase()) || d.KENDALA.toLowerCase().includes(q.toLowerCase())
      const matchLink = link==="Semua" || d.LINK===link
      let matchPeriod = true
      if(period!=="Semua"){
        const dt = parseTgl(d.Tanggal)
        if(!dt) matchPeriod=false
        else {
          const diff = (now.getTime() - dt.getTime())/(1000*60*60*24)
          if(period==="1H") matchPeriod = diff <=1
          if(period==="7H") matchPeriod = diff <=7
          if(period==="30H") matchPeriod = diff <=30
          if(period==="90H") matchPeriod = diff <=90
        }
      }
      return matchQ && matchLink && matchPeriod
    })
  },[data,q,link,period])

  useEffect(()=>setPage(0),[q,link,period])

  const pageData = filtered.slice(page*PER_PAGE, (page+1)*PER_PAGE)
  const totalPages = Math.ceil(filtered.length/PER_PAGE)
  const count = (f:(d:Laporan)=>boolean) => filtered.filter(f).length

  if(loading) return <div className="p-10 text-center">Loading {data.length} laporan...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold">Rekap Laporan Harian 2026 - Monitoring ICON & DTP</h1>
        <p className="text-xs text-slate-500 mb-4">Total: {data.length} | Filtered: {filtered.length} | Terbaru: {data[0]?.Tanggal} | 28 Sep kosong karena belum ada di Sheet</p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          {[
            {label:"Total", val:data.length, p:"Semua" as const},
            {label:"1 Hari", val:count(d=>{const dt=parseTgl(d.Tanggal); return dt? (Date.now()-dt.getTime())/86400000<=1:false}), p:"1H" as const},
            {label:"7 Hari", val:count(d=>{const dt=parseTgl(d.Tanggal); return dt? (Date.now()-dt.getTime())/86400000<=7:false}), p:"7H" as const},
            {label:"30 Hari", val:count(d=>{const dt=parseTgl(d.Tanggal); return dt? (Date.now()-dt.getTime())/86400000<=30:false}), p:"30H" as const},
            {label:"90 Hari", val:count(d=>{const dt=parseTgl(d.Tanggal); return dt? (Date.now()-dt.getTime())/86400000<=90:false}), p:"90H" as const},
            {label:"Semua", val:filtered.length, p:"Semua" as const},
          ].map(k=>(
            <button key={k.label} onClick={()=>setPeriod(k.p)} className={`p-4 rounded-xl shadow text-left border-2 ${period===k.p?'border-slate-900 bg-white':'border-transparent bg-white'}`}>
              <div className="text-xs text-slate-500">{k.label}</div>
              <div className