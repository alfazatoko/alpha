/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  SlidersHorizontal, 
  ArrowLeft,
  X,
  CheckCircle,
  AlertTriangle,
  LayoutGrid,
  Table2,
  Minus,
  ListPlus,
  Loader2,
  Bot
} from 'lucide-react';
import type { VoucherProduct, UserRole } from '../types';
import { OPERATOR_STYLES } from '../data';
import ProviderLogo from './ProviderLogo';

interface ProductsTabProps {
  products: VoucherProduct[];
  activeCashierName: string;
  userRole: UserRole;
  theme?: 'dark' | 'light';
  onAddProduct: (product: Omit<VoucherProduct, 'id'>) => void;
  onUpdateProduct: (product: VoucherProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onSelectProduct: (product: VoucherProduct) => void;
  onBack?: () => void;
  onOpenQuickSale?: (productId?: string) => void;
}

export default function ProductsTab({
  products,
  activeCashierName,
  userRole,
  theme = 'dark',
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onSelectProduct,
  onBack,
  onOpenQuickSale
}: ProductsTabProps) {
  const isLight = theme === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOperator, setSelectedOperator] = useState<string>('Semua');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  
  // View mode and Shift Tracking State
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  type ShiftItem = { awal: number; akhir: number | ''; qris: number };
  const [shiftTracking, setShiftTracking] = useState<Record<string, ShiftItem>>({});

  // Sync Shift Tracking with products & local storage
  useEffect(() => {
    const saved = localStorage.getItem('v_shift_tracking');
    const initialTracking = saved ? JSON.parse(saved) : {};
    
    let hasChanges = false;
    const nextTracking = { ...initialTracking };
    
    products.forEach(p => {
      if (!nextTracking[p.id]) {
        nextTracking[p.id] = { awal: p.currentStock, akhir: '', qris: 0 };
        hasChanges = true;
      }
    });
    
    setShiftTracking(nextTracking);
    if (hasChanges && !saved) {
      localStorage.setItem('v_shift_tracking', JSON.stringify(nextTracking));
    }
  }, [products]);

  // Auto save to local storage on change
  useEffect(() => {
    if (Object.keys(shiftTracking).length > 0) {
      localStorage.setItem('v_shift_tracking', JSON.stringify(shiftTracking));
    }
  }, [shiftTracking]);

  const handleShiftChange = (id: string, field: keyof ShiftItem, value: any) => {
    setShiftTracking(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };
  
  // Modals / Overlays
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<VoucherProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<VoucherProduct | null>(null);
  const [isAddingBulkAI, setIsAddingBulkAI] = useState(false);
  const [bulkAIText, setBulkAIText] = useState('');
  const [isParsingAI, setIsParsingAI] = useState(false);
  const [bulkParsedProducts, setBulkParsedProducts] = useState<any[]>([]);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Pulsa' | 'Paket Data' | 'Token' | 'Game' | 'PLN'>('Paket Data');
  const [formOperator, setFormOperator] = useState<'Telkomsel' | 'Axis' | 'Indosat' | 'XL' | 'Tri' | 'Smartfren'>('Telkomsel');
  const [formCostPrice, setFormCostPrice] = useState<string>('6.500');
  const [formSellingPrice, setFormSellingPrice] = useState<string>('8.000');
  const [formCurrentStock, setFormCurrentStock] = useState<number>(15);
  const [formMinStockLevel, setFormMinStockLevel] = useState<number>(4);
  const [formDescription, setFormDescription] = useState('');
  const [formBarcode, setFormBarcode] = useState('');

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.includes(searchQuery) ||
                          p.operator.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOperator = selectedOperator === 'Semua' || p.operator === selectedOperator;
    const matchesLowStock = !showLowStockOnly || p.currentStock <= p.minStockLevel;

    return matchesSearch && matchesOperator && matchesLowStock;
  });

  const handleOpenAddForm = () => {
    setFormName('');
    setFormCategory('Paket Data');
    setFormOperator('Telkomsel');
    setFormCostPrice('6.500');
    setFormSellingPrice('8.000');
    setFormCurrentStock(15);
    setFormMinStockLevel(4);
    setFormDescription('Voucher Paket Data Berlaku 1 Hari');
    setFormBarcode(Math.floor(1000000000 + Math.random() * 9000000000).toString());
    setIsAddingNew(true);
  };

  const handleOpenEditForm = (p: VoucherProduct, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent product detail selection
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category as any);
    setFormOperator(p.operator as any);
    setFormCostPrice(p.costPrice.toLocaleString('id-ID'));
    setFormSellingPrice(p.sellingPrice.toLocaleString('id-ID'));
    setFormCurrentStock(p.currentStock);
    setFormMinStockLevel(p.minStockLevel);
    setFormDescription(p.description);
    setFormBarcode(p.barcode);
    setIsEditing(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    onAddProduct({
      name: formName,
      category: formCategory,
      operator: formOperator,
      costPrice: Number(String(formCostPrice).replace(/\D/g, '')),
      sellingPrice: Number(String(formSellingPrice).replace(/\D/g, '')),
      currentStock: Number(formCurrentStock),
      minStockLevel: Number(formMinStockLevel),
      description: formDescription,
      barcode: formBarcode,
      sku: `${formOperator.substring(0,3).toUpperCase()}-${formName.replace(/\s+/g, '-').toUpperCase()}`
    });

    setIsAddingNew(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !formName.trim()) return;

    onUpdateProduct({
      ...editingProduct,
      name: formName,
      category: formCategory,
      operator: formOperator,
      costPrice: Number(String(formCostPrice).replace(/\D/g, '')),
      sellingPrice: Number(String(formSellingPrice).replace(/\D/g, '')),
      currentStock: Number(formCurrentStock),
      minStockLevel: Number(formMinStockLevel),
      description: formDescription,
      barcode: formBarcode
    });

    setIsEditing(false);
    setEditingProduct(null);
  };

  const handleDeleteClick = (p: VoucherProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductToDelete(p);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      onDeleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const handleParseBulk = () => {
    if (!bulkAIText.trim()) return;
    setIsParsingAI(true);
    try {
      const lines = bulkAIText.split('\n').filter(line => line.trim() !== '');
      const parsed = [];
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 5) {
          // Format: Nama Provider, nama produk, harga modal, harga jual, stok voucher, stok alert
          parsed.push({
            operator: parts[0],
            name: parts[1],
            costPrice: parseInt(parts[2].replace(/\D/g, '') || '0', 10),
            sellingPrice: parseInt(parts[3].replace(/\D/g, '') || '0', 10),
            stock: parseInt(parts[4].replace(/\D/g, '') || '0', 10),
            minStockLevel: parts.length > 5 ? parseInt(parts[5].replace(/\D/g, '') || '4', 10) : 4
          });
        }
      }
      setBulkParsedProducts(parsed);
    } catch (e) {
      console.error(e);
      alert('Gagal memproses data. Pastikan format sesuai.');
    } finally {
      setIsParsingAI(false);
    }
  };

  const handleSaveBulk = () => {
    bulkParsedProducts.forEach(p => {
      onAddProduct({
        name: p.name || 'Produk Baru',
        category: 'Paket Data',
        operator: operatorsList.includes(p.operator) ? p.operator : 'Lainnya',
        costPrice: Number(p.costPrice) || 0,
        sellingPrice: Number(p.sellingPrice) || 0,
        currentStock: Number(p.stock) || 0,
        minStockLevel: Number(p.minStockLevel) || 4,
        description: 'Ditambahkan otomatis via massal',
        barcode: Math.floor(1000000000 + Math.random() * 9000000000).toString(),
        sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    });
    setBulkParsedProducts([]);
    setBulkAIText('');
    setIsAddingBulkAI(false);
  };

  // Shift Tracking Helpers
  let totalLaku = 0;
  let totalOmset = 0;

  const operatorsList = ['Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren', 'Lainnya'];
  const OP_COLORS: Record<string, string> = {
    'Telkomsel': 'bg-rose-600 text-slate-900 dark:text-white',
    'Axis': 'bg-purple-600 text-slate-900 dark:text-white',
    'Indosat': 'bg-yellow-500 text-slate-900',
    'XL': 'bg-blue-600 text-slate-900 dark:text-white',
    'Tri': 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-900 dark:text-white',
    'Smartfren': 'bg-pink-600 text-slate-900 dark:text-white'
  };

  function getShortName(name: string, operator: string) {
    let short = name.replace(new RegExp(operator, 'i'), '').trim();
    short = short.replace(/Hari/i, 'H').replace(/Bulan/i, 'B');
    return short;
  }
  
  if (viewMode === 'table') {
    filteredProducts.forEach(p => {
      const shift = shiftTracking[p.id] || { awal: p.currentStock, akhir: '', qris: 0 };
      const awal = shift.awal || 0;
      const akhir = shift.akhir === '' ? awal : Number(shift.akhir);
      const laku = Math.max(0, awal - akhir);
      totalLaku += laku;
      totalOmset += laku * p.sellingPrice;
    });
  }

  return (
    <div className="flex flex-col h-full space-y-3.5 pb-6" id="stok-voucher-container">
      {/* 1. Header Stok Voucher matching Photo 2 */}
      <div className="flex items-center justify-between pt-0.5 pb-1" id="stok-voucher-header">
        <div className="flex items-center gap-3">
          {/* Glassmorphic Back button */}
          <button 
            onClick={onBack}
            className="w-11 h-11 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-xl border border-white/20 flex items-center justify-center text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white transition shadow-sm cursor-pointer"
            title="Kembali ke Beranda"
            id="stok-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h2 className={`text-lg font-black tracking-tight leading-tight ${isLight ? 'text-slate-800' : 'text-slate-900 dark:text-white'}`}>
              Stok Voucher
            </h2>
            <p className={`text-[11px] font-bold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-300/90'}`}>
              Daftar produk voucher yang tersedia
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggles */}
          <div className={`flex rounded-xl p-1 border shadow-inner ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border-slate-200 dark:border-white/10'}`}>
            <button 
              onClick={() => setViewMode('card')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'card' 
                  ? (isLight ? 'bg-white text-cyan-600 shadow-sm border border-slate-200/60 font-bold' : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-sm') 
                  : (isLight ? 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/50' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent')
              }`}
              title="Mode Kartu"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table' 
                  ? (isLight ? 'bg-white text-cyan-600 shadow-sm border border-slate-200/60 font-bold' : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-sm') 
                  : (isLight ? 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-200/50' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent')
              }`}
              title="Mode Tabel & Shift"
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
          {/* Add Actions Group - Visible only for Owner */}
          {userRole === 'owner' && (
            <div className={`flex rounded-2xl p-1 border shadow-inner relative ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border-slate-200 dark:border-white/10'}`}>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-cyan-400/20 rounded-full blur-md pointer-events-none" />
              <button 
                onClick={() => setIsAddingBulkAI(true)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${isLight ? 'hover:bg-amber-100 text-amber-600' : 'hover:bg-amber-500/20 text-amber-500 font-black dark:text-amber-400 hover:text-amber-300'}`}
                title="Tambah Massal"
              >
                <ListPlus className="w-5 h-5" />
              </button>
              <div className={`w-px mx-0.5 my-1.5 ${isLight ? 'bg-slate-200' : 'bg-slate-100 dark:bg-white/10'}`} />
              <button 
                onClick={handleOpenAddForm}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition cursor-pointer ${isLight ? 'hover:bg-cyan-100 text-cyan-600' : 'hover:bg-white/[0.14] text-slate-900 dark:text-white'}`}
                title="Tambah Voucher Baru"
                id="stok-add-btn"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Provider Filter Bar (New Renovated) */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-0.5 px-0.5" id="products-provider-filter">
        {['Semua', 'Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren'].map((op) => {
          const isSelected = selectedOperator === op;
          const opStyle = OPERATOR_STYLES[op] || { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-white/10', logoBg: 'bg-slate-500' };
          
          return (
            <button
              key={op}
              type="button"
              onClick={() => setSelectedOperator(op)}
              className={`flex flex-col items-center gap-3 p-2 rounded-2xl min-w-[62px] transition-all border ${
                isSelected
                  ? `bg-slate-100 dark:bg-white/10 ${opStyle.border} shadow-lg ring-1 ring-white/10 scale-105`
                  : 'bg-white border-slate-200 shadow-sm dark:bg-white/5 dark:border-white/10 hover:border-indigo-400 hover:shadow-md'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl ${opStyle.bg} border ${opStyle.border} flex items-center justify-center overflow-hidden shadow-inner`}>
                {op === 'Semua' ? (
                  <LayoutGrid className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                ) : (
                  <div className={`w-full h-full ${opStyle.logoBg} flex items-center justify-center font-black text-[10px] text-slate-900 dark:text-white uppercase`}>
                    {op.substring(0, 3)}
                  </div>
                )}
              </div>
              <span className={`text-[8px] font-black uppercase tracking-tighter ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                {op}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Search Bar */}
      <div className="flex items-center gap-2" id="stok-search-filter-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari produk voucher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full backdrop-blur-xl border rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none transition shadow-inner ${
              isLight 
                ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-cyan-500' 
                : 'bg-white/[0.07] border-slate-200 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-400/50'
            }`}
            id="stok-search-input"
          />
        </div>

        {/* Filter Button */}
        <button 
          onClick={() => setShowFilterDrawer(!showFilterDrawer)}
          className={`w-11 h-11 rounded-2xl backdrop-blur-xl border flex items-center justify-center transition shadow-sm cursor-pointer ${
            showFilterDrawer || selectedOperator !== 'Semua' || showLowStockOnly 
              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-700 dark:text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]' 
              : 'bg-white/[0.07] border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Filter Kategori & Operator"
          id="stok-filter-toggle-btn"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Quick Chips (Collapsible / Dynamic) */}
      <AnimatePresence>
        {showFilterDrawer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-2 py-1"
          >
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none select-none">
              {['Semua', 'Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren'].map((op) => (
                <button
                  key={op}
                  onClick={() => setSelectedOperator(op)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-bold border whitespace-nowrap transition cursor-pointer ${
                    selectedOperator === op 
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200' 
                      : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {op}
                </button>
              ))}
              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold border whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                  showLowStockOnly 
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300' 
                    : 'bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3 h-3 text-amber-500 font-black dark:text-amber-400" />
                Stok Rendah
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewMode === 'card' ? (
        <div className="space-y-2.5 max-h-[510px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-white/10" id="stok-voucher-card-list">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-600 dark:text-slate-400 text-xs italic bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
              Tidak ada voucher yang cocok dengan pencarian.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isLowStock = p.currentStock <= p.minStockLevel;

              return (
                <div 
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  className={`backdrop-blur-xl border rounded-2xl p-3 shadow-md transition-all duration-200 cursor-pointer relative flex items-center justify-between group select-none ${
                    isLight 
                      ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800' 
                      : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 hover:bg-slate-700 border-slate-200 dark:border-white/5 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Left: Logo */}
                    <ProviderLogo operator={p.operator} category={p.category} size="md" />

                    {/* Middle: Title & Price */}
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <h4 className={`text-[15px] font-bold tracking-tight truncate leading-tight ${isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`}>
                        {p.name}
                      </h4>
                      <div className={`flex items-center gap-3 mt-1.5 text-[11px] font-bold ${isLight ? 'text-slate-600 dark:text-slate-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {userRole === 'owner' && (
                          <>
                            <span>Rp {p.costPrice.toLocaleString('id-ID')}</span>
                            <span className={isLight ? 'text-slate-600 dark:text-slate-300' : 'text-white/20'}>|</span>
                          </>
                        )}
                        <span className={isLight ? 'text-emerald-600 font-extrabold' : 'text-emerald-500 font-black dark:text-emerald-400'}>Rp {p.sellingPrice.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stock Badge (Big number on top, STOK below, red when low stock) */}
                  <div className="flex items-center justify-center shrink-0 pl-2">
                    <div className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center justify-center min-w-[58px] transition-all shadow-sm ${
                      isLowStock 
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 font-black dark:text-rose-400' 
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-black dark:text-emerald-400'
                    }`}>
                      <span className="text-xl sm:text-2xl font-black leading-none tracking-tight">
                        {p.currentStock}
                      </span>
                      <span className="text-[9px] font-black tracking-widest uppercase leading-none mt-1 opacity-90">
                        STOK
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-3 pb-2 pt-1">
          {/* Table Container with scrolling */}
          <div className={`flex-1 overflow-auto rounded-xl border shadow-inner ${isLight ? 'border-slate-200 bg-white scrollbar-thin scrollbar-thumb-slate-300' : 'border-slate-200 dark:border-white/10 bg-white border-slate-200 shadow-sm dark:bg-slate-800 scrollbar-thin scrollbar-thumb-white/10'}`}>
            <table className="w-full text-[10px] text-center border-collapse">
              <thead className="sticky top-0 z-20 shadow-md">
                <tr className={isLight ? 'bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[8px] border-b border-slate-200' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[8px] border-b border-white/20'}>
                  <th className={`py-3 px-3 text-left sticky left-0 z-20 w-[40%] shadow-[2px_0_5px_rgba(0,0,0,0.05)] ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>VOUCHER</th>
                  <th className="py-3 px-1 w-[20%]">STOK</th>
                  <th className="py-3 px-1 w-[20%]">HARGA</th>
                  <th className="py-3 px-2 w-[20%] text-center">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {operatorsList.map(op => {
                  const opProducts = filteredProducts.filter(p => p.operator.toLowerCase().includes(op.toLowerCase()) || (op === 'Lainnya' && !operatorsList.slice(0,6).some(o => p.operator.toLowerCase().includes(o.toLowerCase()))));
                  if (opProducts.length === 0) return null;
                  
                  return (
                    <React.Fragment key={op}>
                      <tr className="bg-white dark:bg-slate-900">
                        <td colSpan={7} className={`py-2 px-3 font-black text-[9px] text-left uppercase tracking-widest sticky left-0 z-10 border-y border-slate-200 dark:border-white/10 ${OP_COLORS[op] || 'bg-slate-700 text-slate-900 dark:text-white'}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-3 bg-white/30 rounded-full" />
                            {op}
                          </div>
                        </td>
                      </tr>
                      {opProducts.map(p => {
                        const shortName = getShortName(p.name, p.operator);
                        const fullPrice = p.sellingPrice.toLocaleString('id-ID');
                        
                        return (
                          <tr key={p.id} className={`transition-colors group border-b ${isLight ? 'hover:bg-slate-50 border-slate-100' : 'hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border-white/[0.05]'}`}>
                            <td className={`py-3 px-3 text-left font-black whitespace-nowrap sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] transition-colors text-[10px] uppercase leading-tight ${
                              isLight 
                                ? 'bg-white text-slate-900 group-hover:bg-slate-50' 
                                : 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-900 dark:text-white group-hover:bg-slate-700'
                            }`}>
                              {shortName}
                            </td>
                            <td className="py-1 px-1">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-900 dark:text-white text-[10px] font-black mx-auto shadow-inner border-2 ${
                                p.currentStock <= p.minStockLevel ? 'bg-rose-500/20 border-rose-500/40' : 'bg-indigo-500/10 border-indigo-500/30'
                              }`}>
                                {p.currentStock}
                              </div>
                            </td>
                            <td className="py-1 px-1 text-emerald-500 font-black dark:text-emerald-400 font-black text-[11px] tracking-tighter">
                              {fullPrice}
                            </td>
                            <td className="py-1 px-2 text-center">
                              <div className="flex items-center justify-center gap-3">
                                {userRole === 'owner' && (<button 
                                  onClick={(e) => handleOpenEditForm(p, e)}
                                  className="w-6 h-6 rounded bg-white/[0.06] hover:bg-white/[0.14] text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>)}
                                {userRole === 'owner' && (
                                  <button 
                                    onClick={(e) => handleDeleteClick(p, e)}
                                    className="w-6 h-6 rounded bg-white/[0.06] hover:bg-rose-500/20 text-rose-300 flex items-center justify-center transition-colors"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onOpenQuickSale && onOpenQuickSale(p.id)}
                                  className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded text-[9px] font-bold transition-colors whitespace-nowrap"
                                >
                                  Jual
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer removed per request */}
        </div>
      )}

      {/* Bulk Add Overlay */}
      <AnimatePresence>
        {isAddingBulkAI && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-amber-500/20 w-full max-w-lg rounded-3xl p-5 shadow-[0_0_50px_rgba(245,158,11,0.1)] relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setIsAddingBulkAI(false)}
                className="absolute top-5 right-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
                Tambah Produk Massal
              </h3>
              
              <div className="space-y-4">
                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent p-3 rounded-xl border border-slate-200 dark:border-white/10">
                  <p className="font-bold text-amber-300">Format Wajib per Baris (pisahkan dengan koma):</p>
                  <p className="font-mono text-slate-900 dark:text-white">Nama Provider, Nama Produk, Harga Modal, Harga Jual, Stok, Stok Alert</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400">Contoh: <br/>Telkomsel, Telkomsel 10GB, 15000, 20000, 10, 4<br/>Axis, Axis 6GB 1Hari, 6500, 8000, 15, 5</p>
                </div>

                <textarea
                  value={bulkAIText}
                  onChange={(e) => setBulkAIText(e.target.value)}
                  placeholder="Paste daftar produk di sini..."
                  className="w-full bg-slate-50 dark:bg-slate-950/60 border border-amber-500/20 rounded-xl px-3 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-amber-400 transition min-h-[120px] font-mono"
                />

                <div className="flex justify-end">
                  <button
                    onClick={handleParseBulk}
                    disabled={!bulkAIText.trim()}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <ListPlus className="w-4 h-4" />
                    Scan & Susun Format
                  </button>
                </div>

                {bulkParsedProducts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    <p className="text-xs font-bold text-amber-300 mb-2">Hasil Susunan ({bulkParsedProducts.length} Produk):</p>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {bulkParsedProducts.map((p, idx) => (
                        <div key={idx} className="bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-white/5 text-[10px]">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{p.name}</span>
                            <span className="text-amber-500 font-black dark:text-amber-400">{p.operator}</span>
                          </div>
                          <div className="flex gap-3 text-slate-600 dark:text-slate-400">
                            <span>Modal: <b className="text-slate-900 dark:text-white">Rp{p.costPrice?.toLocaleString('id-ID')}</b></span>
                            <span>Jual: <b className="text-emerald-500 font-black dark:text-emerald-400">Rp{p.sellingPrice?.toLocaleString('id-ID')}</b></span>
                            <span>Stok: <b className="text-cyan-400">{p.stock}</b></span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setBulkParsedProducts([])}
                        className="flex-1 py-3 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent rounded-xl transition border border-slate-200 dark:border-white/10"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBulk}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 dark:text-white text-xs font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      >
                        Simpan Semua ke Stok
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-rose-500/30 w-full max-w-xs rounded-3xl p-5 shadow-[0_0_50px_rgba(244,63,94,0.1)] relative"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center border border-rose-500/30 mb-2">
                  <AlertTriangle className="w-6 h-6 text-rose-500 font-black dark:text-rose-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Konfirmasi Hapus</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Apakah Anda yakin ingin menghapus voucher <br/>
                  <b className="text-slate-900 dark:text-white">{productToDelete.name}</b> dari sistem?
                </p>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
                
                <div className="flex gap-2 w-full mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => setProductToDelete(null)}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent rounded-xl transition border border-slate-200 dark:border-white/10"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 bg-rose-500 hover:bg-rose-600 text-slate-900 dark:text-white text-xs font-bold py-2.5 rounded-xl transition shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  >
                    Ya, Hapus
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Form Add / Edit Modal Overlay */}
      <AnimatePresence>
        {(isAddingNew || isEditing) && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border-slate-200 shadow-sm dark:bg-slate-800 border border-slate-200 dark:border-white/15 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => {
                  setIsAddingNew(false);
                  setIsEditing(false);
                  setEditingProduct(null);
                }}
                className="absolute top-5 right-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:bg-white/10 transition"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                {isAddingNew ? 'Tambah Voucher Baru' : 'Edit Info Voucher'}
              </h3>

              <form onSubmit={isAddingNew ? handleAddSubmit : handleEditSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Nama Voucher</label>
                  <input 
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Axis 6GB 1Hari"
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
                  {userRole === 'owner' ? (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Harga Modal (Rp)</label>
                      <input 
                        type="text"
                        inputMode="numeric"
                        required
                        value={formCostPrice}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormCostPrice(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-indigo-600 dark:text-indigo-200 font-bold focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1 invisible">
                      {/* Hidden for cashiers */}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Harga Jual (Rp)</label>
                    <input 
                      type="text"
                      inputMode="numeric"
                      required
                      value={formSellingPrice}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setFormSellingPrice(val ? parseInt(val, 10).toLocaleString('id-ID') : '');
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-emerald-500 font-black dark:text-emerald-400 font-bold focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Stok Awal</label>
                    <input 
                      type="number"
                      required
                      value={formCurrentStock}
                      onChange={(e) => setFormCurrentStock(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">Min. Alert Stok</label>
                    <input 
                      type="number"
                      required
                      value={formMinStockLevel}
                      onChange={(e) => setFormMinStockLevel(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setIsEditing(false);
                      setEditingProduct(null);
                    }}
                    className="flex-1 py-2.5 bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black rounded-xl transition cursor-pointer shadow-lg shadow-cyan-600/30"
                  >
                    Simpan Voucher
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
