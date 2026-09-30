import { useEffect, useState } from "react";
const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app/api";
const GID = import.meta.env.VITE_GID || "285923348";
const API_BASE = `${BACKEND}/data?gid=${GID}`;
alert(API_BASE);
export default function App(){
  const [allData, setAllData] = useState([])
  const [threeData, setThreeData] = useState([])
  const [nodes3hari, setNodes3hari] = useState([])
  const [total, setTotal] = useState(0)
  const [total3H, setTotal3H] = useState(0)
  const [mode, setMode] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    Promise.all([
      fetch(API_BASE).then(r=>r.json()),
      fetch(API_BASE+"&filter=3hari").then(r=>r.json())
    ]).then(([jAll, j3])=>{
      setAllData(jAll.data||[])
      setTotal(jAll.total||0)
      setThreeData(j3.data||[])
      setNodes3hari(j3.nodes3hari||[])
      setTotal3H(j3.count||0)
      setLoading(false)
    }).catch(()=>setLoading(false))
  },[])

  const totalTidak3H = total - total3H;
  const data = mode==='3hari'? threeData : allData

  return (
    <div style={{minHeight:'100vh', background:'#fef3c7', padding:20}}>
      <div style={{maxWidth:1400, margin:'0 auto', background:'white', borderRadius:12, overflow:'hidden'}}>
        <div style={{background:'black', color:'white', padding:14, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10}}>
          <div style={{display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
            <span style={{background:'white', color:'black', padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:'bold'}}>Total: {total}</span>
            <span style={{background:'#16a34a', color:'white', padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:'bold'}}>✅ Tidak 3H+ Bagus: {totalTidak3H} baris</span>
            <span style={{background:'#dc2626', color:'white', padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:'bold'}}>🔥 Total 3H+ Protes: {total3H} baris / {nodes3hari.length} Node</span>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button onClick={()=>setMode('all')} style={{padding:'6px 14px', borderRadius:20, background:mode==='all'?'white':'#333', color:mode==='all'?'black':'white', border:'none', cursor:'pointer', fontSize:12}}>Semua ({total})</button>
            <button onClick={()=>setMode('3hari')} style={{padding:'6px 14px', borderRadius:20, background:mode==='3hari'?'#dc2626':'#333', color:'white', border:'none', cursor:'pointer', fontSize:12}}>🔥 3H+ ({total3H})</button>
          </div>
        </div>
        <div style={{padding:'8px 16px', background:'#f0fdf4', fontSize:12, borderBottom:'1px solid #bbf7d0'}}>
          <b>Laporan ESDM:</b> {totalTidak3H} baris (1000 lebih) = H & 2H berturut → Vendor bagus ✅ | {total3H} baris = 3H+ berturut → Vendor perlu perbaikan 🔥
        </div>
        <div style={{minWidth:900, maxHeight:'75vh', overflowY:'auto'}}>
          <div style={{display:'grid', gridTemplateColumns:'110px 200px 60px 1fr 90px', gap:8, background:'black', color:'white', padding:10, fontWeight:'bold', fontSize:12, position:'sticky', top:0}}>
            <div>Tanggal</div><div>Node/Pos</div><div>LINK</div><div>KENDALA</div><div>STATUS</div>
          </div>
          {loading? <div style={{padding:30, textAlign:'center'}}>Loading Total {total}...</div>
          : data.map((r,i)=>(
            <div key={i} style={{display:'grid', gridTemplateColumns:'110px 200px 60px 1fr 90px', gap:8, padding:10, fontSize:12, borderBottom:'1px solid #eee', background: mode==='3hari'? '#fecaca' : i%2?'#fff':'#fef9c3'}}>
              <div>{r.Tanggal}</div><div style={{fontWeight:'bold'}}>{r["Node/Pos"]}</div><div>{r.LINK}</div><div style={{whiteSpace:'pre-wrap'}}>{r.KENDALA}</div>
              <div>{mode==='3hari'? <span style={{background:'#dc2626', color:'white', padding:'3px 8px', borderRadius:12}}>🔥 3H+</span> : nodes3hari.includes(r["Node/Pos"])? <span style={{background:'#fbbf24', padding:'3px 8px', borderRadius:12}}>3H+</span> : <span style={{color:'#16a34a', fontWeight:'bold'}}>✅ Bagus</span>}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}