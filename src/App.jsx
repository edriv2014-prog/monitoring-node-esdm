import { useEffect, useMemo, useState } from 'react'

const API = "https://monitoring-node-esdm-api.vercel.app/api/data?gid=285923348"

export default function App() {
  const [data,setData]=useState([])
  const [loading,setLoading]=useState(true)
  const [q,setQ]=useState("")
  const [link,setLink]=useState("Semua")
  const [tgl,setTgl]=useState("")
  const [page,setPage]=useState(0)
  const PER_PAGE = 50

  useEffect(()=>{
    fetch(API).then(r=>r.json()).then(j=>{
      setData(j.data || j || [])
      setLoading(false)
    })
  },[])

  const filtered = useMemo(()=>{
    return data.filter(d=>{
      const matchQ = (d["Node/Pos"]||"").toLowerCase().includes(q.toLowerCase()) ||
                     (d.KENDALA||"").toLowerCase().includes(q.toLowerCase())
      const matchLink = link==="Semua" || d.LINK===link
      const matchTgl =!tgl || (d.Tanggal||"").toLowerCase().includes(tgl.toLowerCase())
      return matchQ && matchLink && matchTgl
    })
  },[data,q,link,tgl])

  // reset page kalau filter berubah
  useEffect(()=>{ setPage(0) },[q,link,tgl])

  const pageData = filtered.slice(page*PER_PAGE, (page+1)*PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  if(loading) return <div className="p-10 text-center">Loading 900 laporan...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold">Rekap Laporan Harian 2026 - Monitoring ICON & DTP</h1>
        <p className="text-sm text-slate-500 mb-4">Total: {data.length} | Filtered: {filtered.length} | Tanggal terbaru: {data[0]?.Tanggal} | Jika cari 28 Sep 2026 akan kosong karena belum ada di Sheet</p>

        <div className="bg-white p-4 rounded-xl shadow flex flex-wrap gap-3 mb-4">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari Node/Pos / KENDALA..." className="border px-3 py-2 rounded w-64"/>
          <select value={link} onChange={e=>setLink(e.target.value)} className="border px-3 py-2 rounded">
            <option>Semua</option><option>Icon</option><option>DTP</option>
          </select>
          <input value={tgl} onChange={e=>setTgl(e.target.value)} placeholder="Filter tanggal: 21 Sep / 28 Sep" className="border px-3 py-2 rounded w-64"/>
        </div>

        <div className="bg-white rounded-xl shadow overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-white">
              <tr><th className="p-3 text-left">Tanggal</th><th className="p-3 text-left">Node/Pos</th><th className="p-3">LINK</th><th className="p-3 text-left">KENDALA</th><th className="p-3 text-left">Durasi</th></tr>
            </thead>
            <tbody>
              {pageData.length===0? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-500">Belum ada laporan untuk filter ini (contoh: 28 Sep 2026 belum ada di Sheet)</td></tr>
              ) : pageData.map((r,i)=>(
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="p-3 whitespace-nowrap">{r.Tanggal}</td>
                  <td className="p-3 font-medium">{r["Node/Pos"]}</td>
                  <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${r.LINK==='Icon'?'bg-blue-100 text-blue-700':'bg-orange-100 text-orange-700'}`}>{r.LINK}</span></td>
                  <td className="p-3 max-w-md truncate" title={r.KENDALA}>{r.KENDALA}</td>
                  <td className="p-3 whitespace-nowrap">{r.Durasi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center mt-4">
          <div className="text-sm">Menampilkan {page*PER_PAGE+1}-{Math.min((page+1)*PER_PAGE, filtered.length)} dari {filtered.length}</div>
          <div className="flex gap-2">
            <button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 border rounded disabled:opacity-30">Prev</button>
            <span className="px-3 py-1">Page {page+1} / {totalPages || 1}</span>
            <button disabled={page+1>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 border rounded disabled:opacity-30">Next</button>
          </div>
        </div>

      </div>
    </div>
  )
}