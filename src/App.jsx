import { useState, useEffect, useMemo } from 'react';

const GID = '285923348';
const API_URL = import.meta.env.VITE_API_URL || '/api/data';

export default function App() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('semua');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const filters = [
    { key: 'semua', label: 'Semua', count: stats.total },
    { key: '1hari', label: '1H', count: stats.total1H },
    { key: '3hari', label: '3H+', count: stats.total3H },
    { key: '7hari', label: '7H', count: stats.total7H },
    { key: '30hari', label: '30H', count: stats.total30H },
    { key: '90hari', label: '90H', count: stats.total90H },
    { key: 'potongan', label: 'Potongan Tanggal Awal', count: stats.totalPotongan },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}?gid=${GID}&filter=${filter}`);
        const json = await res.json();
        setData(json.data || []);
        setStats(json);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [filter]);

  const filteredData = useMemo(() => {
    // hapus nourut di frontend juga buat jaga-jaga image_b4aa6c.png
    return data
      .map(d => ({
        ...d,
        "Node/Pos": String(d["Node/Pos"] || '').replace(/^\s*\d+\.\s*/, '').trim(),
      }))
      .filter(d => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          d.Tanggal?.toLowerCase().includes(s) ||
          d["Node/Pos"]?.toLowerCase().includes(s) ||
          d.KENDALA?.toLowerCase().includes(s)
        );
      });
  }, [data, search]);

  const is3HPlus = (item) => {
    // kalau di filter 3H+ 7H 30H 90H sudah pasti merah
    if (['3hari','7hari','30hari','90hari'].includes(filter)) return true;
    // kalau stats bilang ini key 3H+ maka merah
    if (stats.keys3hari?.includes(item._key)) return true;
    // cek Duration Tgl 10/09 - saat ini >2 hari
    if (/Tgl\s*\d{1,2}\/\d{1,2}\/\d{4}.*saat ini/i.test(item.KENDALA)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-xl font-bold mb-3">Monitoring Node ESDM</h1>

      <div className="flex gap-2 flex-wrap mb-3">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm border transition
              ${filter === f.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}
          >
            {f.label} ({f.count ?? 0})
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari tanggal / node / RFO..."
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
        />
        <div className="px-3 py-2 bg-white border rounded-lg text-sm">
          Total: {filteredData.length}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="p-2 whitespace-nowrap">Tanggal</th>
                  <th className="p-2">Node / Pos</th>
                  <th className="p-2">Link</th>
                  <th className="p-2">KENDALA / RFO</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => {
                  const merah = is3HPlus(row);
                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-yellow-50' : 'bg-white'}>
                      <td className="p-2 whitespace-nowrap align-top">{row.Tanggal}</td>
                      <td className="p-2 font-semibold align-top">
                        {row["Node/Pos"]}
                      </td>
                      <td className="p-2 align-top">{row.LINK || 'Icon'}</td>
                      <td className="p-2 align-top whitespace-pre-wrap">
                        {row.KENDALA}
                      </td>
                      <td className="p-2 align-top">
                        {merah ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded