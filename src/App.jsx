import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'https://monitoring-node-esdm-api.vercel.app/api/data'

export default function App() {
  const [menu, setMenu] = useState('icon') // 'icon' atau 'dtp'
  const [raw, setRaw] = useState([])
  const [loading, setLoading] = useState(false)

  // user dari auth kamu
  const user = true // ganti pakai auth kamu

  useEffect(() => {
    if (!user) return
    setLoading(true)

    // FIX: Kirim menu=0 untuk Icon, menu=1 untuk DTP
    // Backend yang bakal mapping ke gid=0 dan gid=285923348
    const menuParam = menu === 'icon' ? 0 : 1

    // HAPUS alert yang di SS kamu
    // alert(`${API_URL}?gid=${menu==='icon'?0:1}`) <- JANGAN ADA LAGI

    fetch(`${API_URL}?menu=${menuParam}&t=${Date.now()}`)
      .then(r => r.json())
      .then(j => {
        // FILTER FRONTEND JUGA: Detail Outage tidak null
        let data = j.data || []
        // Hanya yang Duration ada isinya
        data = data.filter(d => d.Duration && d.Duration !== '-' && d.Duration.toLowerCase() !== 'null')
        setRaw(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

  }, [menu])

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setMenu('icon')}
          className={`px-4 py-2 rounded ${menu==='icon'?'bg-blue-600 text-white':'bg-gray-200'}`}
        >
          Icon (Pusdatin)
        </button>
        <button 
          onClick={() => setMenu('dtp')}
          className={`px-4 py-2 rounded ${menu==='dtp'?'bg-green-600 text-white':'bg-gray-200'}`}
        >
          DTP (Tekmira)
        </button>
      </div>

      {loading && <p>Loading {menu}...</p>}

      <div className="grid gap-2">
        {raw.map((d, i) => (
          <div key={i} className="border p-3 rounded bg-white shadow-sm">
            <div className="font-bold">{d.Tanggal} - {d["Node/Pos"]}</div>
            {/* Ini yang kemarin KOSONG, sekarang ada */}
            <div className="text-sm">Duration : {d.Duration}</div>
            <div className="text-sm text-gray-600">RFO : {d.RFO}</div>
            <div className="text-xs">Kendala: {d.Kendala}</div>
          </div>
        ))}
        {raw.length === 0 && !loading && <p>Tidak ada data Detail Outage (yang null sudah difilter)</p>}
      </div>
    </div>
  )
}
const API_URL = import.meta.env.VITE_API_URL || 'https://monitoring-node-esdm-api.vercel.app/api/data'

export default function App() {
  const [menu, setMenu] = useState('icon') // 'icon' atau 'dtp'
  const [raw, setRaw] = useState([])
  const [loading, setLoading] = useState(false)

  // user dari auth kamu
  const user = true // ganti pakai auth kamu

  useEffect(() => {
    if (!user) return
    setLoading(true)

    // FIX: Kirim menu=0 untuk Icon, menu=1 untuk DTP
    // Backend yang bakal mapping ke gid=0 dan gid=285923348
    const menuParam = menu === 'icon' ? 0 : 1

    // HAPUS alert yang di SS kamu
    // alert(`${API_URL}?gid=${menu==='icon'?0:1}`) <- JANGAN ADA LAGI

    fetch(`${API_URL}?menu=${menuParam}&t=${Date.now()}`)
      .then(r => r.json())
      .then(j => {
        // FILTER FRONTEND JUGA: Detail Outage tidak null
        let data = j.data || []
        // Hanya yang Duration ada isinya
        data = data.filter(d => d.Duration && d.Duration !== '-' && d.Duration.toLowerCase() !== 'null')
        setRaw(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

  }, [menu])

  return (
    <div className="p-4">
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setMenu('icon')}
          className={`px-4 py-2 rounded ${menu==='icon'?'bg-blue-600 text-white':'bg-gray-200'}`}
        >
          Icon (Pusdatin)
        </button>
        <button 
          onClick={() => setMenu('dtp')}
          className={`px-4 py-2 rounded ${menu==='dtp'?'bg-green-600 text-white':'bg-gray-200'}`}
        >
          DTP (Tekmira)
        </button>
      </div>

      {loading && <p>Loading {menu}...</p>}

      <div className="grid gap-2">
        {raw.map((d, i) => (
          <div key={i} className="border p-3 rounded bg-white shadow-sm">
            <div className="font-bold">{d.Tanggal} - {d["Node/Pos"]}</div>
            {/* Ini yang kemarin KOSONG, sekarang ada */}
            <div className="text-sm">Duration : {d.Duration}</div>
            <div className="text-sm text-gray-600">RFO : {d.RFO}</div>
            <div className="text-xs">Kendala: {d.Kendala}</div>
          </div>
        ))}
        {raw.length === 0 && !loading && <p>Tidak ada data Detail Outage (yang null sudah difilter)</p>}
      </div>
    </div>
  )
}