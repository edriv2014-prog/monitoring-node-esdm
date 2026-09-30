import { useEffect, useMemo, useState } from "react"
const API_BASE = `${process.env.VITE_BACKEND_URL}/data?gid=${process.env.VITE_GID}`

export default function App(){
  const [allData, setAllData] = useState([])
  const [threeData, setThreeData] = useState([]) // cuma yang 3H+ beneran
  const [data, setData] = useState([])
  const [mode, setMode] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    setLoading(true)
    // fetch 2x: semua + yang 3H+ doang dari API yang di image_fc7402.png
    Promise.all([
      fetch(API_BASE).then(r=>r.json()),
      fetch(API_BASE + "&filter=3hari").then(r=>r.json())
    ]).then(([allJson, threeJson])=>{
      setAllData(allJson.data||[])
      setThreeData(threeJson.data||[])
      setData(allJson.data||[])
      setLoading(false)
    })
  },[])

  const threeSet = useMemo(()=>{
    const set=new Set()
    threeData.forEach(r=> set.add(r["Node/Pos"]))
    return set
  },[threeData])

  useEffect(()=>{
    if(mode==='3hari') setData(threeData)
    else setData(allData)
  },[mode, allData, threeData])

  return (
    <div style={{minHeight:'100vh', background:'#fef3c7', padding:20}}>
      <div style={{maxWidth:1400, margin:'0 auto', background:'white', borderRadius:12, overflow:'hidden'}}>
        <div style={{background:'black', color:'white', padding:16, display:'flex', justifyContent:'space-between'}}>
          <b>Monitoring ESDM - {mode==='3hari'? `3H+ (${threeData.length} baris / ${threeSet.size} Node)`: `Total ${allData.length}`}</b>
          <div style={{display:'flex', gap:8}}>
            <button onClick={()=>setMode('all')} style={{padding:'6px 16px', borderRadius:20, background:mode==='all'?'white':'#333', color:mode==='all'?'black':'white', border:'none', cursor:'pointer'}}>Semua</button>
            <button onClick={()=>setMode('3hari')} style={{padding:'6px 16px', borderRadius:20, background:mode==='3hari'?'#dc2626':'#333', color:'white', border:'none', cursor:'pointer'}}>🔥 3H+ ({threeSet.size})</button>
          </div>
        </div>
        <div style={{minWidth:900}}>
          <div style={{display:'grid', gridTemplateColumns:'90px 200px 60px 1fr 120px', gap:8, background:'black', color:'white', padding:12, fontWeight:'bold', fontSize:13}}> <div>Tanggal</div><div>Node/Pos</div><div>LINK</div><div>KENDALA</div><div>STATUS</div> </div>
          {loading? <div style={{padding:40, textAlign:'center'}}>Loading...</div> : data.map((r,i)=>{
            const is3H = mode==='3hari' // kalau mode 3H+, semua yang ditampilin udah pasti 3H+
            return (
              <div key={i} style={{display:'grid', gridTemplateColumns:'90px 200px 60px 1fr 120px', gap:8, padding:12, fontSize:13, borderBottom:'1px solid #eee', background: is3H? '#fecaca' : i%2? '#ffffff' : '#fef9c3' }}>
                <div>{r.Tanggal}</div><div style={{fontWeight:'bold'}}>{r["Node/Pos"]}</div><div><span style={{background:'#ddd', padding:'2px 8px', borderRadius:4, fontSize:11}}>Icon</span></div><div style={{whiteSpace:'pre-wrap'}}>{r.KENDALA}</div>
                <div>{is3H || threeSet.has(r["Node/Pos"])? <span style={{background:'#dc2626', color:'white', padding:'4px 8px', borderRadius:20, fontSize:11, fontWeight:'bold'}}>🔥 3H+</span> : <span style={{color:'#999', fontSize:11}}>-</span>}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}