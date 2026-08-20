/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Bell, 
  Database, 
  CreditCard, 
  Info, 
  ShieldAlert, 
  CheckCircle, 
  Calendar, 
  Activity, 
  History, 
  Users, 
  ChevronRight, 
  ChevronDown, 
  Upload, 
  Download,
  Award
} from 'lucide-react';
import type { Cashier, ShiftHandover, Transaction, VoucherProduct, UserRole } from '../types';

interface ProfileTabProps {
  activeCashier: Cashier;
  nextCashier: Cashier;
  shiftHandovers: ShiftHandover[];
  transactions: Transaction[];
  products: VoucherProduct[];
  userRole: UserRole;
  onOpenHandoverModal: () => void;
  onSeedDemoData: () => void;
  onClearAllData: () => void;
  onImportBackup: (importedData: any) => void;
}

export default function ProfileTab({
  activeCashier,
  nextCashier,
  shiftHandovers,
  transactions,
  products,
  userRole,
  onOpenHandoverModal,
  onSeedDemoData,
  onClearAllData,
  onImportBackup
}: ProfileTabProps) {
  // Option toggles
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [soundNotif, setSoundNotif] = useState(true);
  
  // Payment methods
  const [qrisActive, setQrisActive] = useState(true);
  const [cashActive, setCashActive] = useState(true);

  // Password modification
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Section expanders for clean mobile feel
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Status message
  const [backupMsg, setBackupMsg] = useState('');

  // Calculate cashier stats
  const activeCashierSales = transactions.filter(
    t => t.type === 'PENJUALAN' && t.cashierName === activeCashier.name
  );
  const totalSalesRevenue = activeCashierSales.reduce((acc, s) => acc + s.amount, 0);
  const totalSalesCount = activeCashierSales.reduce((acc, s) => acc + s.quantity, 0);

  const toggleSection = (sectionName: string) => {
    setExpandedSection(prev => prev === sectionName ? null : sectionName);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;
    setSuccessMsg('Sandi berhasil diperbarui secara aman!');
    setOldPassword('');
    setNewPassword('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDownloadBackup = () => {
    const backupObj = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      products,
      transactions,
      handovers: shiftHandovers,
    };
    
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `voucherku-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupMsg('Cadangan data berhasil diunduh!');
      setTimeout(() => setBackupMsg(''), 4000);
    } catch (err) {
      alert('Gagal membuat file cadangan data.');
    }
  };

  const handleRestoreImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json && json.products) {
          onImportBackup(json);
          setBackupMsg('Cadangan data berhasil dipulihkan!');
          setTimeout(() => setBackupMsg(''), 4000);
        } else {
          alert('Format file cadangan tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file cadangan JSON.');
      }
    };
    fileReader.readAsText(files[0]);
  };

  return (
    <div className="space-y-4 pb-8" id="profile-tab-container">
      
      {/* Profil Header Card */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 relative overflow-hidden flex items-center gap-4 shadow-xl" id="profile-header-card">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Profile Avatar */}
        <div className="relative shrink-0">
          <img 
            src={activeCashier.avatar} 
            alt={activeCashier.name} 
            className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/30 shadow-lg"
          />
          <span className="absolute bottom-0 right-0 bg-emerald-500 border-2 border-slate-950 w-4 h-4 rounded-full flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75" />
          </span>
        </div>

        {/* Profile details */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-black text-slate-900 dark:text-white truncate">{activeCashier.name}</h3>
          <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-semibold uppercase tracking-wider mt-0.5">{activeCashier.role}</p>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">{activeCashier.email}</p>
        </div>
      </div>

      {/* Keamanan section */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <button 
          onClick={() => toggleSection('security')}
          className="w-full flex justify-between items-center p-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-white/2 transition"
        >
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Keamanan (Password & 2FA)
          </span>
          {expandedSection === 'security' ? <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
        </button>

        {expandedSection === 'security' && (
          <div className="px-4 pb-5 pt-1.5 space-y-4 border-t border-slate-200 dark:border-white/5">
            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-500 font-black dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Password Change form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 tracking-wider">Sandi Lama</label>
                <input 
                  type="password" 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 focus:border-indigo-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none transition"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 tracking-wider">Sandi Baru</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 focus:border-indigo-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none transition"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Ganti Password
              </button>
            </form>

            {/* 2FA Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Autentikasi Dua Faktor (2FA)</p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">Verifikasi SMS untuk keamanan login.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Tim & Peran Standby list */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <button 
          onClick={() => toggleSection('roster')}
          className="w-full flex justify-between items-center p-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-white/2 transition"
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Tim & Peran Kasir Standby
          </span>
          {expandedSection === 'roster' ? <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
        </button>

        {expandedSection === 'roster' && (
          <div className="px-4 pb-5 pt-1.5 space-y-3 border-t border-slate-200 dark:border-white/5">
            {/* Active Cashier */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <img src={activeCashier.avatar} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{activeCashier.name} (Anda)</h4>
                  <p className="text-[9px] text-slate-600 dark:text-slate-400">Sedang Bertugas • Shift Aktif</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-emerald-500 font-black dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Bertugas
              </span>
            </div>

            {/* Standby Cashier */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-3">
                <img src={nextCashier.avatar} className="w-8 h-8 rounded-full object-cover" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{nextCashier.name}</h4>
                  <p className="text-[9px] text-slate-600 dark:text-slate-400">Shift Berikutnya • Standby</p>
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/5">
                Standby
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Laporan Saya section */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <button 
          onClick={() => toggleSection('reports')}
          className="w-full flex justify-between items-center p-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-white/2 transition"
        >
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Laporan Kerja Saya (Shift Ini)
          </span>
          {expandedSection === 'reports' ? <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
        </button>

        {expandedSection === 'reports' && (
          <div className="px-4 pb-5 pt-1.5 space-y-4 border-t border-slate-200 dark:border-white/5">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 p-3 rounded-xl space-y-1">
                <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider">Voucher Terjual</span>
                <p className="text-lg font-black text-slate-900 dark:text-white">{totalSalesCount} Pcs</p>
              </div>
              <div className="bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 p-3 rounded-xl space-y-1">
                <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider">Pendapatan Kasir</span>
                <p className="text-lg font-black text-emerald-500 font-black dark:text-emerald-400">Rp {totalSalesRevenue.toLocaleString('id-ID')}</p>
              </div>
            </div>

            <button 
              onClick={onOpenHandoverModal}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-slate-900 dark:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
            >
              Tutup Shift & Serah Terima
            </button>
          </div>
        )}
      </div>

      {/* Pengaturan Aplikasi collapsible block */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-lg">
        <button 
          onClick={() => toggleSection('appSettings')}
          className="w-full flex justify-between items-center p-4 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-white/2 transition"
        >
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Pengaturan Aplikasi
          </span>
          {expandedSection === 'appSettings' ? <ChevronDown className="h-4 w-4 text-slate-600 dark:text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
        </button>

        {expandedSection === 'appSettings' && (
          <div className="px-4 pb-5 pt-1.5 space-y-5 border-t border-slate-200 dark:border-white/5">
            {/* Notifications sub-list */}
            <div className="space-y-3.5">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">Notifikasi & Peringatan</p>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">Notifikasi Push</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={pushNotif} onChange={() => setPushNotif(!pushNotif)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">Suara Alert</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={soundNotif} onChange={() => setSoundNotif(!soundNotif)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* Backup & seed database - Visible only for Owner */}
            {userRole === 'owner' && (
              <div className="space-y-3.5 pt-3.5 border-t border-slate-200 dark:border-white/5">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">Pencadangan Data</p>
                {backupMsg && (
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/25">
                    {backupMsg}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleDownloadBackup}
                    className="flex items-center justify-center gap-1.5 py-2 bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-xl hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Backup JSON
                  </button>
                  <label className="flex items-center justify-center gap-1.5 py-2 bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-xl hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent transition cursor-pointer text-center">
                    <Upload className="h-3.5 w-3.5" /> Restore
                    <input type="file" onChange={handleRestoreImport} accept=".json" className="hidden" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if(confirm('Reset database & gunakan data bawaan?')) {
                        onSeedDemoData();
                        setBackupMsg('🎉 Demo data berhasil dimuat!');
                        setTimeout(() => setBackupMsg(''), 4000);
                      }
                    }}
                    className="flex-1 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Reset & Seed Demo
                  </button>
                  <button 
                    onClick={() => {
                      if(confirm('PENTING: Seluruh data produk dan transaksi akan hilang permanently. Lanjutkan?')) {
                        onClearAllData();
                        setBackupMsg('🚨 Semua data telah dihapus!');
                        setTimeout(() => setBackupMsg(''), 4000);
                      }
                    }}
                    className="flex-1 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-black dark:text-red-400 border border-red-500/20 text-[10px] font-bold rounded-lg transition cursor-pointer"
                  >
                    Clear Database
                  </button>
                </div>
              </div>
            )}

            {/* Payment integrations */}
            <div className="space-y-3.5 pt-3.5 border-t border-slate-200 dark:border-white/5">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" /> Metode Pembayaran (Integrasi)
              </p>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">QRIS Mandiri & BCA</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={qrisActive} onChange={() => setQrisActive(!qrisActive)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300">Uang Tunai (Laci Kasir)</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={cashActive} onChange={() => setCashActive(!cashActive)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-white border-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-white/15 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* About VoucherKu */}
            <div className="p-3.5 bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-extrabold text-slate-700 dark:text-slate-200">Tentang VoucherKu v1.4.0</p>
              <p className="leading-relaxed">Sistem pembukuan stok voucher, SN, dan penutupan shift otomatis terintegrasi real-time. Didesain khusus untuk mobilitas counter pulsa.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
