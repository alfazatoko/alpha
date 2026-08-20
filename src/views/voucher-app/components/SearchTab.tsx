/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Clock, 
  ChevronRight, 
  Smartphone, 
  Tag, 
  Gamepad2, 
  Zap, 
  X 
} from 'lucide-react';
import type { VoucherProduct } from '../types';
import { OPERATOR_STYLES } from '../data';
import ProviderLogo from './ProviderLogo';

interface SearchTabProps {
  products: VoucherProduct[];
  onSelectProduct: (product: VoucherProduct) => void;
  onNavigate: (tab: 'beranda' | 'produk' | 'pencarian' | 'laporan' | 'profil') => void;
}

export default function SearchTab({
  products,
  onSelectProduct,
  onNavigate,
}: SearchTabProps) {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'Telkomsel 10GB', 
    'Axis 6GB'
  ]);
  const [selectedOperator, setSelectedOperator] = useState<string>('Semua');

  const searchResults = products.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || 
                         p.barcode.includes(query) ||
                         p.operator.toLowerCase().includes(query.toLowerCase());
    
    const matchesOperator = selectedOperator === 'Semua' || p.operator === selectedOperator;

    return matchesQuery && matchesOperator;
  });

  const handleQuickTagClick = (tag: string) => {
    setQuery(tag);
    if (!recentSearches.includes(tag)) {
      setRecentSearches([tag, ...recentSearches.slice(0, 3)]);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setSelectedOperator('Semua');
  };

  const handleResultClick = (p: VoucherProduct) => {
    if (!recentSearches.includes(p.name)) {
      setRecentSearches([p.name, ...recentSearches.slice(0, 3)]);
    }
    onSelectProduct(p);
  };

  return (
    <div className="space-y-4 pb-8" id="search-tab-container">
      {/* Search Input Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 dark:text-slate-400" />
        <input
          type="text"
          placeholder="Cari voucher, SN, operator..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-600 transition"
          id="large-search-input"
        />
        {query && (
          <button 
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-full hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Recent Searches */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-2.5">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Pencarian Terakhir
          </span>
          <button 
            onClick={() => setRecentSearches([])}
            className="text-[9px] text-slate-600 dark:text-slate-400 hover:text-slate-600 dark:text-slate-300 font-bold"
          >
            Hapus
          </button>
        </div>

        {recentSearches.length === 0 ? (
          <p className="text-[10px] text-slate-600 dark:text-slate-400 italic">Riwayat pencarian kosong.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5" id="recent-search-tags">
            {recentSearches.map((tag, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickTagClick(tag)}
                className="text-[10px] bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5 px-2.5 py-1 rounded-xl transition cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Filter Grid (Operator Logo Buttons) */}
      <div className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
          Quick Filter Operator
        </span>

        <div className="grid grid-cols-3 gap-2" id="operator-quick-grid">
          {['Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren'].map((op) => {
            const isSelected = selectedOperator === op;
            const style = OPERATOR_STYLES[op] || { logoBg: 'bg-slate-500' };
            return (
              <button
                key={op}
                onClick={() => setSelectedOperator(isSelected ? 'Semua' : op)}
                className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                  isSelected 
                    ? 'bg-cyan-500/20 border-cyan-400 text-slate-900 dark:text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : 'bg-slate-50 border-slate-200 shadow-sm dark:bg-slate-950/40 border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent'
                }`}
              >
                <ProviderLogo operator={op} size="sm" className="w-8 h-8" />
                <span className="text-[9px] font-bold">{op}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Results Display */}
      <div className="space-y-2" id="search-results-panel">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
            Hasil Pencarian ({searchResults.length})
          </span>
          {(selectedOperator !== 'Semua' || query) && (
            <button 
              onClick={handleClearSearch}
              className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 font-bold"
            >
              Reset
            </button>
          )}
        </div>

        <div className="space-y-2" id="search-results-list">
          {searchResults.length === 0 ? (
            <div className="text-center py-6 text-slate-600 dark:text-slate-400 text-[10px]">
              Voucher tidak ditemukan.
            </div>
          ) : (
            searchResults.slice(0, 8).map((p) => {
              const opStyle = OPERATOR_STYLES[p.operator] || { logoBg: 'bg-slate-500' };
              return (
                <div
                  key={p.id}
                  onClick={() => handleResultClick(p)}
                  className="bg-white border border-slate-200 shadow-sm dark:bg-white/5 dark:border-transparent hover:bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 flex items-center justify-between gap-3 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProviderLogo operator={p.operator} category={p.category} size="sm" />
                    
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</h4>
                      <p className="text-[9px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                        Untung: Rp {(p.sellingPrice - p.costPrice).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/15">
                      {p.currentStock} Pcs
                    </span>
                    <p className="text-[10px] font-black text-slate-900 dark:text-white mt-1">Rp {p.sellingPrice.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
