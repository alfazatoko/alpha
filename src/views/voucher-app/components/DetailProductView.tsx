/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  Info, 
  Clock, 
  X,
  AlertTriangle
} from 'lucide-react';
import type { VoucherProduct, Transaction } from '../types';
import { OPERATOR_STYLES } from '../data';

interface DetailProductViewProps {
  product: VoucherProduct;
  transactions: Transaction[];
  userRole?: 'owner' | 'kasir';
  onBack: () => void;
  onUpdateProduct: (product: VoucherProduct) => void;
  onDelete: (productId: string) => void;
  onAdjustStock: (productId: string, quantity: number, type: 'RESTOCK' | 'PENJUALAN', note: string) => void;
}

export default function DetailProductView({
  product,
  transactions,
  userRole = 'owner',
  onBack,
  onUpdateProduct,
  onDelete,
  onAdjustStock
}: DetailProductViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit form state
  const [formName, setFormName] = useState(product.name);
  const [formOperator, setFormOperator] = useState(product.operator);
  const [formCostPrice, setFormCostPrice] = useState(product.costPrice);
  const [formSellingPrice, setFormSellingPrice] = useState(product.sellingPrice);
  const [formCurrentStock, setFormCurrentStock] = useState(product.currentStock);
  const [formMinStockLevel, setFormMinStockLevel] = useState(product.minStockLevel || 10);

  useEffect(() => {
    setFormName(product.name);
    setFormOperator(product.operator);
    setFormCostPrice(product.costPrice);
    setFormSellingPrice(product.sellingPrice);
    setFormCurrentStock(product.currentStock);
    setFormMinStockLevel(product.minStockLevel || 10);
  }, [product]);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProduct({
      ...product,
      name: formName,
      operator: formOperator as any,
      costPrice: Number(formCostPrice),
      sellingPrice: Number(formSellingPrice),
      currentStock: Number(formCurrentStock),
      minStockLevel: Number(formMinStockLevel),
    });
    setIsEditing(false);
  };

  const handleConfirmDelete = () => {
    onDelete(product.id);
    setShowDeleteConfirm(false);
    onBack();
  };

  // Filter transactions related to this product
  const productTrx = transactions.filter(t => t.productId === product.id);

  // Operator style configuration
  const opStyle = OPERATOR_STYLES[product.operator] || {
    bg: 'from-slate-500/10 to-slate-600/5',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/20',
    logoBg: 'bg-slate-600'
  };

  // Profit calculation
  const profit = Math.max(0, product.sellingPrice - product.costPrice);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-8 space-y-5" id="detail-product-view-container">
      {/* Detail Header Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5" id="detail-nav-header">
        <button 
          onClick={onBack}
          className="p-1.5 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-black tracking-wider text-slate-900 dark:text-white">Detail Produk</span>
        <div className="w-8" />
      </div>

      {/* Main Large Product / Provider Banner Card */}
      <div className={`w-full py-6 px-4 rounded-2xl bg-gradient-to-br ${opStyle.bg} border ${opStyle.border} relative overflow-hidden flex items-center justify-center text-center shadow-lg`} id="detail-main-hero-card">
        {/* Decorative ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent rounded-full blur-2xl pointer-events-none" />
        
        {/* Operator Text Name prominently and perfectly centered */}
        <div className="relative z-10 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-white/10 border border-white/20 backdrop-blur-md shadow-lg flex items-center justify-center">
          <span className="text-2xl sm:text-3xl font-black tracking-widest text-slate-900 dark:text-white uppercase drop-shadow-md leading-none">
            {product.operator}
          </span>
        </div>
      </div>

      {/* Info Produk section with Edit & Delete action buttons on the right */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3" id="info-produk-card">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Info Produk
          </h4>

          {/* Edit and Delete Buttons beside Info Produk */}
          {userRole === 'owner' && (
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsEditing(true)}
                className="p-1.5 px-2.5 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-white/15 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
                title="Edit Produk"
                id="btn-edit-info-produk"
              >
                <Edit3 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Edit</span>
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-1.5 px-2.5 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-rose-500/20 border border-slate-200 dark:border-white/10 hover:border-rose-500/30 rounded-xl text-slate-600 dark:text-slate-300 hover:text-rose-500 font-black dark:text-rose-400 flex items-center gap-1.5 text-xs font-bold transition cursor-pointer"
                title="Hapus Produk"
                id="btn-delete-info-produk"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500 font-black dark:text-rose-400" />
                <span>Hapus</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400">Nama Voucher</span>
            <span className="font-bold text-slate-900 dark:text-white text-right">{product.name}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-600 dark:text-slate-400">Operator</span>
            <span className="font-bold text-slate-900 dark:text-white">{product.operator}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-t border-slate-200 dark:border-white/5">
            <span className="text-slate-600 dark:text-slate-400">Min. Alert Stok</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-300">{product.minStockLevel || 10} Pcs</span>
          </div>
        </div>
      </div>

      {/* Stok Saat Ini (Display Only - No accidental edit buttons) */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-4" id="detail-current-stock-card">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">
            Stok Saat Ini ({product.currentStock} Pcs)
          </h4>
          <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl border ${
            product.currentStock <= (product.minStockLevel || 10)
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-500 font-black dark:text-rose-400' 
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500 font-black dark:text-emerald-400'
          }`}>
            {product.currentStock <= (product.minStockLevel || 10) ? 'Stok Menipis' : 'Stok Aman'}
          </span>
        </div>

        {/* Beautiful wave neon sparkline chart */}
        <div className="h-16 relative bg-indigo-950/25 border border-indigo-500/10 rounded-xl overflow-hidden flex items-end">
          {/* Glowing neon path */}
          <svg className="w-full h-full absolute inset-0 text-cyan-400 opacity-80" viewBox="0 0 100 30" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path 
              d="M 0 25 Q 15 5, 30 18 T 60 10 T 80 22 T 100 15 L 100 30 L 0 30 Z" 
              fill="url(#chart-glow)" 
            />
            <path 
              d="M 0 25 Q 15 5, 30 18 T 60 10 T 80 22 T 100 15" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              className="animate-pulse" 
            />
          </svg>
        </div>
      </div>

      {/* Harga Card Grid */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3.5">
        <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400">Harga</h4>
        <div className={`grid ${userRole === 'owner' ? 'grid-cols-3' : 'grid-cols-1'} gap-2.5`}>
          {userRole === 'owner' && (
            <div className="bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 p-3 rounded-xl space-y-1">
              <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider">Modal</span>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">Rp {product.costPrice.toLocaleString('id-ID')}</p>
            </div>
          )}
          <div className="bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 p-3 rounded-xl space-y-1">
            <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider">Jual</span>
            <p className={`text-xs font-extrabold ${userRole === 'kasir' ? 'text-lg text-emerald-500' : 'text-emerald-500'} font-black dark:text-emerald-400`}>Rp {product.sellingPrice.toLocaleString('id-ID')}</p>
          </div>
          {userRole === 'owner' && (
            <div className="bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 p-3 rounded-xl space-y-1">
              <span className="text-[9px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider">Untung</span>
              <p className="text-xs font-extrabold text-cyan-400">Rp {profit.toLocaleString('id-ID')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Riwayat Stok list */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl p-5 space-y-3.5">
        <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          Riwayat Transaksi Stok
        </h4>
        
        <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
          {productTrx.length === 0 ? (
            <p className="text-xs text-slate-600 dark:text-slate-400 italic py-2 text-center">Belum ada riwayat stok untuk voucher ini.</p>
          ) : (
            productTrx.slice(0, 5).map((trx) => (
              <div 
                key={trx.id}
                className="p-2.5 rounded-xl bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 flex items-start gap-2.5 justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase ${
                      trx.type === 'PENJUALAN' ? 'bg-red-500/15 text-red-500 font-black dark:text-red-400' : 'bg-emerald-500/15 text-emerald-500 font-black dark:text-emerald-400'
                    }`}>
                      {trx.type === 'PENJUALAN' ? 'Keluar' : 'Masuk'}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold truncate">{trx.notes}</span>
                  </div>
                  <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-0.5">Oleh: {trx.cashierName}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-xs font-black ${trx.type === 'PENJUALAN' ? 'text-red-500 font-black dark:text-red-400' : 'text-emerald-500 font-black dark:text-emerald-400'}`}>
                    {trx.type === 'PENJUALAN' ? '-' : '+'}{trx.quantity} Pcs
                  </p>
                  <p className="text-[8px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                    {new Date(trx.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Delete Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-rose-500/30 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative space-y-4"
              id="modal-confirm-delete-product"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 font-black dark:text-rose-400 shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Konfirmasi Hapus</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">Voucher ini akan dihapus dari katalog</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl p-3 text-xs space-y-1">
                <p className="text-slate-600 dark:text-slate-400">Nama Voucher:</p>
                <p className="font-extrabold text-slate-900 dark:text-white">{product.name}</p>
                <div className="flex justify-between pt-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-white/5">
                  <span>Stok saat ini: <strong className="text-slate-900 dark:text-white">{product.currentStock} Pcs</strong></span>
                  <span>Operator: <strong className="text-slate-900 dark:text-white">{product.operator}</strong></span>
                </div>
              </div>

              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                Apakah Anda yakin ingin menghapus voucher ini? Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition shadow-[0_0_15px_rgba(225,29,72,0.4)] cursor-pointer text-xs"
                  id="btn-confirm-delete-action"
                >
                  Hapus Voucher
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal Overlay */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-slate-200 dark:border-white/15 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative"
            >
              <button 
                onClick={() => setIsEditing(false)}
                className="absolute top-5 right-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:bg-white/10 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                Edit Info Voucher
              </h3>

              <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Nama Voucher</label>
                  <input 
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Operator</label>
                  <select
                    value={formOperator}
                    onChange={(e: any) => setFormOperator(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 transition"
                  >
                    {['Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren'].map(op => (
                      <option key={op} value={op} className="bg-white dark:bg-slate-900">{op}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Harga Modal (Rp)</label>
                    <input 
                      type="number"
                      required
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-indigo-600 dark:text-indigo-200 font-bold focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Harga Jual (Rp)</label>
                    <input 
                      type="number"
                      required
                      value={formSellingPrice}
                      onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-emerald-500 font-black dark:text-emerald-400 font-bold focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Stok Saat Ini</label>
                    <input 
                      type="number"
                      required
                      value={formCurrentStock}
                      onChange={(e) => setFormCurrentStock(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Min. Alert Stok</label>
                    <input 
                      type="number"
                      required
                      value={formMinStockLevel}
                      onChange={(e) => setFormMinStockLevel(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2.5 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl transition shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
