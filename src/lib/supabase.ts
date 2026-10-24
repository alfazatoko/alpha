import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
})

/**
 * Helper untuk memastikan session Supabase valid dan tidak expired.
 * Otomatis memperbarui session secara hening di latar belakang jika hampir atau sudah expired.
 */
export const ensureValidSupabaseSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) return false

    // Cek apakah token expired atau tersisa kurang dari 2 menit
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
    if (expiresAt > 0 && Date.now() >= expiresAt - 120000) {
      console.log('Supabase session expired/expiring soon, refreshing session silently...')
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError || !refreshData.session) {
        console.warn('Failed to auto-refresh Supabase session:', refreshError?.message || refreshError)
        return false
      }
    }
    return true
  } catch (err) {
    console.warn('ensureValidSupabaseSession catch error:', err)
    return false
  }
}
