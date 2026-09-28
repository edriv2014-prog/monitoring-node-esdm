import Papa from 'papaparse'
import { useEffect, useMemo, useState } from 'react'

const SHEET_ID = import.meta.env.VITE_SHEET_ID || '1f83CxoN-7Oqa_F7LwqejfK8bIrpW0wGJgZAkkeVgbik'
const GID = import.meta.env.VITE_GID || '285923348'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://monitoring-node-esdm-api.vercel.app'

const RENTANG_OPTIONS = ['1 Hari','7 Hari','30 Hari','90 Hari','Semua']

// INI KUNCINYA - UBAH DATA SHEET ASLI JADI FORMAT FRONTEND
const normalize = (d) => {
  const rawTanggal = d["Tanggal (Otomatis)"] || d.Tanggal || ''
  const detail = d["Detail Outage"] || ''

  const node = detail.split('\n')[0]?.replace(/^\d+\.\s*/, '').trim() || '-'
  const durasi = detail.match(/Duration\s*:\s*(.*)/i)?.[1] || '-'
  const rfo = detail.match(/RFO\s*:\s*(.*)/i)?.[1] || ''

  // Parse 01 Jan 2026 -> 2026-01-01
  let tglDisplay = rawTanggal
  let tglObj = new Date(rawTanggal)
  if (isNaN(tglObj) && rawTanggal.includes('Jan')) {
     tglObj = new Date(rawTanggal.replace('Jan','January'))
  }

  return {
    Tanggal: tglDisplay, // tampilkan apa adanya "01 Jan 2026"
    TanggalObj: tglObj, // buat sorting
    'Node/Pos': node,
    LINK: d["DTP Backhaul"] || d["Status"] || 'Normal',
    KENDALA: rfo || '-',
    Durasi: durasi,
  }
}

export default function App(){
  const [rawData, setRawData] = useState([])
  const [rentang, setRentang] = useState('Semua')
  const [acuan, setAcuan] = useState('2026-09-01')
  const [filterNode, setFilterNode] = useState('Semua')
  const [filterLink, setFilterLink] = useState('Semua')
  const [filterKendala, setFilterKendala] = useState('Semua')

  useEffect(()=>{
    const fetchData = async () => {
      try {
        if(BACKEND_URL){
          const r = await fetch(`${BACKEND_URL}/api/data?gid=${GID}`)
          const j = await r.json()
          if(j.data) {
            setRawData(j.data.map(normalize));
            return
          }
        }
        // fallback CSV beneran (bukan gviz json)
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`
        Papa.parse(csvUrl, { download:true, header:true, complete: (res)=> {
          setRawData(res.data.filter(r=>r["Tanggal (Otomatis)"] || r.Tanggal).map(normalize))
        }})
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

  const filteredSorted = useMemo(()=>{
    let data = [...rawData]
    if(rentang!== 'Semua'){
      const acuanDate = new Date(acuan)
      data = data.filter(row=>{
        const tgl = new Date(row.Tanggal)
        if(isNaN(tgl)) return true // biar data "01 Jan 2026" tetep muncul
        const diff = (acuanDate - tgl) / (1000*60*60*24)
        if(rentang === '1 Hari') return diff >=0 && diff <=1
        if(rentang === '7 Hari') return diff >=0 && diff <=7
        if(rentang === '30 Hari') return diff >=0 && diff <=30
        if(rentang === '90 Hari') return diff >=0 && diff <=90
        return true
      })
    }
    if(filterNode!== 'Semua') data = data.filter(r=>r['Node/Pos'] === filterNode)
    if(filterLink!== 'Semua') data = data.filter(r=>r['LINK'] === filterLink)
    if(filterKendala!== 'Semua') data = data.filter(r=>r['KENDALA'] === filterKendala)
    return data.sort((a,b)=> new Date(b.Tanggal) - new Date(a.Tanggal))
  }, [rawData, rentang, acuan, filterNode, filterLink, filterKendala])

  return (
    <div style={{display:'flex', minHeight:'100vh', background:'#f3f4f6'}}>
      <aside style={{width:240, background:'#0f2a4d', color:'white', padding:20}}>
        <h3>ESDM PUSDATIN</h3>
        <p style={{fontSize:12, opacity:0.7}}>google_shee | GID {GID}</p>
        <div style={{marginTop:20}}>Laporan Gangguan</div>
      </aside>
      <main style={{flex:1, padding:20, color:'#111827'}}>
        <div style={{background:'white', padding:20, borderRadius:12, marginBottom:20, color:'black'}}>
          <h3 style={{color:'black'}}>FILTER MONITORING</h3>
          <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', color:'black'}}>
            <div>RENTANG</div>
            {RENTANG_OPTIONS.map(o=>(
              <button key={o} onClick={()=>setRentang(o)} style={{padding:'8px 14px', borderRadius:20, border:'1px solid #ccc', background: rentang===o?'#0f2a4d':'white', color: rentang===o?'white':'black'}}>{o}</button>
            ))}
            {rentang!== 'Semua'? (
              <div style={{marginLeft:20}}>
                <label>Acuan </label>
                <input type="date" value={acuan} onChange={e=>setAcuan(e.target.value)} style={{marginLeft:8, color:'black'}}/>
              </div>
            ) : (
              <div style={{marginLeft:20, color:'#0a7d2e', fontSize:12, fontWeight:'bold'}}>Mode Semua - tanpa batas tanggal</div>
            )}
          </div>
          <div style={{display:'flex', gap:10, marginTop:15}}>
            <select value={filterNode} onChange={e=>setFilterNode(e.target.value)} style={{color:'black'}}><option>Semua</option>{options.nodes.map(n=><option key={n}>{n}</option>)}</select>
            <select value={filterLink} onChange={e=>setFilterLink(e.target.value)} style={{color:'black'}}><option>Semua</option>{options.links.map(n=><option key={n}>{n}</option>)}</select>
            <select value={filterKendala} onChange={e=>setFilterKendala(e.target.value)} style={{color:'black'}}><option>Semua</option>{options.kendalas.map(n=><option key={n}>{n}</option>)}</select>
          </div>
        </div>

        <div style={{background:'white', borderRadius:12, overflow:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', color:'black'}}>
            <thead><tr style={{textAlign:'left', borderBottom:'2px solid #eee', color:'black'}}><th style={{padding:12}}>Tanggal</th><th>Node/Pos</th><th>LINK</th><th>KENDALA</th><th>Durasi</th></tr></thead>
            <tbody>
              {filteredSorted.map((r,i)=>(
                <tr key={i} style={{borderBottom:'1px solid #f0f0f0', color:'black'}}><td style={{padding:12, color:'black'}}>{r.Tanggal}</td><td style={{color:'black'}}><b>{r['Node/Pos']}</b></td><td style={{color:'black'}}>{r.LINK}</td><td style={{color:'black'}}>{r.KENDALA}</td><td style={{color:'black'}}>{r.Durasi}</td></tr>
              ))}
            </tbody>
          </table>
          <div style={{padding:12, fontSize:12, color:'#666'}}>Total: {filteredSorted.length} | Sorted DESC by Tanggal | {rentang==='Semua'? 'Tanpa Acuan' : `Acuan ${acuan}`}</div>
        </div>
      </main>
    </div>
  )
}