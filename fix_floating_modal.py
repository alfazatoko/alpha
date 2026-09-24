import sys

filepath = 'src/views/voucher-app/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = next(i for i, l in enumerate(lines) if '{showQuickSale && (() => {' in l)
end_idx = next(i for i, l in enumerate(lines) if 'showQuickRestock && (() => {' in l)

for j in range(end_idx, start_idx, -1):
    if '})()}' in lines[j] and not 'showQuickRestock' in lines[j]:
        end_idx = j
        break

new_block = """          {showQuickSale && (() => {
            const filteredSaleProducts = filterProductsByOperatorAndTitle(products, saleSelectedOperator, saleSearchQuery);
            const activeSelectedId = formProductId || (filteredSaleProducts.length > 0 ? filteredSaleProducts[0].id : (products.length > 0 ? products[0].id : ''));
            const selectedProduct = products.find(p => p.id === activeSelectedId) || null;

            return (
              <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-sm z-[100] flex items-center justify-center p-3" id="quick-sale-modal">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className={`w-full max-w-sm rounded-[32px] shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/10'}`}
                >
                  {/* Top Header */}
                  <div className={`px-4 py-3 flex items-center justify-between shadow-sm shrink-0 border-b ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => quickSaleStep === 2 ? setQuickSaleStep(1) : setShowQuickSale(false)} className={`p-1.5 rounded-full transition-all ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/10'}`}>
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <h2 className={`text-[15px] font-black leading-tight tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Catat Penjualan Voucher</h2>
                        <p className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{quickSaleStep === 1 ? 'Cari & Pilih Voucher' : 'Konfirmasi & Simpan'}</p>
                      </div>
                    </div>
                    <div className={`w-9 h-9 rounded-full border flex flex-col items-center justify-center shrink-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/10'}`}>
                      <Store className={`w-3 h-3 mb-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`} />
                      <span className={`text-[5px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>ALPHA</span>
                    </div>
                  </div>

                  {quickSaleStep === 1 ? (
                    <div className="flex-1 overflow-y-auto flex flex-col relative no-scrollbar min-h-0">
                      {/* Filter Chips & Search */}
                      <div className={`px-4 py-3 shrink-0 shadow-sm z-10 mb-2 border-b ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5'}`}>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {OPERATOR_CHIPS.map(chip => {
                            const isSelected = saleSelectedOperator === chip.opValue;
                            return (
                              <button
                                key={chip.id}
                                onClick={() => setSaleSelectedOperator(chip.opValue)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide whitespace-nowrap transition-all border ${
                                  isSelected 
                                    ? (isLight ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20" : "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20")
                                    : (isLight ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700")
                                }`}
                              >
                                {chip.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="relative mt-2.5">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari & Pilih Voucher..."
                            value={saleSearchQuery}
                            onChange={e => setSaleSearchQuery(e.target.value)}
                            className={`w-full border rounded-xl pl-9 pr-4 py-2 text-[12px] font-bold focus:outline-none focus:ring-2 transition-all shadow-inner ${
                              isLight 
                                ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20' 
                                : 'bg-slate-950 border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Product List */}
                      <div className="flex-1 overflow-y-auto px-4 space-y-2.5 pt-1 pb-4">
                        {filteredSaleProducts.length === 0 ? (
                          <div className="text-center py-6">
                            <p className={`text-[11px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tidak ada voucher yang cocok</p>
                          </div>
                        ) : (
                          filteredSaleProducts.map(p => {
                            const isSel = activeSelectedId === p.id;
                            const isLowStock = p.currentStock <= p.minStockLevel;
                            return (
                              <div 
                                key={p.id}
                                onClick={() => setFormProductId(p.id)}
                                className={`backdrop-blur-xl border rounded-2xl p-3 shadow-sm transition-all duration-200 cursor-pointer relative flex items-center justify-between group select-none ${
                                  isLight 
                                    ? (isSel ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 text-slate-800' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800') 
                                    : (isSel ? 'bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-white/5 text-slate-300')
                                }`}
                              >
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                  {/* Left: Logo */}
                                  <ProviderLogo operator={p.operator} category={p.category} size="md" />

                                  {/* Middle: Title & Price */}
                                  <div className="min-w-0 flex-1 flex flex-col justify-center">
                                    <h4 className={`text-[13px] font-bold tracking-tight truncate leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                      {p.name}
                                    </h4>
                                    <div className={`flex items-center gap-3 mt-1 text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                      <span className={isLight ? 'text-emerald-600 font-extrabold' : 'text-emerald-400 font-black'}>Rp {p.sellingPrice.toLocaleString('id-ID')}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Stock Badge */}
                                <div className="flex items-center justify-center shrink-0 pl-2 gap-2">
                                  <div className={`px-2.5 py-1.5 rounded-xl border flex flex-col items-center justify-center min-w-[50px] transition-all shadow-sm ${
                                    isLowStock 
                                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 font-black' 
                                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-black'
                                  }`}>
                                    <span className="text-lg font-black leading-none tracking-tight">
                                      {p.currentStock}
                                    </span>
                                    <span className="text-[8px] font-black tracking-widest uppercase leading-none mt-1 opacity-90">
                                      STOK
                                    </span>
                                  </div>
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 transition-all ${isSel ? "border-emerald-500 bg-emerald-500" : (isLight ? "border-slate-300 bg-slate-50" : "border-slate-600 bg-slate-800")}`}>
                                    {isSel && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                      
                      {/* Bottom Bar Step 1 */}
                      <div className={`shrink-0 border-t p-4 z-20 mt-auto ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'}`}>
                               <ShoppingCart className="w-5 h-5" />
                             </div>
                             <div>
                               <p className={`text-[10px] font-black ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>1 Produk Dipilih</p>
                               <p className={`text-[9px] font-bold truncate max-w-[120px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{selectedProduct?.name || 'Belum ada'}</p>
                             </div>
                           </div>
                           <button
                             onClick={() => { if (selectedProduct) setQuickSaleStep(2); }}
                             disabled={!selectedProduct}
                             className={`disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-black text-[12px] flex items-center gap-1.5 shadow-lg transition-all active:scale-95 uppercase tracking-wide ${
                               isLight ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-900/50'
                             }`}
                           >
                             Konfirmasi <ChevronRight className="w-3.5 h-3.5" />
                           </button>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleQuickSaleSubmit(e); }} className="flex-1 flex flex-col relative no-scrollbar overflow-hidden min-h-0">
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-4">
                        {/* Selected Product Card */}
                        {selectedProduct && (
                          <div className={`rounded-2xl p-3 shadow-sm border flex gap-3 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                             <div className="shrink-0">
                               <ProviderLogo operator={selectedProduct.operator} category={selectedProduct.category} size="md" />
                             </div>
                             <div className="flex-1 min-w-0 flex flex-col justify-center">
                               <h3 className={`text-[13px] font-black leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedProduct.name}</h3>
                               <p className={`text-[9px] font-bold mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{selectedProduct.category || selectedProduct.operator}</p>
                               <div className={`mt-1.5 flex items-center gap-1 text-[9px] font-black w-fit px-2 py-0.5 rounded-md border ${
                                 isLight ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-emerald-400 bg-emerald-900/30 border-emerald-500/30'
                               }`}>
                                 <Package className="w-2.5 h-2.5" /> Stok Tersedia {selectedProduct.currentStock}
                               </div>
                             </div>
                             <div className={`shrink-0 flex flex-col justify-center items-end px-3 py-1.5 rounded-xl border ${
                               isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/5'
                             }`}>
                               <div className={`flex items-center gap-1 text-[8px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                 <Activity className="w-2.5 h-2.5" /> Harga Satuan
                               </div>
                               <div className={`text-[12px] font-black mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                                 Rp {selectedProduct.sellingPrice.toLocaleString('id-ID')}
                               </div>
                             </div>
                          </div>
                        )}

                        {/* Quantity Card */}
                        <div className={`rounded-2xl p-3.5 shadow-sm border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-900/30 text-emerald-400'}`}>
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <h4 className={`text-[11px] font-black leading-none ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Jumlah Pembelian</h4>
                            </div>
                          </div>
                          
                          <div className={`flex items-center justify-between border rounded-xl p-1 shadow-sm ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-slate-950'}`}>
                            <button 
                              type="button"
                              onClick={() => setFormQuantity(Math.max(1, formQuantity - 1))}
                              className={`w-14 h-10 text-white rounded-lg flex items-center justify-center active:scale-95 transition-all shadow-sm ${
                                isLight ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'
                              }`}
                            >
                              <Minus className="w-5 h-5" strokeWidth={3} />
                            </button>
                            <div className="flex-1 flex items-center justify-center gap-1.5">
                              <input 
                                type="number" 
                                value={formQuantity}
                                onChange={e => setFormQuantity(parseInt(e.target.value) || 1)}
                                className={`w-14 text-center text-[22px] font-black bg-transparent focus:outline-none ${isLight ? 'text-slate-800' : 'text-white'}`} 
                              />
                              <span className={`text-[12px] font-black ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>pcs</span>
                            </div>
                            <button 
                              type="button"
                              onClick={() => setFormQuantity(Math.min(selectedProduct?.currentStock || 1, formQuantity + 1))}
                              className={`w-14 h-10 text-white rounded-lg flex items-center justify-center active:scale-95 transition-all shadow-sm ${
                                isLight ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'
                              }`}
                            >
                              <Plus className="w-5 h-5" strokeWidth={3} />
                            </button>
                          </div>
                        </div>

                        {/* Payment Method Card */}
                        <div className={`rounded-2xl p-3.5 shadow-sm border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-900/30 text-emerald-400'}`}>
                              <Banknote className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <h4 className={`text-[11px] font-black leading-none ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Metode Pembayaran</h4>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setFormPaymentMethod('TUNAI')}
                              className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 transition-all relative ${
                                formPaymentMethod === 'TUNAI' 
                                  ? (isLight ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-900/30") 
                                  : (isLight ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300" : "border-white/5 bg-slate-800 text-slate-300 hover:border-emerald-500/50")
                              }`}
                            >
                              <Banknote className="w-5 h-5" />
                              <span className="text-[10px] font-black tracking-wide">Tunai</span>
                              {formPaymentMethod === 'TUNAI' && <div className="absolute right-1.5 top-1.5 bg-white rounded-full"><CheckCircle2 className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-500' : 'text-emerald-600'}`} /></div>}
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormPaymentMethod('NON_TUNAI')}
                              className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 transition-all relative ${
                                formPaymentMethod === 'NON_TUNAI' 
                                  ? (isLight ? "border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-900/30") 
                                  : (isLight ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300" : "border-white/5 bg-slate-800 text-slate-300 hover:border-indigo-500/50")
                              }`}
                            >
                              <QrCode className="w-5 h-5" />
                              <span className="text-[10px] font-black tracking-wide">Non Tunai</span>
                              <span className={`text-[7px] font-bold ${formPaymentMethod === 'NON_TUNAI' ? (isLight ? 'text-indigo-100' : 'text-indigo-200') : (isLight ? 'text-slate-400' : 'text-slate-500')}`}>QRIS/Transfer</span>
                              {formPaymentMethod === 'NON_TUNAI' && <div className="absolute right-1.5 top-1.5 bg-white rounded-full"><CheckCircle2 className={`w-3.5 h-3.5 ${isLight ? 'text-indigo-500' : 'text-indigo-600'}`} /></div>}
                            </button>
                          </div>

                          <label className={`flex items-center justify-between p-2.5 mt-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                            isPostClosing 
                              ? (isLight ? 'border-amber-400 bg-amber-50' : 'border-amber-500/50 bg-amber-900/20') 
                              : (isLight ? 'border-slate-100 bg-slate-50 hover:border-amber-200' : 'border-white/5 bg-slate-800 hover:border-amber-500/30')
                          }`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'}`}>
                                <History className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className={`text-[9px] font-black block ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Penjualan Pasca-Closing</span>
                                <span className={`text-[7px] font-bold block leading-tight mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Jualan setelah hitung stok.</span>
                              </div>
                            </div>
                            <div className={`w-8 h-5 rounded-full flex items-center px-1 transition-colors ${isPostClosing ? "bg-amber-500" : (isLight ? "bg-slate-300" : "bg-slate-600")}`}>
                              <div className={`w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${isPostClosing ? "translate-x-3" : "translate-x-0"}`} />
                            </div>
                            <input type="checkbox" className="sr-only" checked={isPostClosing} onChange={e => setIsPostClosing(e.target.checked)} />
                          </label>
                        </div>

                        {/* Informasi Penjualan Card */}
                        <div className={`rounded-2xl p-3.5 shadow-sm border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                          <div className="flex gap-2">
                             <div className={`flex-1 border rounded-xl p-2.5 flex flex-col justify-center items-center gap-1 text-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/5'}`}>
                               <div>
                                 <p className={`text-[8px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Terjual</p>
                                 <p className={`text-[12px] font-black leading-none mt-1 ${isLight ? 'text-slate-800' : 'text-white'}`}>{formQuantity} pcs</p>
                               </div>
                             </div>
                             <div className={`flex-[1.3] border rounded-xl p-2.5 flex flex-col justify-center items-center gap-1 text-center ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                               <div>
                                 <p className={`text-[8px] font-bold uppercase tracking-wider ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Total Penjualan</p>
                                 <p className={`text-[14px] font-black leading-none mt-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Rp {((selectedProduct?.sellingPrice || 0) * formQuantity).toLocaleString('id-ID')}</p>
                               </div>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Bar Step 2 */}
                      <div className={`shrink-0 border-t p-4 z-20 mt-auto ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                         <div className="flex gap-2">
                           <button
                             type="button"
                             onClick={() => setQuickSaleStep(1)}
                             className={`w-[100px] border py-2.5 rounded-xl font-black text-[11px] flex items-center justify-center gap-2 transition-all active:scale-95 ${
                               isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'
                             }`}
                           >
                             <ArrowLeft className="w-3.5 h-3.5" /> Batal
                           </button>
                           <button
                             type="submit"
                             disabled={!selectedProduct}
                             className={`flex-1 disabled:opacity-50 text-white py-2.5 rounded-xl font-black text-[12px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 uppercase tracking-wide ${
                               isLight ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-900/50'
                             }`}
                           >
                             <Store className="w-3.5 h-3.5" /> Konfirmasi Jual
                           </button>
                         </div>
                      </div>
                    </form>
                  )}
                </motion.div>
              </div>
            );
          })()}
"""

lines[start_idx:end_idx+1] = [new_block]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("SUCCESS")
