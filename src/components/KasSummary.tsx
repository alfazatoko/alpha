import React from 'react';
import { formatRupiah } from '../lib/utils';

export interface KasSummaryProps {
  kasModal: number;
  penjualanDigital: number;
  penjualanAksesoris: number;
  totalAdminFee: number;
  penjualanVoucherTunai?: number;
  
  tarikTunaiNasabah: number;
  
  adminDalamNonTunai?: number;
  transaksiNonTunai: number;
  transaksiKhusus: number;
  
  filter?: 'all' | 'masuk' | 'keluar' | 'lainnya';
}

export const KasSummary: React.FC<KasSummaryProps> = ({
  kasModal,
  penjualanDigital,
  penjualanAksesoris,
  totalAdminFee,
  penjualanVoucherTunai = 0,
  tarikTunaiNasabah,
  adminDalamNonTunai = 0,
  transaksiNonTunai,
  transaksiKhusus,
  filter = 'all'
}) => {
  const totalKasMasuk = kasModal + penjualanDigital + penjualanAksesoris + totalAdminFee + penjualanVoucherTunai;
  const totalKasLainnya = adminDalamNonTunai + transaksiNonTunai + transaksiKhusus;
  const totalSaldoLaci = totalKasMasuk - tarikTunaiNasabah;

  return (
    <div className="space-y-4">
      {/* KAS MASUK SECTION */}
      {(filter === 'all' || filter === 'masuk') && (
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-emerald-50 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <i className="fa-solid fa-arrow-down text-xs"></i>
          </div>
          <div>
            <h4 className="text-[12px] font-black text-emerald-900 uppercase leading-none">KAS MASUK</h4>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Uang masuk laci</p>
          </div>
        </div>

        <div className="space-y-0">
          {[
            { label: 'Modal Tunai Kasir', val: kasModal },
            { label: 'Penjualan Digital', val: penjualanDigital },
            { label: 'Penjualan Aksesoris', val: penjualanAksesoris },
            { label: 'Total Admin Fee', val: totalAdminFee },
            ...(penjualanVoucherTunai > 0 ? [{ label: 'Penjualan Voucher (Tunai)', val: penjualanVoucherTunai }] : [])
          ].map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-1.5 px-2 border-b border-gray-50 last:border-0">
              <p className="text-[10px] font-black text-gray-800 uppercase leading-none">{item.label}</p>
              <span className="text-[11px] font-black text-emerald-600 tabular-nums">{formatRupiah(item.val)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 mt-1 px-2 border-t border-emerald-100">
             <p className="text-[10px] font-black text-emerald-800 uppercase leading-none">TOTAL KAS MASUK</p>
             <span className="text-[12px] font-black text-emerald-700 tabular-nums">{formatRupiah(totalKasMasuk)}</span>
          </div>
        </div>
      </div>
      )}

      {/* KAS LAINNYA SECTION */}
      {(filter === 'all' || filter === 'lainnya') && (
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-orange-50 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <i className="fa-solid fa-layer-group text-xs"></i>
          </div>
          <div>
            <h4 className="text-[12px] font-black text-orange-900 uppercase leading-none">KAS LAIN NYA</h4>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Pemasukan tambahan</p>
          </div>
        </div>

        <div className="space-y-0">
          {[
            { label: 'Admin Dalam/Non Tunai', val: adminDalamNonTunai, show: adminDalamNonTunai > 0 },
            { label: 'Transaksi Khusus', val: transaksiKhusus, show: true },
            { label: 'Transaksi Non Tunai', val: transaksiNonTunai, show: true }
          ].filter(item => item.show).map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-1.5 px-2 border-b border-gray-50 last:border-0">
              <p className="text-[10px] font-black text-gray-800 uppercase leading-none">{item.label}</p>
              <span className="text-[11px] font-black text-orange-600 tabular-nums">{formatRupiah(item.val)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 mt-1 px-2 border-t border-orange-100">
             <p className="text-[10px] font-black text-orange-800 uppercase leading-none">TOTAL KAS LAINNYA</p>
             <span className="text-[12px] font-black text-orange-700 tabular-nums">{formatRupiah(totalKasLainnya)}</span>
          </div>
        </div>
      </div>
      )}

      {/* KAS KELUAR SECTION */}
      {(filter === 'all' || filter === 'keluar') && (
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-red-50 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <i className="fa-solid fa-arrow-up text-xs"></i>
          </div>
          <div>
            <h4 className="text-[12px] font-black text-red-900 uppercase leading-none">KAS KELUAR</h4>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Uang keluar laci</p>
          </div>
        </div>

        <div className="flex justify-between items-center p-2 rounded-xl bg-red-50/30 border border-red-100">
          <div>
            <p className="text-[10px] font-black text-gray-800 uppercase tracking-tight leading-none">Tarik Tunai Nasabah</p>
            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">Penarikan Tunai</p>
          </div>
          <span className="text-[11px] font-black text-red-600 tabular-nums">-{formatRupiah(tarikTunaiNasabah)}</span>
        </div>
      </div>
      )}

      {/* TOTAL FINAL CARD */}
      <div className="bg-[#051c5f] p-4 rounded-2xl text-white shadow-lg relative overflow-hidden border border-blue-400/20 mt-4">
        <div className="relative z-10 text-center">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-300">SALDO LACI KASIR</span>
          <h2 className="text-2xl font-black text-green-400 tracking-tighter mt-0.5 mb-2 drop-shadow-md">
            {formatRupiah(totalSaldoLaci)}
          </h2>
          <div className="pt-2 border-t border-white/10">
            <p className="text-[7px] font-bold text-blue-200/60 uppercase tracking-tighter leading-none italic">
              RUMUS: KAS MASUK - KAS KELUAR
            </p>
            <p className="text-[6px] text-blue-300/40 uppercase mt-1 tracking-widest font-bold">
              *KAS LAINNYA TIDAK MEMPENGARUHI SALDO LACI
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
