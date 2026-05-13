import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

export const GoogleAuthScreen: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError('')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      })
      if (error) throw error
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        {/* Logo / Title */}
        <div className="login-header">
          <img src="/logo-alpha.png" alt="ALPHA Logo" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-xl" />
          <h1 className="login-title">
            ALPHA <span className="login-title-accent">Cloud</span>
          </h1>
          <p className="login-subtitle mb-6">Database Online Tersinkronisasi</p>
          
          <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-100 mb-6 text-left">
            <h3 className="text-[11px] font-black text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
              <i className="fa-solid fa-shield-check text-blue-600"></i>
              Keamanan Data Prioritas
            </h3>
            <p className="text-[10px] text-blue-600/80 leading-relaxed font-bold">
              Setiap akun Google memiliki ruang penyimpanan (database) yang terisolasi 100%. Data toko Anda tidak akan pernah bisa diakses oleh akun Google lain.
            </p>
          </div>
        </div>

        {error && (
          <div className="login-error mb-4">
            <i className="fa-solid fa-circle-exclamation"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white border border-gray-200 text-gray-700 py-4 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-gray-50"
        >
          {loading ? (
             <i className="fa-solid fa-circle-notch fa-spin text-blue-600"></i>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loading ? 'MEMPROSES...' : 'LOGIN DENGAN GOOGLE'}
        </button>

        {/* Footer */}
        <p className="login-footer mt-8">Secure Login via Supabase Auth</p>
      </div>
    </div>
  )
}
