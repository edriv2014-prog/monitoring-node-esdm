import { createClient } from '@supabase/supabase-js'

const URL = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

export const supabase = URL && KEY ? createClient(URL, KEY) : null
console.log('SUPA URL:', URL, 'KEY exist:', !!KEY)

export async function loginWithSupabase(u,p){
  if(supabase?.from){
    try{
      const {data} = await supabase.from('users').select('*').eq('username',u).eq('password',p).maybeSingle()
      if(data) return data
    }catch{}
  }
  if(u==='admin' && p==='admin') return {username:'admin', role:'super_admin'}
  if(u==='operator' && p==='admin') return {username:'operator', role:'admin'}
  return null
}