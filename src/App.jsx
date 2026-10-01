import { useEffect, useMemo, useState } from 'react';
const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app/api";
const GID = import.meta.env.VITE_GID || "285923348";

const API_URL=`${BACKEND}/api/data`;

export default function App(){
  const [data,setData]=useState([]);
  const [stats,setStats]=useState({});
  const [filter,setFilter]=useState('semua');
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const load=async()=>{
      setLoading(true);
      try{
        const res=await fetch(`${API_URL}?gid=${GID}&filter=${filter}`);
        const j=await res.json();
        setData(j.data||[]); setStats(j);
      }catch(e){console.error(e)}
      setLoading(false);
    }; load();
  },[filter]);

  const filters=[
    {key:'semua', label:'Semua', count: stats.total},
    {key:'1hari', label:'1H', count: stats.total1H},
    {key:'3hari', label:'3H+ MERAH', count: stats.total3H},
    {key:'7hari', label:'7H', count: stats.total7H},
    {key:'30hari', label:'30H', count: stats.total30H},
    {key:'90hari', label:'90H', count: stats.total90H},
    {key:'potongan', label:'Potongan Tgl Awal', count: stats.totalPotongan},
  ];

  const list=useMemo(()=>{
    return data.map(d=>({
      ...d,
      "Node/Pos": String(d["Node/Pos"]||'').replace(/^\s*\d+\.\s*/,'').trim()
    })).filter(d=>{
      if(!search) return true;
      const s=search.toLowerCase();
      return d.Tanggal?.toLowerCase().includes(s) || d["Node/Pos"]?.toLowerCase().includes(s) || d.KENDALA?.toLowerCase().includes(s);
    });
  },[data,search]);

  const is3H=(row)=>{
    if(['3hari','7hari','30hari','90hari'].includes(filter)) return true;
    if(/saat ini/i.test(row.KENDALA) && /Tgl\s*\d{1,2}\/\d{1,2}\/\d{4}/i.test(row.KENDALA)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#fffecc] p-0">
      <div className="bg-black text-white p-3 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="px-3 py-1 rounded-full bg-white text-black text-sm font-bold">Total: {stats.total||0}</span>
          <span className="px-3 py-1 rounded-full bg-green-600 text-white text-sm font-bold">☑ Tidak 3H+ Bagus: {stats.total ? (stats.total - (stats.total3H||0)) : 0}</span>
          <span className="px-3 py-1 rounded-full bg-red-600 text-white text-sm font-bold">🔥 Total 3H+ Protes: {stats.total3H||0} baris / {stats.count3hari||0} Node</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f=>(
            <button key={f.key} onClick={()=>setFilter(f.key)}
              className={`px-3 py-1 rounded-full text-sm border ${filter===f.key?'bg-white text-black':'bg-[#333] text-white hover:bg-[#444]'}`}>
              {f.label} ({f.count||0})
            </button>
          ))}
        </div>
      </div>

      <div className="p-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari Pos PGA / RFO / km..." className="w-full px-3 py-2 border rounded-lg text-sm mb-2"/>
        {loading? <div className="text-center py-10">Loading...</div> :
          <div className="bg-white rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-black text-white">
                <tr><th className="p-2 text-left">Tanggal</th><th className="p-2 text-left">Node/Pos</th><th className="p-2 text-left">LINK</th><th className="p-2 text-left">KENDALA (tanpa 1. & tanpa Node)</th><th className="p-2 text-left">STATUS</th></tr>
              </thead>
              <tbody>
                {list.map((row,i)=>{
                  const merah=is3H(row);
                  return (
                    <tr key={i} className={`${i%2===0?'bg-[#ffff99]':'bg-white'} border-l-4 ${merah?'border-red-600':'border-green-600'}`}>
                      <td className="p-2 whitespace-nowrap align-top">{row.Tanggal}</td>
                      <td className="p-2 font-bold align-top">{row["Node/Pos"]}</td>
                      <td className="p-2 align-top">{row.LINK}</td>
                      <td className="p-2 whitespace-pre-wrap align-top">{row.KENDALA}</td>
                      <td className="p-2 align-top">{merah? <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs">🔥 3H+</span> : <span className="px-2 py-1 rounded-full bg-green-600 text-white text-xs">☑ Bagus</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  )
}