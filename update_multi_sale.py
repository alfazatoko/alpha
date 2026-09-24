import sys

filepath = 'src/views/voucher-app/App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add states
state_insertion = """
  // Quick Action Forms Fields
  const [isMultiSale, setIsMultiSale] = useState(false);
  const [saleSelectedIds, setSaleSelectedIds] = useState<string[]>([]);
"""
content = content.replace('  // Quick Action Forms Fields\n', state_insertion)

# 2. Update handleQuickSaleSubmit
old_submit = """  const handleQuickSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProductId) return;
    
    const baseNote = formNote ? ' ' + formNote : '';
    const finalNote = isPostClosing 
      ? `[${formPaymentMethod}] [PASCA-CLOSING]${baseNote}` 
      : `[${formPaymentMethod}]${baseNote}`;
    
    handleAdjustStock(
      formProductId,
      formQuantity,
      'PENJUALAN',
      finalNote,
      true, // skipStockUpdate = true: Jual cepat hanya mencatat transaksi, tidak memotong stok fisik sistem
      undefined,
      formPaymentMethod
    );

    setFormProductId('');
    setFormQuantity(1);
    setFormNote('');
    setFormPaymentMethod('TUNAI');
    setIsPostClosing(false);
    setShowQuickSale(false);
  };"""

new_submit = """  const handleQuickSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMultiSale && !formProductId) return;
    if (isMultiSale && saleSelectedIds.length === 0) return;
    
    const baseNote = formNote ? ' ' + formNote : '';
    const finalNote = isPostClosing 
      ? `[${formPaymentMethod}] [PASCA-CLOSING]${baseNote}` 
      : `[${formPaymentMethod}]${baseNote}`;
    
    if (isMultiSale) {
      saleSelectedIds.forEach(id => {
        handleAdjustStock(
          id,
          formQuantity,
          'PENJUALAN',
          finalNote,
          true,
          undefined,
          formPaymentMethod
        );
      });
    } else {
      handleAdjustStock(
        formProductId,
        formQuantity,
        'PENJUALAN',
        finalNote,
        true,
        undefined,
        formPaymentMethod
      );
    }

    setFormProductId('');
    setSaleSelectedIds([]);
    setFormQuantity(1);
    setFormNote('');
    setFormPaymentMethod('TUNAI');
    setIsPostClosing(false);
    setShowQuickSale(false);
  };"""

content = content.replace(old_submit, new_submit)

# 3. Modify modal block
start_idx = content.find('{showQuickSale && (() => {')
end_idx = content.find('{showQuickRestock && (() => {')

if start_idx != -1 and end_idx != -1:
    # Find the closing })()}' before end_idx
    closing_idx = content.rfind('})()}', start_idx, end_idx)
    
    new_modal = """          {showQuickSale && (() => {
            const filteredSaleProducts = filterProductsByOperatorAndTitle(products, saleSelectedOperator, saleSearchQuery);
            const activeSelectedId = formProductId || (filteredSaleProducts.length > 0 ? filteredSaleProducts[0].id : (products.length > 0 ? products[0].id : ''));
            const selectedProduct = products.find(p => p.id === activeSelectedId) || null;
            
            // For Multi Sale
            const selectedProducts = products.filter(p => saleSelectedIds.includes(p.id));
            const isKonfirmasiDisabled = isMultiSale ? saleSelectedIds.length === 0 : !selectedProduct;
            const totalSellingPrice = isMultiSale 
              ? selectedProducts.reduce((sum, p) => sum + p.sellingPrice, 0)
              : (selectedProduct?.sellingPrice || 0);

            const toggleMultiSelect = (id: string) => {
              if (saleSelectedIds.includes(id)) {
                setSaleSelectedIds(saleSelectedIds.filter(x => x !== id));
              } else {
                setSaleSelectedIds([...saleSelectedIds, id]);
              }
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
                    {quickSaleStep === 1 && (
                      <button 
                        onClick={() => {
                          setIsMultiSale(!isMultiSale);
                          if (!isMultiSale) setSaleSelectedIds(formProductId ? [formProductId] : []);
                        }}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 border transition-all ${
                          isMultiSale 
                            ? 'bg-amber-500 border-amber-500 text-white shadow-sm' 
                            : (isLight ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-slate-800 border-white/10 text-slate-400')
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> MULTI
                      </button>
                    )}
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
                      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 pt-1 pb-3">
                        {filteredSaleProducts.length === 0 ? (
                          <div className="text-center py-4">
                            <p className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tidak ada voucher yang cocok</p>
                          </div>
                        ) : (
                          filteredSaleProducts.map(p => {
                            const isSel = isMultiSale ? saleSelectedIds.includes(p.id) : activeSelectedId === p.id;
                            const isLowStock = p.currentStock <= p.minStockLevel;
                            return (
                              <div 
                                key={p.id}
                                onClick={() => isMultiSale ? toggleMultiSelect(p.id) : setFormProductId(p.id)}
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

                                {/* Right: Stock Badge */}
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
                                  <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border-2 transition-all ${isSel ? (isMultiSale ? "border-amber-500 bg-amber-500" : "border-emerald-500 bg-emerald-500") : (isLight ? "border-slate-300 bg-slate-50" : "border-slate-600 bg-slate-800")}`}>
                                    {isSel && <Check className="w-2 h-2 text-white" strokeWidth={3} />}
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
                               <p className={`text-[9px] font-black ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{isMultiSale ? `${saleSelectedIds.length} Produk Dipilih` : '1 Produk Dipilih'}</p>
                               <p className={`text-[8px] font-bold truncate max-w-[100px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{isMultiSale ? 'Mode Multi-Select' : (selectedProduct?.name || 'Belum ada')}</p>
                             </div>
                           </div>
                           <button
                             onClick={() => { if (!isKonfirmasiDisabled) setQuickSaleStep(2); }}
                             disabled={isKonfirmasiDisabled}
                             className={`disabled:opacity-50 text-white px-4 py-2 rounded-lg font-black text-[11px] flex items-center gap-1 shadow-md transition-all active:scale-95 uppercase tracking-wide ${
                               isLight ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-900/30'
                             }`}
                           >
                             Konfirmasi <ChevronRight className="w-3 h-3" />
                           </button>
                         </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleQuickSaleSubmit(e); }} className="flex-1 flex flex-col relative no-scrollbar overflow-hidden min-h-0">
                      <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-3">
                        {/* Selected Product Card */}
                        {isMultiSale ? (
                          <div className={`rounded-xl p-3 shadow-sm border ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-900/20 border-amber-500/30'}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isLight ? 'bg-amber-100 text-amber-600' : 'bg-amber-800/50 text-amber-400'}`}>
                                <Layers className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <h3 className={`text-[11px] font-black ${isLight ? 'text-amber-900' : 'text-amber-100'}`}>Multi Produk ({saleSelectedIds.length} Item)</h3>
                                <p className={`text-[8px] font-bold ${isLight ? 'text-amber-700' : 'text-amber-400/70'}`}>Akan dijual bersamaan</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {selectedProducts.map(p => (
                                <span key={p.id} className={`text-[7px] font-bold px-1.5 py-0.5 rounded border ${isLight ? 'bg-white border-amber-200 text-amber-700' : 'bg-amber-950 border-amber-500/30 text-amber-300'}`}>
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          selectedProduct && (
                            <div className={`rounded-xl p-2 shadow-sm border flex gap-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                               <div className="shrink-0 scale-[0.8] origin-left">
                                 <ProviderLogo operator={selectedProduct.operator} category={selectedProduct.category} size="sm" />
                               </div>
                               <div className="flex-1 min-w-0 flex flex-col justify-center -ml-1">
                                 <h3 className={`text-[11px] font-black leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedProduct.name}</h3>
                                 <p className={`text-[8px] font-bold mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{selectedProduct.category || selectedProduct.operator}</p>
                                 <div className={`mt-1 flex items-center gap-1 text-[8px] font-black w-fit px-1.5 py-0.5 rounded border ${
                                   isLight ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-emerald-400 bg-emerald-900/30 border-emerald-500/30'
                                 }`}>
                                   <Package className="w-2.5 h-2.5" /> Stok {selectedProduct.currentStock}
                                 </div>
                               </div>
                               <div className={`shrink-0 flex flex-col justify-center items-end px-2 py-1 rounded-lg border ${
                                 isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-white/5'
                               }`}>
                                 <div className={`flex items-center gap-1 text-[7px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                   <Activity className="w-2.5 h-2.5" /> Harga Satuan
                                 </div>
                                 <div className={`text-[11px] font-black mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                                   Rp {selectedProduct.sellingPrice.toLocaleString('id-ID')}
                                 </div>
                               </div>
                            </div>
                          )
                        )}

                        {/* Quantity Card */}
                        <div className={`rounded-xl p-2.5 shadow-sm border flex items-center justify-between ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-900/30 text-emerald-400'}`}>
                              <Package className="w-3 h-3" />
                            </div>
                            <div>
                              <h4 className={`text-[10px] font-black leading-none ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Jumlah Beli</h4>
                              <p className={`text-[7px] font-bold mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{isMultiSale ? `Untuk tiap produk` : `Total: ${formQuantity} pcs`}</p>
                            </div>
                          </div>
                          
                          <div className={`flex items-center justify-between border rounded-lg p-0.5 shadow-sm ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-slate-950'}`}>
                            <button 
                              type="button"
                              onClick={() => setFormQuantity(Math.max(1, formQuantity - 1))}
                              className={`w-8 h-7 text-white rounded-md flex items-center justify-center active:scale-95 transition-all shadow-sm ${
                                isLight ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'
                              }`}
                            >
                              <Minus className="w-3.5 h-3.5" strokeWidth={3} />
                            </button>
                            <div className="flex items-center justify-center px-2 min-w-[36px]">
                              <input 
                                type="number" 
                                value={formQuantity}
                                onChange={e => setFormQuantity(parseInt(e.target.value) || 1)}
                                className={`w-full text-center text-[13px] font-black bg-transparent focus:outline-none ${isLight ? 'text-slate-800' : 'text-white'}`} 
                              />
                            </div>
                            <button 
                              type="button"
                              onClick={() => setFormQuantity(formQuantity + 1)}
                              className={`w-8 h-7 text-white rounded-md flex items-center justify-center active:scale-95 transition-all shadow-sm ${
                                isLight ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-500 hover:bg-emerald-600'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
                            </button>
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
                              <p className={`text-[8px] font-bold uppercase tracking-wider ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Total Pembayaran</p>
                              <p className={`text-[14px] font-black leading-none mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>Rp {(totalSellingPrice * formQuantity).toLocaleString('id-ID')}</p>
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
                             <Store className="w-3.5 h-3.5" /> Konfirmasi Jual
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
