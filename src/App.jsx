import { useEffect, useState, useMemo } from "react"
const API_BASE = `${process.env.VITE_BACKEND_URL}/data?gid=${process.env.VITE_GID}`

export default function App(){
  const [allData, setAllData] = useState([])
  const [data, setData] = useState([])
  const [mode, setMode] = useState('all')
  const [loading, setLoading] = useState(true)

  // Fetch semua data sekali aja
  useEffect(()=>{
    setLoading(true)
    fetch(API_BASE).then(r=>r.json()).then(j=>{
      const d = j.data||[]
      setAllData(d)
      setData(d)
      setLoading(false)
    })
  },[])

  // HITUNG 3H+ LOKAL - biar gak tergantung API filter
  const { threeSet, streakMap } = useMemo(()=>{
    const bulan={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11}
    function toDayKey(s){
      const m=s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/)
      if(!m) return null
      return new Date(+m[3],bulan[m[2]]??0,+m[1]).toISOString().slice(0,10)
    }
    const map={}
    allData.forEach(o=>{
      const k=o["Node/Pos"]
      if(!map[k]) map[k]=[]
      const day=toDayKey(o.Tanggal)
      if(day) map[k].push(day)
    })

    const threeSet = new Set()
    const streakMap = {}
    for(const node in map){
      const uniq=[...new Set(map[node])].sort()
      if(uniq.length===0) continue
      let cur=1, max=1
      for(let i=1;i<uniq.length;i++){
        const diff=(new Date(uniq[i])-new Date(uniq[i-1]))/86400000
        if(diff===1) cur++
        else cur=1
        max=Math.max(max,cur)
      }
      streakMap[node]=max
      if(max>=3) threeSet.add(node)
    }
    return { threeSet, streakMap }
  },[allData])

  // Filter data kalau mode 3hari
  useEffect(()=>{
    if(mode==='3hari'){
      setData(allData.filter(r=> threeSet.has(r["Node/Pos"])))
    }else{
      setData(allData)
    }
  },[mode, threeSet, allData])

  return (
    <div style={{minHeight:'100vh', background:'#fef3c7', padding:20}}>
      <div style={{maxWidth:1400, margin:'0 auto', background:'white', borderRadius:12, overflow:'hidden', boxShadow:'0 4px 6px rgba(0,0,0,0.1)'}}>
        <div style={{background:'black', color:'white', padding:16, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h1 style={{fontWeight:'bold'}}>Monitoring ESDM {mode==='3hari'? `- 3H+ (${threeSet.size} Node)` : `- Total ${allData.length}`}</h1>
          <div style={{display:'flex', gap:8}}>
            <button onClick={()=>setMode('all')} style={{padding:'6px 16px', borderRadius:20, background:mode==='all'?'white':'#333', color:mode==='all'?'black':'white', border:'none', cursor:'pointer'}}>Semua</button>
            <button onClick={()=>setMode('3hari')} style={{padding:'6px 16px', borderRadius:20, background:mode==='3hari'?'#dc2626':'#333', color:'white', border:'none', cursor:'pointer'}}>🔥 3H+ ({threeSet.size})</button>
          </div>
        </div>

        <div style={{overflowX:'auto'}}>
          <div style={{minWidth:1000}}>
            <div style={{display:'grid', gridTemplateColumns:'90px 200px 60px 1fr 130px', gap:8, background:'black', color:'white', padding:12, fontWeight:'bold', fontSize:13}}>
              <div>Tanggal</div><div>Node/Pos</div><div>LINK</div><div>KENDALA</div><div>STATUS</div>
            </div>
            {loading? <div style={{padding:40, textAlign:'center'}}>Loading...</div> : data.map((r,i)=>{
              const is3H = threeSet.has(r["Node/Pos"])
              const streak = streakMap[r["Node/Pos"]]||1
              return (
                <div key={i} style={{display:'grid', gridTemplateColumns:'90px 200px 60px 1fr 130px', gap:8, padding:12, fontSize:13, borderBottom:'1px solid #eee', background:is3H?'#fecaca':i%2?'#fef3c7':'#fffbeb'}}>
                  <div>{r.Tanggal}</div>
                  <div style={{fontWeight:'bold'}}>{r["Node/Pos"]}</div>
                  <div><span style={{background:'#d1d5db', padding:'2px 8px', borderRadius:4, fontSize:11}}>Icon</span></div>
                  <div style={{whiteSpace:'pre-wrap'}}>{r.KENDALA}</div>
                  <div>
                    {is3H? <span style={{background:'#dc2626', color:'white', padding:'4px 8px', borderRadius:20, fontSize:11, fontWeight:'bold'}}>🔥 {streak}H+ BERTURUT</span>
                    : streak===2? <span style={{background:'#facc15', padding:'4px 8px', borderRadius:20, fontSize:11}}>2 Hari