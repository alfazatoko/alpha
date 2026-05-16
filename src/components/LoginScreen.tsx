import React, { useState, useEffect } from 'react'

export interface KasirAccount {
  pin: string
  role: 'owner' | 'kasir'
  name: string
}

export const getDefaultKasirAccounts = (): Record<string, KasirAccount> => ({
  'owner': { pin: '0000', role: 'owner', name: 'Owner' },
  'kasir1': { pin: '1234', role: 'kasir', name: 'Kasir 1' },
  'kasir2': { pin: '5678', role: 'kasir', name: 'Kasir 2' },
})

export const getKasirAccounts = (): Record<string, KasirAccount> => {
  const stored = localStorage.getItem('alphaPro_kasir_list')
  if (stored) {
    try { return JSON.parse(stored) } catch(e) {}
  }
  return getDefaultKasirAccounts()
}

export const saveKasirAccounts = (accounts: Record<string, KasirAccount>) => {
  localStorage.setItem('alphaPro_kasir_list', JSON.stringify(accounts))
}


interface LoginScreenProps {
  onLogin: (username: string, account: KasirAccount) => void
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [selectedUser, setSelectedUser] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isShaking, setIsShaking] = useState(false)
  const [isPinEnabled, setIsPinEnabled] = useState(true)
  const [kasirList, setKasirList] = useState<Record<string, KasirAccount>>({})

  useEffect(() => {
    setKasirList(getKasirAccounts())
  }, [])


  // Check if PIN is enabled from localStorage
  useEffect(() => {
    const enabled = localStorage.getItem('alphaPro_isPinEnabled')
    if (enabled === 'false') {
      setIsPinEnabled(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedUser) {
      setError('Silakan pilih pengguna.')
      triggerShake()
      return
    }

    const account = kasirList[selectedUser]
    if (!account) {
      setError('Akun tidak valid.')
      triggerShake()
      return
    }

    // Only validate PIN if enabled
    if (isPinEnabled) {
      if (!pin) {
        setError('PIN harus diisi.')
        triggerShake()
        return
      }

      if (account.pin !== pin) {
        setError('PIN salah. Coba lagi.')
        setPin('')
        triggerShake()
        return
      }
    }

    // Success
    onLogin(selectedUser, account)
  }

  const triggerShake = () => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }

  return (
    <div className="login-screen">
      <div className={`login-card ${isShaking ? 'shake' : ''}`}>
        {/* Logo / Title */}
        <div className="login-header">
          <img src="/logo_icon.png" alt="ALPHA Logo" className="w-20 h-20 object-contain mx-auto mb-4 drop-shadow-xl" />
          <h1 className="login-title">
            ALPHA <span className="login-title-accent">Pro</span>
          </h1>
          <p className="login-subtitle">Pembukuan Agen brilink & Konter</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* User Select */}
          <div className="login-field">
            <label className="login-label">Pilih Pengguna</label>
            <div className="login-select-wrapper">
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setError('') }}
                className="login-select"
              >
                <option value="" disabled>Pilih Pengguna</option>
                {Object.entries(kasirList).map(([id, acc]) => (
                  <option key={id} value={id}>
                    {acc.role === 'owner' ? `👑 ${acc.name} (Owner)` : `${acc.name} (Kasir)`}
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down login-select-icon"></i>
            </div>
          </div>

          {/* PIN Input (Hidden if PIN is disabled) */}
          {isPinEnabled && (
            <div className="login-field">
              <label className="login-label">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, '')); setError('') }}
                placeholder="Masukkan PIN"
                maxLength={6}
                className="login-input"
                inputMode="numeric"
              />
            </div>
          )}

          {/* PIN Info if disabled */}
          {!isPinEnabled && selectedUser && (
            <p className="text-[10px] text-emerald-600 font-bold text-center mt-1 animate-pulse">
              <i className="fa-solid fa-shield-check mr-1"></i> Mode Tanpa PIN Aktif
            </p>
          )}

          {/* Error Message */}
          {error && (
            <div className="login-error">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" className="login-btn">
            MASUK
          </button>
        </form>

        {/* Footer */}
        <p className="login-footer">ALPHA Pro v1.0</p>
      </div>
    </div>
  )
}

export default LoginScreen
