import { useEffect, useState } from "react";
const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app/api";
const GID = import.meta.env.VITE_GID || "285923348";
const API_BASE = `${BACKEND}/data?gid=${GID}`;

export default function App(){
  const [mode,setMode]=useState('all')
  const [loading,setLoading]=useState(true)
  const [allData,setAllData]=useState([])
  const [threeData,setThreeData]=useState([])
  const [total,setTotal]=useState(0)
  const [total3H,setTotal3H]=useState(0)
  const [nodes3hari,setNodes3hari]=useState([])
  const [keys3H,setKeys3H]=useState(new Set()) // INI YANG HILANG!

  useEffect(()=>{
    Promise.all([
      fetch(API_BASE).then(r=>r.json()),
      fetch(API_BASE+"&filter=3hari").then(r=>r.json())
    ]).then(([jAll,j3])=>{
      setAllData(jAll.data||[])
      setTotal(jAll.total||0)
      setThreeData(j3.data||[])
      setNodes3hari(j3.nodes3hari||[])
      setTotal3H(j3.total3H||j3.count||0)
      setKeys3H(new Set(j3.keys3hari||[])) // pakai keys, bukan nodes
      setLoading(false)
    }).catch(()=>setLoading(false))
  },[])

  const totalTidak3H = total - total3H
  const data = mode==='3hari'? threeData : allData

  // cek 3H+ pakai keys3hari yang dari backend (per PROSES bukan per NODE)
  const isRow3H = (r)=>{
    // buat key yang sama kayak backend: Tanggal||Node||prosesKey
    return keys3H.has(r._key) || [...keys3H].some(k=> k.includes(r["Node/Pos"]) && k.includes(r.Tanggal))
  }

  return (
    <div style={{minHeight:'100vh', background:'#fef3c7', padding:20}}>
      <div style={{maxWidth:1400, margin:'0 auto', background:'white', borderRadius:12, overflow:'hidden'}}>
        <div style={{background:'black', color:'white', padding:14, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8}}>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <span style={{background:'white', color:'black', padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:'bold'}}>Total: {total}</span>
            <span style={{background:'#16a34a', color:'white', padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:'bold'}}>✅ Tidak 3H+ Bagus: {totalTidak3H}</span>
            <span style={{background:'#dc2626', color:'white', padding:'5px 12px', borderRadius:20, fontSize:12, fontWeight:'bold'}}>🔥 Total 3H+ Protes: {total3H} baris / {nodes3hari.length} Node</span>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button onClick={()=>setMode('all')} style={{padding:'6px 14px', borderRadius:20, background:mode==='all'?'white':'#333', color:mode==='all'?'black':'white', border:'none', cursor:'pointer'}}>Semua ({total})</button>
            <button onClick={()=>setMode('3hari')} style={{padding:'6px 14px', borderRadius:20, background:mode==='3hari'?'#dc2626':'#333', color:'white', border:'none', cursor:'pointer'}}>🔥 3H+ MERAH ({total3H})</button>
          </div>
        </div>

        <div style={{minWidth:900, maxHeight:'75vh', overflowY:'auto'}}>
          <div style={{display:'grid', gridTemplateColumns:'110px 200px 60px 1fr 90px', gap:8, background:'black', color:'white', padding:10, fontWeight:'bold', fontSize:12, position:'sticky', top:0}}>
            <div>Tanggal</div><div>Node/Pos</div><div>LINK</div><div>KENDALA (tanpa 1. & tanpa Node)</div><div>STATUS</div>
          </div>
          {loading? <div style={{padding:30, textAlign:'center'}}>Loading...</div> :
            data.map((r,i)=>{
              const merah = mode==='3hari'? true : keys3H.has(r._key)
              return (
                <div key={i} style={{display:'grid', gridTemplateColumns:'110px 200px 60px 1fr 90px', gap:8, padding:10, fontSize:12, borderBottom:'1px solid #eee', background: merah? '#fecaca' : i%2?'#fff':'#fef9c3', borderLeft: merah? '5px solid #dc2626' : '5px solid #16a34a'}}>
                  <div>{r.Tanggal}</div><div style={{fontWeight:'bold'}}>{r["Node/Pos"]}</div><div>{r.LINK}</div>
                  <div style={{whiteSpace:'pre-wrap'}}>{r.KENDALA}</div>
                  <div>{merah? <span style={{background:'#dc2626', color:'white', padding:'4px 10px', borderRadius:20, fontWeight:'bold', fontSize:11}}>🔴 3H+</span> : <span style={{background:'#16a34a', color:'white', padding:'4px 10px', borderRadius:20, fontSize:11}}>✅ Bagus</span>}</div>
                </div>
              )
            })
          }
        </div>
      </div>
    </div>
  )
}