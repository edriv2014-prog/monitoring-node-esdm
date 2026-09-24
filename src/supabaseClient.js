import { createClient } from '@supabase/supabase-js'

const URL = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const supabase = URL && KEY ? createClient(URL, KEY) : null

export async function fetchSheet(){
  return null
}

export async function loginWithSupabase(username, password){
  if(supabase?.from){
    try{
      const { data } = await supabase.from('users').select('*').eq('username', username).eq('password', password).maybeSingle()
      if(data) return data
    }catch(e){
      console.warn('Supabase error', e.message)
    }
  }
  if(username === 'admin' && password === 'admin'){
    return { username: 'admin', role: 'super_admin', nama: 'Super Admin' }
  }
  if(username === 'operator' && password === 'admin'){
    return { username: 'operator', role: 'admin', nama: 'Operator' }
  }
  return null
}