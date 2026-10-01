import sys

filepath = 'src/views/voucher-app/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update states
old_states = """  const [isMultiSale, setIsMultiSale] = useState(false);
  const [saleSelectedIds, setSaleSelectedIds] = useState<string[]>([]);"""

new_states = """  const [saleCart, setSaleCart] = useState<{id: string, qty: number}[]>([]);
  const [showQtyModalFor, setShowQtyModalFor] = useState<string | null>(null);
  const [qtyModalValue, setQtyModalValue] = useState<number>(1);"""

if old_states in content:
    content = content.replace(old_states, new_states)
else:
    print("Warning: old states not found exactly. Searching manually.")
    start = content.find('const [isMultiSale')
    end = content.find('const [formProductId')
    if start != -1 and end != -1:
        content = content[:start] + new_states + '\n  ' + content[end:]

# 2. Update handleQuickSaleSubmit
old_submit_start = "const handleQuickSaleSubmit = (e: React.FormEvent) => {"
old_submit_end = "setShowQuickSale(false);\n  };"

start_idx = content.find(old_submit_start)
end_idx = content.find(old_submit_end, start_idx) + len(old_submit_end)

new_submit = """const handleQuickSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saleCart.length === 0) return;
    
    const baseNote = formNote ? ' ' + formNote : '';
    const finalNote = isPostClosing 
      ? `[${formPaymentMethod}] [PASCA-CLOSING]${baseNote}` 
      : `[${formPaymentMethod}]${baseNote}`;
    
    saleCart.forEach(item => {
      handleAdjustStock(
        item.id,
        item.qty,
        'PENJUALAN',
        finalNote,
        true,
        undefined,
        formPaymentMethod
      );
    });

    setFormProductId('');
    setSaleCart([]);
    setFormQuantity(1);
    setFormNote('');
    setFormPaymentMethod('TUNAI');
    setIsPostClosing(false);
    setShowQuickSale(false);
  };"""

content = content[:start_idx] + new_submit + content[end_idx:]

# 3. Update modal UI
start_idx = content.find('{showQuickSale && (() => {')
end_idx = content.find('{showQuickRestock && (() => {')

if start_idx != -1 and end_idx != -1:
    closing_idx = content.rfind('})()}', start_idx, end_idx)
    
    new_modal = """          {showQuickSale && (() => {
            const filteredSaleProducts = filterProductsByOperatorAndTitle(products, saleSelectedOperator, saleSearchQuery);
            const activeQtyModalProduct = products.find(p => p.id === showQtyModalFor) || null;
            
            const totalSellingPrice = saleCart.reduce((sum, item) => {
              const p = products.find(prod => prod.id === item.id);
              return sum + ((p?.sellingPrice || 0) * item.qty);
            }, 0);

            const isKonfirmasiDisabled = saleCart.length === 0;

            const handleSaveQty = () => {
              if (showQtyModalFor) {
                if (qtyModalValue <= 0) {
                  setSaleCart(saleCart.filter(i => i.id !== showQtyModalFor));
                } else {
                  const existing = saleCart.find(i => i.id === showQtyModalFor);
                  if (existing) {
                    setSaleCart(saleCart.map(i => i.id === showQtyModalFor ? { ...i, qty: qtyModalValue } : i));
                  } else {
                    setSaleCart([...saleCart, { id: showQtyModalFor, qty: qtyModalValue }]);
                  }
                }
              }
              setShowQtyModalFor(null);
            };

            return (
              <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/85 backdrop-blur-sm z-[100] flex items-center justify-center p-3 pb-20" id="quick-sale-modal">
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className={`w-full max-w-sm rounded-3xl shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/10'}`}
                >
                  {/* Top Header */}
                  <div className={`px-3 py-2 flex items-center justify-between shadow-sm shrink-0 border-b ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => quickSaleStep === 2 ? setQuickSaleStep(1) : setShowQuickSale(false)} className={`p-1 rounded-full transition-all ${isLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/10'}`}>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className={`text-[13px] font-black leading-tight tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Catat Penjualan</h2>
                        <p className={`text-[9px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{quickSaleStep === 1 ? 'Cari & Pilih Voucher' : 'Konfirmasi & Simpan'}</p>
                      </div>
                    </div>
                    <div className={`w-7 h-7 rounded-full border flex flex-col items-center justify-center shrink-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/10'}`}>
                      <Store className={`w-2.5 h-2.5 mb-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`} />
                      <span className={`text-[4px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>ALPHA</span>
                    </div>
                  </div>

                  {quickSaleStep === 1 ? (
                    <div className="flex-1 overflow-y-auto flex flex-col relative no-scrollbar min-h-0">
                      {/* Filter Chips & Search */}
                      <div className={`px-3 py-2 shrink-0 shadow-sm z-10 mb-1 border-b ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/5'}`}>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                          {OPERATOR_CHIPS.map(chip => {
                            const isSelected = saleSelectedOperator === chip.opValue;
                            return (
                              <button
                                key={chip.id}
                                onClick={() => setSaleSelectedOperator(chip.opValue)}
                                className={`px-3 py-1 rounded-full text-[9px] font-black tracking-wide whitespace-nowrap transition-all border ${
                                  isSelected 
                                    ? (isLight ? "bg-emerald-500 text-white border-emerald-500 shadow-sm" : "bg-emerald-500 text-white border-emerald-500 shadow-sm")
                                    : (isLight ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" : "bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700")
                                }`}
                              >
                                {chip.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="relative mt-1.5">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari & Pilih Voucher..."
                            value={saleSearchQuery}
                            onChange={e => setSaleSearchQuery(e.target.value)}
                            className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-1 transition-all shadow-inner ${
                              isLight 
                                ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-emerald-500' 
                                : 'bg-slate-950 border-white/10 text-white placeholder:text-slate-500 focus:border-emerald-500'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Product List */}
                      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 pt-1 pb-3 relative">
                        {/* Qty Modal Overlay */}
                        <AnimatePresence>
                          {showQtyModalFor && activeQtyModalProduct && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm"
                            >
                              <div className={`w-full max-w-[240px] rounded-2xl p-4 shadow-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                                <h4 className={`text-[12px] font-black text-center mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeQtyModalProduct.name}</h4>
                                <p className={`text-[9px] font-bold text-center mb-4 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tentukan jumlah beli</p>
                                
                                <div className={`flex items-center justify-between border rounded-xl p-1 mb-4 shadow-inner ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-slate-950'}`}>
                                  <button 
                                    onClick={() => setQtyModalValue(Math.max(0, qtyModalValue - 1))}
                                    className={`w-10 h-8 rounded-lg flex items-center justify-center transition-all ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                  >
                                    <Minus className="w-4 h-4" strokeWidth={3} />
                                  </button>
                                  <div className={`text-[16px] font-black ${isLight ? 'text-slate-800' : 'text-white'}`}>{qtyModalValue}</div>
                                  <button 
                                    onClick={() => setQtyModalValue(qtyModalValue + 1)}
                                    className={`w-10 h-8 rounded-lg flex items-center justify-center transition-all ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
                                  >
                                    <Plus className="w-4 h-4" strokeWidth={3} />
                                  </button>
                                </div>
                                
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setShowQtyModalFor(null)} 
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black border transition-all ${isLight ? 'bg-white border-slate-200 text-slate-600' : 'bg-slate-800 border-white/10 text-slate-300'}`}
                                  >
                                    Batal
                                  </button>
                                  <button 
                                    onClick={handleSaveQty} 
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black text-white shadow-md transition-all ${isLight ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-900/30'}`}
                                  >
                                    OK
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {filteredSaleProducts.length === 0 ? (
                          <div className="text-center py-4">
                            <p className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tidak ada voucher yang cocok</p>
                          </div>
                        ) : (
                          filteredSaleProducts.map(p => {
                            const cartItem = saleCart.find(i => i.id === p.id);
                            const isSel = !!cartItem;
                            const isLowStock = p.currentStock <= p.minStockLevel;
                            return (
                              <div 
                                key={p.id}
                                onClick={() => {
                                  setQtyModalValue(cartItem ? cartItem.qty : 1);
                                  setShowQtyModalFor(p.id);
                                }}
                                className={`backdrop-blur-xl border rounded-xl p-2 shadow-sm transition-all duration-200 cursor-pointer relative flex items-center justify-between group select-none ${
                                  isLight 
                                    ? (isSel ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500 text-slate-800' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800') 
                                    : (isSel ? 'bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 border-white/5 text-slate-300')
                                }`}
                              >
                                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                  {/* Left: Logo */}
                                  <div className="scale-[0.8] origin-left shrink-0">
                                    <ProviderLogo operator={p.operator} category={p.category} size="sm" />
                                  </div>

                                  {/* Middle: Title & Price */}
                                  <div className="min-w-0 flex-1 flex flex-col justify-center -ml-1">
                                    <h4 className={`text-[11px] font-bold tracking-tight truncate leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                      {p.name}
                                    </h4>
                                    <div className={`flex items-center gap-2 mt-0.5 text-[9px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                      <span className={isLight ? 'text-emerald-600 font-extrabold' : 'text-emerald-400 font-black'}>Rp {p.sellingPrice.toLocaleString('id-ID')}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Stock Badge / Cart Qty */}
                                <div className="flex items-center justify-center shrink-0 pl-1 gap-1.5">
                                  <div className={`px-2 py-1 rounded-lg border flex flex-col items-center justify-center min-w-[36px] transition-all shadow-sm ${
                                    isLowStock 
                                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 font-black' 
                                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-black'
                                  }`}>
                                    <span className="text-[13px] font-black leading-none tracking-tight">
                                      {p.currentStock}
                                    </span>
                                    <span className="text-[6px] font-black tracking-widest uppercase leading-none mt-0.5 opacity-90">
                                      STOK
                                    </span>
                                  </div>
                                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isSel ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : (isLight ? "border-slate-200 bg-slate-50 text-slate-400" : "border-slate-700 bg-slate-800 text-slate-500")}`}>
                                    {isSel ? (
                                      <span className="text-[10px] font-black leading-none">{cartItem.qty}</span>
                                    ) : (
                                      <Plus className="w-3 h-3" strokeWidth={3} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                      
                      {/* Bottom Bar Step 1 */}
                      <div className={`shrink-0 border-t p-3 z-20 mt-auto ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2.5">
                             <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-emerald-900/30 border-emerald-500/30 text-emerald-400'}`}>
                               <ShoppingCart className="w-4 h-4" />
                             </div>
                             <div>
                               <p className={`text-[9px] font-black ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{saleCart.length} Produk Dipilih</p>
                               <p className={`text-[8px] font-bold truncate max-w-[100px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{saleCart.reduce((sum, i) => sum + i.qty, 0)} Pcs Total</p>
                             </div>
                           </div>
                           <button
                             onClick={() => { if (!isKonfirmasiDisabled) setQuickSaleStep(2); }}
                             disabled={isKonfirmasiDisabled}
                             className={`disabled:opacity-50 text-white px-4 py-2 rounded-lg font-black text-[11px] flex items-center gap-1 shadow-md transition-all active:scale-95 uppercase tracking-wide ${
                               isLight ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-900/30'
                             }`}
                           >
                             Lanjut <ChevronRight className="w-3 h-3" />
                           </button>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleQuickSaleSubmit(e); }} className="flex-1 flex flex-col relative no-scrollbar overflow-hidden min-h-0">
                      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-3">
                        {/* Selected Products List (Cart) */}
                        <div className={`rounded-xl p-2 shadow-sm border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                          <div className="flex items-center gap-2 mb-2 px-1">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-900/30 text-emerald-400'}`}>
                              <ShoppingCart className="w-3 h-3" />
                            </div>
                            <h3 className={`text-[10px] font-black ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Daftar Produk ({saleCart.length})</h3>
                          </div>
                          <div className="space-y-1.5">
                            {saleCart.map(item => {
                              const p = products.find(prod => prod.id === item.id);
                              if (!p) return null;
                              return (
                                <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-white/5'}`}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-5 h-5 rounded flex items-center justify-center font-black text-[9px] ${isLight ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300'}`}>
                                      {item.qty}x
                                    </div>
                                    <div className="min-w-0">
                                      <p className={`text-[9px] font-black truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>{p.name}</p>
                                      <p className={`text-[8px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Rp {p.sellingPrice.toLocaleString('id-ID')}</p>
                                    </div>
                                  </div>
                                  <div className={`text-[10px] font-black shrink-0 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                                    Rp {(p.sellingPrice * item.qty).toLocaleString('id-ID')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Payment Method Card */}
                        <div className={`rounded-xl p-2.5 shadow-sm border ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-900/30 text-emerald-400'}`}>
                              <Banknote className="w-3 h-3" />
                            </div>
                            <div>
                              <h4 className={`text-[10px] font-black leading-none ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Metode Pembayaran</h4>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => setFormPaymentMethod('TUNAI')}
                              className={`flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-lg border-2 transition-all relative ${
                                formPaymentMethod === 'TUNAI' 
                                  ? (isLight ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-900/30") 
                                  : (isLight ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-300" : "border-white/5 bg-slate-800 text-slate-300 hover:border-emerald-500/50")
                              }`}
                            >
                              <Banknote className="w-4 h-4" />
                              <span className="text-[9px] font-black tracking-wide">Tunai</span>
                              {formPaymentMethod === 'TUNAI' && <div className="absolute right-1 top-1 bg-white rounded-full"><CheckCircle2 className={`w-3 h-3 ${isLight ? 'text-emerald-500' : 'text-emerald-600'}`} /></div>}
                            </button>
                            <button
                              type="button"
                              onClick={() => setFormPaymentMethod('NON_TUNAI')}
                              className={`flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-lg border-2 transition-all relative ${
                                formPaymentMethod === 'NON_TUNAI' 
                                  ? (isLight ? "border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-900/30") 
                                  : (isLight ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300" : "border-white/5 bg-slate-800 text-slate-300 hover:border-indigo-500/50")
                              }`}
                            >
                              <QrCode className="w-4 h-4" />
                              <span className="text-[9px] font-black tracking-wide">Non Tunai</span>
                              {formPaymentMethod === 'NON_TUNAI' && <div className="absolute right-1 top-1 bg-white rounded-full"><CheckCircle2 className={`w-3 h-3 ${isLight ? 'text-indigo-500' : 'text-indigo-600'}`} /></div>}
                            </button>
                          </div>

                          <label className={`flex items-center justify-between p-2 mt-2 rounded-lg border-2 cursor-pointer transition-all ${
                            isPostClosing 
                              ? (isLight ? 'border-amber-400 bg-amber-50' : 'border-amber-500/50 bg-amber-900/20') 
                              : (isLight ? 'border-slate-100 bg-slate-50 hover:border-amber-200' : 'border-white/5 bg-slate-800 hover:border-amber-500/30')
                          }`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-300'}`}>
                                <History className="w-3 h-3" />
                              </div>
                              <div>
                                <span className={`text-[9px] font-black block ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Pasca-Closing</span>
                                <span className={`text-[7px] font-bold block leading-tight mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Jualan setelah hitung stok.</span>
                              </div>
                            </div>
                            <div className={`w-6 h-4 rounded-full flex items-center px-0.5 transition-colors ${isPostClosing ? "bg-amber-500" : (isLight ? "bg-slate-300" : "bg-slate-600")}`}>
                              <div className={`w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${isPostClosing ? "translate-x-2" : "translate-x-0"}`} />
                            </div>
                            <input type="checkbox" className="sr-only" checked={isPostClosing} onChange={e => setIsPostClosing(e.target.checked)} />
                          </label>
                        </div>

                        {/* Informasi Penjualan Card */}
                        <div className={`rounded-xl p-2 shadow-sm border flex items-center justify-between ${isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-800/50 text-emerald-400'}`}>
                              <Banknote className="w-4 h-4" />
                            </div>
                            <div>
                              <p className={`text-[8px] font-bold uppercase tracking-wider ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Total Tagihan</p>
                              <p className={`text-[14px] font-black leading-none mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Rp {totalSellingPrice.toLocaleString('id-ID')}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Bar Step 2 */}
                      <div className={`shrink-0 border-t p-3 z-20 mt-auto ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                         <div className="flex gap-2">
                           <button
                             type="button"
                             onClick={() => setQuickSaleStep(1)}
                             className={`w-[80px] border py-2 rounded-lg font-black text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                               isLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'
                             }`}
                           >
                             <ArrowLeft className="w-3.5 h-3.5" /> Batal
                           </button>
                           <button
                             type="submit"
                             disabled={isKonfirmasiDisabled}
                             className={`flex-1 disabled:opacity-50 text-white py-2 rounded-lg font-black text-[11px] flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 uppercase tracking-wide ${
                               isLight ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-900/30'
                             }`}
                           >
                             <Store className="w-3.5 h-3.5" /> Simpan Jual
                           </button>
                         </div>
                      </div>
                    </form>
                  )}
                </motion.div>
              </div>
            );
          })()}"""
    
    content = content[:start_idx] + new_modal + content[closing_idx+5:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
