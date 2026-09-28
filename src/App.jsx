import { useEffect, useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://monitoring-node-esdm-api.vercel.app'
const GID = '285923348'

export default function App(){
  const [rawData, setRawData] = useState([])

  useEffect(()=>{
    fetch(`${BACKEND_URL}/api/data?gid=${GID}`)
     .then(r=>r.json())
     .then(j=>{
        console.log('BACKEND BARU:', j.data[0]); // cek di console
        setRawData(j.data)
      })
  }, [])

  return (
    <div style={{padding:20}}>
      <h2>Laporan ESDM - Total {rawData.length}</h2>
      <table style={{width:'100%', color:'black', background:'white'}}>
        <thead><tr><th>Tanggal</th><th>Node/Pos</th><th>LINK</th><th>KENDALA</th><th>Durasi</th></tr></thead>
        <tbody>
          {rawData.map((r,i)=>(
            <tr key={i} style={{borderBottom:'1px solid #eee'}}>
              <td>{r.Tanggal}</td>
              <td><b>{r['Node/Pos']}</b></td>
              <td>{r.LINK}</td>
              <td>{r.KENDALA}</td>
              <td>{r.Durasi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}