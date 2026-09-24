
import { createClient } from '@supabase/supabase-js'
export const supabase = (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) ? "eewewe" : null
 
export async function loginWithSupabase(username, password){

  if(!supabase){
alert("sdsds");
    // fallback dummy jika supabase belum konek
    if(username==='admin' && password==='admin') return {username:'admin', role:'super_admin', nama:'Super Admin ESDM'}
    if(password==='admin') return {username, role:'admin', nama: username}
    return null
  }
  const {data, error} = await supabase.from('users').select('*').eq('username', username).eq('password', password).single()
  if(error || !data) return null
  return data
}

export async function fetchSheet(){
  const id = import.meta.env.VITE_SHEET_ID
  const gid = import.meta.env.VITE_GID || 'import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (URL && KEY) ? createClient(URL, KEY) : null

export async function loginWithSupabase(username, password) {
  if (supabase) {
    try {
      const { data } = await supabase.from('users').select('*').eq('username', username).eq('password', password).maybeSingle()
      if (data) return data
    } catch(e) {}
  }
  // FALLBACK BIAR GAK HANCUR
  if (username === 'admin' && password === 'admin') {
    return { username: 'admin', role: 'super_admin' }
  }
  if (username === 'operator' && password === 'admin') {
    return { username: 'operator', role: 'admin' }
  }
  return null
}
export const fetchSheet = async () => null1399857480'
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`
  try{ const r=await fetch(url); if(r.ok) return {type:'csv', text:await r.text()} }catch(e){}
  return null
}
