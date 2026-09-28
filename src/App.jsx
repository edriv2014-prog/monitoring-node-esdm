
import Papa from 'papaparse'
import { useEffect, useMemo, useState } from 'react'

const SHEET_ID = import.meta.env.VITE_SHEET_ID || '1f83CxoN-7Oqa_F7LwqeJfK8bIrpW0wGJgZAkkcVgbik'
const GID = import.meta.env.VITE_GID || '285923348'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

const RENTANG_OPTIONS = ['1 Hari','7 Hari','30 Hari','90 Hari','Semua']

export default function App(){
  const [rawData, setRawData] = useState([])
  const [rentang, setRentang] = useState('Semua')
  const [acuan, setAcuan] = useState('2026-09-01')
  const [filterNode, setFilterNode] = useState('Semua')
  const [filterLink, setFilterLink] = useState('Semua')
  const [filterKendala, setFilterKendala] = useState('Semua')

  useEffect(()=>{
    // Coba backend dulu, kalau gagal fallback ke Google Sheet langsung
    const fetchData = async () => {
      try {
        if(BACKEND_URL){
          alert(BACKEND_URL);
          const r = await fetch(`${BACKEND_URL}/api/data?gid=${GID}`)
          const j = await r.json()
          if(j.data) { setRawData(j.data); return }
        }
        // fallback CSV export google sheet
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`
        Papa.parse(url, { download:true, header:true, complete: (res)=> setRawData(res.data.filter(r=>r.Tanggal)) })
      } catch(e){ console.error(e) }
    }
    fetchData()
  }, [])

  const options = useMemo(()=>{
    const nodes = [...new Set(rawData.map(r=>r['Node/Pos']).filter(Boolean))]
    const links = [...new Set(rawData.map(r=>r['LINK']).filter(Boolean))]
    const kendalas = [...new Set(rawData.map(r=>r['KENDALA']).filter(Boolean))]
    return { nodes, links, kendalas }
  }, [rawData])

  // FIX UTAMA: SEMUA = SEMUA TANPA ACUAN + SORT TANGGAL DESC
  const filteredSorted = useMemo(()=>{
    let data = [...rawData]

    // 1. Filter RENTANG - JIKA SEMUA SKIP ACUAN
    if(rentang !== 'Semua'){
      const acuanDate = new Date(acuan)
      data = data.filter(row=>{
        const tgl = new Date(row.Tanggal)
        if(isNaN(tgl)) return false
        const diff = (acuanDate - tgl) / (1000*60*60*24)
        if(rentang === '1 Hari') return diff >=0 && diff <=1
        if(rentang === '7 Hari') return diff >=0 && diff <=7
        if(rentang === '30 Hari') return diff >=0 && diff <=30
        if(rentang === '90 Hari') return diff >=0 && diff <=90
        return true
      })
    }
    // kalau rentang === Semua -> tidak filter tanggal sama sekali!

    // 2. Filter Node/Pos
    if(filterNode !== 'Semua'){
      data = data.filter(r=>r['Node/Pos'] === filterNode)
    }
    // 3. Filter LINK
    if(filterLink !== 'Semua'){
      data = data.filter(r=>r['LINK'] === filterLink)
    }
    // 4. Filter KENDALA
    if(filterKendala !== 'Semua'){
      data = data.filter(r=>r['KENDALA'] === filterKendala)
    }

    // 5. SORT BERDASAR TANGGAL DESC (terbaru di atas) - FRONTEND & BACKEND SAMA
    return data.sort((a,b)=> new Date(b.Tanggal) - new Date(a.Tanggal))
  }, [rawData, rentang, acuan, filterNode, filterLink, filterKendala])

  return (
    <div style={{display:'flex', minHeight:'100vh'}}>
      <aside style={{width:240, background:'#0f2a4d', color:'white', padding:20}}>
        <h3>ESDM PUSDATIN</h3>
        <p style={{fontSize:12, opacity:0.7}}>google_shee | GID {GID}</p>
        <div style={{marginTop:20}}>Laporan Gangguan</div>
      </aside>
      <main style={{flex:1, padding:20}}>
        <div style={{background:'white', padding:20, borderRadius:12, marginBottom:20}}>
          <h3>FILTER MONITORING</h3>
          <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
            <div>RENTANG</div>
            {RENTANG_OPTIONS.map(o=>(
              <button key={o} onClick={()=>setRentang(o)} style={{padding:'8px 14px', borderRadius:20, border:'1px solid #ccc', background: rentang===o?'#0f2a4d':'white', color: rentang===o?'white':'black'}}>{o}</button>
            ))}
            {/* FIX: Jika Semua, Acuan di-HIDE. Selain itu ditampilkan */}
            {rentang !== 'Semua' ? (
              <div style={{marginLeft:20}}>
                <label>Acuan </label>
                <input type="date" value={acuan} onChange={e=>setAcuan(e.target.value)} style={{marginLeft:8}}/>
              </div>
            ) : (
              <div style={{marginLeft:20, color:'#0a7d2e', fontSize:12, fontWeight:'bold'}}>Mode Semua - tanpa batas tanggal</div>
            )}
          </div>
          <div style={{display:'flex', gap:10, marginTop:15}}>
            <select value={filterNode} onChange={e=>setFilterNode(e.target.value)}><option>Semua</option>{options.nodes.map(n=><option key={n}>{n}</option>)}</select>
            <select value={filterLink} onChange={e=>setFilterLink(e.target.value)}><option>Semua</option>{options.links.map(n=><option key={n}>{n}</option>)}</select>
            <select value={filterKendala} onChange={e=>setFilterKendala(e.target.value)}><option>Semua</option>{options.kendalas.map(n=><option key={n}>{n}</option>)}</select>
          </div>
        </div>

        <div style={{background:'white', borderRadius:12, overflow:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead><tr style={{textAlign:'left', borderBottom:'2px solid #eee'}}><th style={{padding:12}}>Tanggal</th><th>Node/Pos</th><th>LINK</th><th>KENDALA</th><th>Durasi</th></tr></thead>
            <tbody>
              {filteredSorted.map((r,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f0f0f0'}}><td style={{padding:12}}>{r.Tanggal}</td><td><b>{r['Node/Pos']}</b></td><td>{r.LINK}</td><td>{r.KENDALA}</td><td>{r.Durasi}</td></tr>
              ))}
            </tbody>
          </table>
          <div style={{padding:12, fontSize:12, opacity:0.6}}>Total: {filteredSorted.length} | Sorted DESC by Tanggal | {rentang==='Semua' ? 'Tanpa Acuan' : `Acuan ${acuan}`}</div>
        </div>
      </main>
    </div>
  )
}
