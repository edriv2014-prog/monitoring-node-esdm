import { useEffect, useMemo, useState } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://monitoring-node-esdm-api.vercel.app/api";
const GID = import.meta.env.VITE_GID || "285923348";

const API_URL=`${BACKEND}/api/data`;


const bulan = { Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, May:4, Jun:5, Jul:6, Agu:7, Aug:7, Sep:8, Okt:9, Oct:9, Nov:10, Des:11, Dec:11 };

const toDay = (s) => {
  if (!s) return null;
  const m = s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (!m) return null;
  return new Date(+m[3], bulan[m[2]]?? 0, +m[1]).toISOString().slice(0, 10);
};
const parseTgl = (s) => {
  const m = s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  return m? new Date(+m[3], bulan[m[2]]?? 0, +m[1]) : new Date(0);
};

export default function App() {
  const [raw, setRaw] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('semua');
  const [patokan, setPatokan] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}?gid=${GID}&filter=semua`);
        const j = await res.json();
        const data = (j.data || []).map(d => ({
         ...d,
          "Node/Pos": String(d["Node/Pos"] || '').replace(/^\s*\d+\.\s*/, '').trim()
        }));
        setRaw(data);
        setStats(j);
        const days = [...new Set(data.map(d => toDay(d.Tanggal)).filter(Boolean))].sort().reverse();
        if (days[0]) setPatokan(days[0]);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, []);

  const allDays = useMemo(() => {
    return [...new Set(raw.map(d => toDay(d.Tanggal)).filter(Boolean))].sort().reverse();
  }, [raw]);

  const filtered = useMemo(() => {
    let arr = [...raw];
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter(d =>
        d.Tanggal?.toLowerCase().includes(s) ||
        d["Node/Pos"]?.toLowerCase().includes(s) ||
        d.KENDALA?.toLowerCase().includes(s)
      );
    }

    if (filter === 'patokan') {
      const map = {};
      arr.forEach(o => {
        if (!map[o._prosesKey]) map[o._prosesKey] = o;
      });
      arr = Object.values(map).sort((a, b) => parseTgl(b.Tanggal) - parseTgl(a.Tanggal));
    }

    if (filter === '1hari' && patokan) {
      arr = arr.filter(o => toDay(o.Tanggal) === patokan);
    }

    if (filter === '7hari' && patokan) {
      const start = new Date(patokan);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      arr = arr.filter(o => {
        const d = toDay(o.Tanggal);
        if (!d) return false;
        const dt = new Date(d);
        return dt >= start && dt <= end;
      });
    }

    if (filter === '30hari' && patokan) {
      const start = new Date(patokan);
      const end = new Date(start);
      end.setDate(start.getDate() + 29);
      arr = arr.filter(o => {
        const d = toDay(o.Tanggal);
        if (!d) return false;
        const dt = new Date(d);
        return dt >= start && dt <= end;
      });
    }

    if (filter === '90hari' && patokan) {
      const start = new Date(patokan);
      const end = new Date(start);
      end.setDate(start.getDate() + 89);
      arr = arr.filter(o => {
        const d = toDay(o.Tanggal);
        if (!d) return false;
        const dt = new Date(d);
        return dt >= start && dt <= end;
      });
    }

    if (filter === '3hari') {
      arr = arr.filter(o => o.is3HPlus);
    }

    if (filter!== 'patokan') {
      arr = arr.sort((a, b) => parseTgl(b.Tanggal) - parseTgl(a.Tanggal));
    }

    return arr;
  }, [raw, filter, patokan, search]);

  const judul =
    filter === '1hari'? `Laporan Harian (1H) - ${patokan}` :
    filter === '7hari'? `Laporan Mingguan - 7 Hari dari ${patokan}` :
    filter === '30hari'? `Laporan 30 Hari dari ${patokan}` :
    filter === '90hari'? `Laporan 90 Hari dari ${patokan}` :
    filter === '3hari'? `3H+ Kendala 3 Hari Berturut2` :
    filter === 'patokan'? `Patokan Tanggal Awal` :
    `Semua Laporan`;

  return (
    <div className="min-h-screen bg-[#fffecc] p-0">
      <div className="bg-black text-white p-3 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="px-3 py-1 rounded-full bg-white text-black text-sm font-bold">Total: {raw.length}</span>
          <span className="px-3 py-1 rounded-full bg-green-600 text-white text-sm font-bold">☑ Bagus: {raw.length - (stats.total3H || 0)}</span>
          <span className="px-3 py-1 rounded-full bg-red-600 text-white text-sm font-bold">🔥 3H+ Kendala 3 Hari Berturut2: {stats.total3H || 0} baris / {stats.count3hari || 0} Node</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs">Patokan:</span>
          <input type="date" value={patokan} onChange={e => setPatokan(e.target.value)} className="text-black px-2 py-1 rounded text-sm" />
          <select value={patokan} onChange={e => setPatokan(e.target.value)} className="text-black px-2 py-1 rounded text-sm max-w-">
            {allDays.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-black text-white px-3 py-2 font-bold text-base">{judul} {loading? '(Loading...)' : `(${filtered.length})`}</div>

      <div className="p-2 flex flex-wrap gap-1 bg-black">
        {[
          { k: 'semua', l: `Semua (${raw.length})` },
          { k: 'patokan', l: `Patokan Tanggal Awal (${stats.totalPotongan || stats.totalPatokan || 0})` },
          { k: '1hari', l: `Laporan Harian (1H)` },
          { k: '7hari', l: `Laporan Mingguan (7H)` },
          { k: '30hari', l: `Laporan 30 Hari` },
          { k: '90hari', l: `Laporan 90 Hari` },
          { k: '3hari', l: `3H+ Kendala 3 Hari Berturut2 (${stats.total3H || 0})` },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`px-3 py-1 border rounded text-sm ${filter === f.k? 'bg-white text-black' : 'bg-[#333] text-white hover:bg-[#444]'}`}>{f.l}</button>
        ))}
      </div>

      <div className="p-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari Pos PGA / RFO / km..." className="w-full px-3 py-2 border rounded-lg text-sm mb-2" />
        <div className="text- mb-2">Patokan: {patokan} | Filter: {filter} | Hasil: {filtered.length} | 1H = laporan 1 hari dari patokan, 7H = laporan 7 hari dari patokan</div>

        {loading? <div className="text-center py-10">Loading...</div> :
          <div className="bg-white rounded overflow-auto max-h-">
            <table className="w-full text-sm">
              <thead className="bg-black text-white sticky top-0">
                <tr>
                  <th className="p-2 text-left">Tanggal</th>
                  <th className="p-2 text-left">Node/Pos</th>
                  <th className="p-2 text-left">LINK</th>
                  <th className="p-2 text-left">KENDALA (tanpa 1. & tanpa Node)</th>
                  <th className="p-2 text-left">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={i} className={`${i % 2 === 0? 'bg-[#ffff99]' : 'bg-white'} border-l-4 ${row.is3HPlus? 'border-red-600' : 'border-green-600'}`}>
                    <td className="p-2 align-top whitespace-nowrap">{row.Tanggal}</td>
                    <td className="p-2 align-top font-bold">{row["Node/Pos"]}</td>
                    <td className="p-2 align-top">{row.LINK}</td>
                    <td className="p-2 align-top whitespace-pre-wrap">{row.KENDALA}</td>
                    <td className="p-2 align-top">{row.is3HPlus? <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs">🔥 3H+ MERAH</span> : <span className="px-2 py-1 rounded-full bg-green-600 text-white text-xs">☑ Bagus</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  );
}



const GID='285923348';
const API_URL=`${BACKEND}/api/data`;
const bulan={Jan:0,Feb:1,Mar:2,Apr:3,Mei:4,May:4,Jun:5,Jul:6,Agu:7,Aug:7,Sep:8,Okt:9,Oct:9,Nov:10,Des:11,Dec:11};
const toDay=(s)=>{const m=s.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/); return m? new Date(+m[3],bulan[m[2]]??0,+m[1]).toISOString().slice(0,10): null;};

export default function App(){
  const [raw,setRaw]=useState([]); // semua 1345
  const [stats,setStats]=useState({});
  const [filter,setFilter]=useState('semua');
  const [patokan,setPatokan]=useState(''); // ISO 2026-01-02
  const [search,setSearch]=useState('');

  useEffect(()=>{
    fetch(`${API_URL}?gid=${GID}&filter=semua`).then(r=>r.json()).then(j=>{
      setRaw(j.data||[]); setStats(j);
      // default patokan = tanggal terbaru dari Potongan
      if(j.data && j.data.length){
        const days=[...new Set(j.data.map(d=>toDay(d.Tanggal)).filter(Boolean))].sort().reverse();
        if(days[0]) setPatokan(days[0]);
      }
    });
  },[]);

  const filtered = useMemo(()=>{
    let arr=[...raw];
    // filter search dulu
    if(search){
      const s=search.toLowerCase();
      arr=arr.filter(d=> d.Tanggal.toLowerCase().includes(s) || d["Node/Pos"].toLowerCase().includes(s) || d.KENDALA.toLowerCase().includes(s));
    }
    // Potongan Tgl Awal = 487 unik
    if(filter==='potongan'){
      const map={}; arr.forEach(o=>{ if(!map[o._prosesKey]) map[o._prosesKey]=o; });
      arr=Object.values(map);
    }
    // 1H = LAPORAN 1 HARI dari patokan
    if(filter==='1hari' && patokan){
      arr=arr.filter(o=> toDay(o.Tanggal)===patokan);
    }
    // 7H = LAPORAN 7 HARI dari patokan
    if(filter==='7hari' && patokan){
      const start=new Date(patokan); const end=new Date(start); end.setDate(start.getDate()+6);
      arr=arr.filter(o=>{ const d=toDay(o.Tanggal); if(!d) return false; const dt=new Date(d); return dt>=start && dt<=end; });
    }
    if(filter==='30hari' && patokan){
      const start=new Date(patokan); const end=new Date(start); end.setDate(start.getDate()+29);
      arr=arr.filter(o=>{ const d=toDay(o.Tanggal); if(!d) return false; const dt=new Date(d); return dt>=start && dt<=end; });
    }
    if(filter==='90hari' && patokan){
      const start=new Date(patokan); const end=new Date(start); end.setDate(start.getDate()+89);
      arr=arr.filter(o=>{ const d=toDay(o.Tanggal); if(!d) return false; const dt=new Date(d); return dt>=start && dt<=end; });
    }
    // 3H+ MERAH tetap = kendala >3 hari (flag dari API)
    if(filter==='3hari'){
      arr=arr.filter(o=>o.is3HPlus);
    }
    return arr;
  },[raw,filter,patokan,search]);

  const allDays = useMemo(()=>[...new Set(raw.map(d=>toDay(d.Tanggal)).filter(Boolean))].sort().reverse(),[raw]);

  return (
    <div className="min-h-screen bg-[#fffecc] p-0">
      <div className="bg-black text-white p-2 flex flex-wrap gap-2 items-center">
        <span className="px-3 py-1 rounded-full bg-white text-black text-sm">Total: {raw.length}</span>
        <span className="px-3 py-1 rounded-full bg-green-600 text-white text-sm">Bagus: {raw.length-(stats.total3H||0)}</span>
        <span className="px-3 py-1 rounded-full bg-red-600 text-white text-sm">3H+ Protes: {stats.total3H||0} baris / {stats.count3hari||0} Node</span>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs">Patokan Tgl Awal:</span>
          <input type="date" value={patokan} onChange={e=>setPatokan(e.target.value)} className="text-black px-2 py-1 rounded text-sm"/>
          <select value={patokan} onChange={e=>setPatokan(e.target.value)} className="text-black px-2 py-1 rounded text-sm">
            {allDays.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="p-2 flex flex-wrap gap-1">
        {[
          {k:'semua', l:`Semua (${raw.length})`},
          {k:'potongan', l:`Potongan Tgl Awal (${stats.totalPotongan||0})`},
          {k:'1hari', l:`1H (${filter==='1hari'? filtered.length : 'pilih patokan'})`},
          {k:'7hari', l:`7H (${filter==='7hari'? filtered.length : 0})`},
          {k:'30hari', l:`30H (${filter==='30hari'? filtered.length : 0})`},
          {k:'90hari', l:`90H (${filter==='90hari'? filtered.length : 0})`},
          {k:'3hari', l:`3H+ MERAH (${stats.total3H||0})`},
        ].map(f=>(
          <button key={f.k} onClick={()=>setFilter(f.k)} className={`px-3 py-1 border rounded text-sm ${filter===f.k?'bg-black text-white':'bg-white'}`}>{f.l}</button>
        ))}
      </div>

      <div className="p-2">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari Pos PGA / RFO / km..." className="w-full px-3 py-2 border rounded text-sm mb-2"/>
        <div className="text-xs mb-1">Filter: {filter} | Patokan: {patokan} | Hasil: {filtered.length} | Maksud 1H = laporan 1 hari dari {patokan}, 7H = laporan seminggu dari {patokan}</div>
        <div className="bg-white rounded overflow-auto max-h-">
          <table className="w-full text-sm">
            <thead className="bg-black text-white sticky top-0"><tr><th className="p-2 text-left">Tanggal</th><th className="p-2 text-left">Node/Pos</th><th className="p-2 text-left">LINK</th><th className="p-2 text-left">KENDALA (tanpa 1. & tanpa Node)</th><th className="p-2 text-left">STATUS</th></tr></thead>
            <tbody>
              {filtered.map((row,i)=>(
                <tr key={i} className={`${i%2===0?'bg-[#ffff99]':'bg-white'} border-l-4 ${row.is3HPlus?'border-red-600':'border-green-600'}`}>
                  <td className="p-2 align-top whitespace-nowrap">{row.Tanggal}</td>
                  <td className="p-2 align-top font-bold">{row["Node/Pos"]}</td>
                  <td className="p-2 align-top">{row.LINK}</td>
                  <td className="p-2 align-top whitespace-pre-wrap">{row.KENDALA}</td>
                  <td className="p-2 align-top">{row.is3HPlus? <span className="px-2 py-1 rounded-full bg-red-600 text-white text-xs">🔥 3H+ MERAH</span> : <span className="px-2 py-1 rounded-full bg-green-600 text-white text-xs">☑ Bagus</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}