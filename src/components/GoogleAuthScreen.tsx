import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

export const GoogleAuthScreen: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Email wajib diisi')
      return
    }
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Format email tidak valid')
      return
    }
    if (!password) {
      setError('Password wajib diisi')
      return
    }

    try {
      setLoadingEmail(true)
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      })

      if (authError) {
        if (authError.message.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Email atau password salah. Silakan periksa kembali.')
        }
        if (authError.message.toLowerCase().includes('email not confirmed')) {
          throw new Error('Email belum dikonfirmasi di inbox Anda.')
        }
        throw authError
      }

      // Sesi otomatis ditangani oleh onAuthStateChange di App.tsx
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan email')
    } finally {
      setLoadingEmail(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true)
      setError('')
      const redirectTo = Capacitor.isNativePlatform() 
        ? 'com.alfazacell.alpha://login' 
        : window.location.origin;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Capacitor.isNativePlatform(),
        }
      })

      if (error) throw error;

      // Jika di native, buka browser secara manual agar state terjaga
      if (Capacitor.isNativePlatform() && data?.url) {
        await Browser.open({ url: data.url });
      }
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan Google')
    } finally {
      setLoadingGoogle(false)
    }
  }

  const isLoading = loadingEmail || loadingGoogle

  return (
    <div className="login-screen">
      <div className="login-card max-w-md w-full">
        {/* Logo / Title */}
        <div className="login-header">
          <img src="/logo_icon.png" alt="ALPHA Logo" className="w-16 h-16 object-contain mx-auto mb-3 drop-shadow-xl" />
          <h1 className="login-title">
            ALPHA <span className="login-title-accent">Cloud</span>
          </h1>
          <p className="login-subtitle mb-4">Database Online Tersinkronisasi</p>
        </div>

        {error && (
          <div className="login-error mb-4 flex items-center gap-2 text-left">
            <i className="fa-solid fa-circle-exclamation text-rose-500 shrink-0"></i>
            <span className="text-xs">{error}</span>
          </div>
        )}

        {/* Form Login Email & Password */}
        <form onSubmit={handleEmailLogin} className="space-y-3.5 text-left mb-4">
          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
              Email Akun
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="fa-solid fa-envelope text-xs"></i>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="nama@email.com"
                autoComplete="email"
                disabled={isLoading}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
              Password
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <i className="fa-solid fa-lock text-xs"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Masukkan password"
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-11 py-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                style={{ color: '#000000', WebkitTextFillColor: '#000000' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <i className={showPassword ? 'fa-solid fa-eye-slash text-xs' : 'fa-solid fa-eye text-xs'}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-md shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            style={{ color: '#ffffff' }}
          >
            {loadingEmail ? (
              <i className="fa-solid fa-circle-notch fa-spin text-white"></i>
            ) : (
              <i className="fa-solid fa-right-to-bracket"></i>
            )}
            {loadingEmail ? 'MEMPROSES...' : 'MASUK DENGAN EMAIL'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-slate-200"></div>
          <span className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            atau
          </span>
          <div className="flex-1 border-t border-slate-200"></div>
        </div>

        {/* Submit Google Button */}
        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          type="button"
          className="w-full bg-white border border-slate-200 text-slate-700 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-slate-50 cursor-pointer"
        >
          {loadingGoogle ? (
            <i className="fa-solid fa-circle-notch fa-spin text-blue-600"></i>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          {loadingGoogle ? 'MEMPROSES...' : 'LOGIN DENGAN GOOGLE'}
        </button>

        {/* Info Keamanan Singkat */}
        <p className="text-[10px] text-slate-400 font-medium mt-6 text-center leading-relaxed">
          Akun terlindungi secara terenkripsi via Supabase Cloud Auth
        </p>
      </div>
    </div>
  )
}
