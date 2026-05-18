import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env', 'utf-8')
const envConfig = {}
envContent.split('\n').forEach(line => {
  const match = line.trim().match(/^([^=]+)=(.*)$/)
  if (match) envConfig[match[1].trim()] = match[2].trim()
})

const supabaseUrl = envConfig['VITE_SUPABASE_URL']
const supabaseAnonKey = envConfig['VITE_SUPABASE_ANON_KEY']

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTable() {
  console.log('Mengecek koneksi ke Supabase dan tabel absensi...')
  const { data, error } = await supabase.from('absensi').select('*').limit(1)
  
  if (error) {
    console.error('Error:', error)
    process.exit(1)
  } else {
    console.log('Tabel absensi DITEMUKAN! Data:', data)
    process.exit(0)
  }
}

checkTable()
