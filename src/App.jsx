import { useEffect, useMemo, useState } from 'react';
const API = "https://monitoring-node-esdm-api.vercel.app/api/data?gid=285923348"
const MONTHS = {Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, Jun:5, Jul:6, Agu:7, Sep:8, Okt:9, Nov:10, Des:11}
const parseTgl = (s)=>{ try{ const [d,m,y]=s.split(' '); return new Date(Number(y), MONTHS[m]??8, Number(d)) }catch{return new Date()} }

export default function App(){
  const [data,setData]=useState([])
  const [q,setQ]=useState("")
  const [link,setLink]=useState("Semua")
  const [period,setPeriod]=useState("Semua")
  const [page,setPage]=useState(0)

  useEffect(()=>{ fetch(API).then(r=>r.json()).then(j=>setData(j.data||[])) },[])

  const filtered = useMemo(()=>{
    const now=Date.now()
    return data.filter(d=>{
      const diff=(now-parseTgl(d.Tanggal).getTime())/86400000
      return (!q||d["Node/Pos"].toLowerCase().includes(q.toLowerCase())) &&
             (link==="Semua"||d.LINK===link) &&
             (period==="Semua"||(period==="1H"&&diff<=1)||(period==="7H"&&diff<=7)||(period==="30H"&&diff<=30)||(period==="90H"&&diff<=90))
    })
  },[data,q,link,period])

  const pageData = filtered.slice(page*50,(page+1)*50)
  const btn = (active)=>({padding:'12px 16px',borderRadius:12,border:'2px solid #000',background:active?'#000':'#fff',color:active?'#fff':'#000',cursor:'pointer',fontWeight:'bold'})

  return(
    <div style={{minHeight:'100vh',background:'#f1f5f9',padding:20,fontFamily:'sans-serif'}}>
      <h1 style={{fontSize:26,fontWeight:800}}>Rekap Laporan Harian 2026 - Monitoring ICON & DTP</h1>
      <div style={{fontSize:12,color:'#64748b',marginBottom:12}}>Total: {data.length} | Filtered: {filtered.length} | Terbaru: {data[0]?.Tanggal} | Page {page+1} dari {Math.ceil(filtered.length/50)}</div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:16}}>
        <div style={{background:'#fff',padding:16,borderRadius:12,boxShadow:'0 1px 3px #0002'}}><div style={{fontSize:11}}>TOTAL</div><div style={{fontSize:24,fontWeight:800}}>{data.length}</div></div>
        {["1H","7H","30H","90H","Semua"].map(p=>(
          <button key={p} onClick={()=>{setPeriod(p);setPage(0)}} style={btn(period===p)}>{p}<br/>{p==="Semua"?filtered.length:data.filter(d=> (Date.now()-parseTgl(d.Tanggal).getTime())/86400000 <= (p==="1H"?1:p==="7H"?7:p==="30H"?30:90)).length}</button>
        ))}
      </div>

      <div style={{background:'#fff',padding:10,borderRadius:12,display:'flex',gap:8,marginBottom:10}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari Node/Pos" style={{flex:1,border:'1px solid #ccc',padding:'8px 12px',borderRadius:8}}/>
        <select value={link} onChange={e=>setLink(e.target.value)} style={{border:'1px solid #ccc',padding:8,borderRadius:8}}><option>Semua</option><option>Icon</option><option>DTP</option></select>
      </div>

      <div style={{background:'#fff',borderRadius:12,overflow:'auto',boxShadow:'0 1px 3px #0002'}}>
        <table style={{width:'100%',fontSize:14,borderCollapse:'collapse'}}>
          <thead style={{background:'#000',color:'#fff'}}><tr><th style={{padding:10,textAlign:'left'}}>Tanggal</th><th style={{padding:10,textAlign:'left'}}>Node/Pos</th><th style={{padding:10}}>LINK</th><th style={{padding:10,textAlign:'left'}}>KENDALA</th></tr></thead>
          <tbody>{pageData.map((r,i)=><tr key={i} style={{borderBottom:'1px solid #eee'}}><td style={{padding:10}}>{r.Tanggal}</td><td style={{padding:10,fontWeight:600}}>{r["Node/Pos"]}</td><td style={{padding:10,textAlign:'center'}}>{r.LINK}</td><td style={{padding:10,maxWidth:400}}>{r.KENDALA}</td></tr>)}</tbody>
        </table>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',marginTop:10}}><span>{page*50+1}-{Math.min((page+1)*50,filtered.length)} dari {filtered.length}</span><span style={{display:'flex',gap:8}}><button disabled={page===0} onClick={()=>setPage(p=>p-1)} style={{padding:'6px 12px'}}>Prev</button><button disabled={(page+1)*50>=filtered.length} onClick={()=>setPage(p=>p+1)} style={{padding:'6px 12px'}}>Next</button></span></div>
    </div>
  )
}