import { useEffect, useState } from 'react'

const API = 'https://monitoring-node-esdm-api.vercel.app/api/data'

export default function App(){
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [menu,setMenu]=useState('icon')
  const [data,setData]=useState([])
  const [loading,setLoading]=useState(false)

  // Cek login dari localStorage
  useEffect(()=>{
    const saved = localStorage.getItem('esdm_user')
    if(saved) setUser(JSON.parse(saved))
  },[])

  // Fetch data kalau sudah login
  useEffect(()=>{
    if(!user) return
    setLoading(true)
    const m = menu==='icon'?0:1
    fetch(`${API}?menu=${m}&t=${Date.now()}`)
     .then(r=>r.json())
     .then(j=>{ setData(j.data||[]); setLoading(false) })
     .catch(()=>setLoading(false))
  },[menu, user])

  const handleLogin = (e) =>{
    e.preventDefault()
    // LOGIN SIMPLE - ganti sesuai login kamu sebelumnya
    if(username && password){
      const u = { name: username, loginAt: new Date().toISOString() }
      localStorage.setItem('esdm_user', JSON.stringify(u))
      setUser(u)
    } else {
      alert('Isi username & password')
    }
  }

  const handleLogout = () =>{
    localStorage.removeItem('esdm_user')
    setUser(null)
    setData([])
  }

  // === HALAMAN LOGIN ===
  if(!user){
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-2">Monitoring Node</h1>
          <p className="text-center text-gray-500 text-sm mb-6">ESDM - Login</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Username</label>
              <input 
                value={username} 
                onChange={e=>setUsername(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input 
                type="password"
                value={password} 
                onChange={e=>setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700">
              Login
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-4">Icon = Pusdatin 14 jam | DTP = Tekmira 3 jam</p>
        </div>
      </div>
    )
  }

  // === HALAMAN DASHBOARD (SETELAH LOGIN) ===
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Monitoring Node ESDM - {user.name}</h1>
        <button onClick={handleLogout} className="text-sm px-3 py-1 bg-red-100 text-red-600 rounded-lg">Logout</button>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={()=>setMenu('icon')} className={`px-4 py-2 rounded-lg font-medium ${menu==='icon'?'bg-blue-600 text-white':'bg-white border'}`}>Icon (Pusdatin)</button>
        <button onClick={()=>setMenu('dtp')} className={`px-4 py-2 rounded-lg font-medium ${menu==='dtp'?'bg-green-600 text-white':'bg-white border'}`}>DTP (Tekmira)</button>
      </div>

      {loading && <p>Loading {menu}...</p>}
      {!loading && data.length===0 && <p className="text-gray-500">Tidak ada data outage - semua Normal</p>}

      <div className="grid gap-3">
        {data.map((d,i)=>(
          <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex justify-between">
              <span className="font-bold">{d["Node/Pos"]}</span>
              <span className={`text-xs px-2 py-1 rounded ${menu==='icon'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700'}`}>{d.Tanggal}</span>
            </div>
            <div className="mt-2 text-sm">
              <div><b>Duration :</b> {d.Duration}</div>
              <div className="text-gray-600"><b>RFO :</b> {d.RFO}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}