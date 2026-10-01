import sys

filepath = 'src/views/voucher-app/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Add quickSaleStep
for i, line in enumerate(lines):
    if 'const [showQuickSale, setShowQuickSale] = useState(false);' in line:
        if not any('const [quickSaleStep' in l for l in lines[i:i+5]):
            lines.insert(i + 1, '  const [quickSaleStep, setQuickSaleStep] = useState<1 | 2>(1);\n')
        break

# 2. Add setQuickSaleStep(1) on "JUAL CEPAT" button click
for i, line in enumerate(lines):
    if 'setFormNote(\'\');' in line and 'setFormQuantity(1);' in lines[i-1]:
        if 'setShowQuickSale(true);' in lines[i+1]:
            if 'setQuickSaleStep' not in lines[i]:
                lines.insert(i + 1, '              setQuickSaleStep(1);\n')

# 3. Import ProviderLogo if not present
if not any('import ProviderLogo' in line for line in lines):
    for i, line in enumerate(lines):
        if 'import { motion, AnimatePresence }' in line:
            lines.insert(i + 1, 'import ProviderLogo from \'./components/ProviderLogo\';\n')
            break

# 4. Replace block
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
              <div className="fixed inset-0 z-[100] flex flex-col bg-[#f0f4f8] sm:rounded-t-[32px] sm:top-auto sm:h-[90vh]" id="quick-sale-modal">
                {/* Top Blue Header */}
                <div className="bg-[#0066ff] px-4 py-3 flex items-center justify-between shadow-md shrink-0 sm:rounded-t-[32px]">
                  <div className="flex items-center gap-3">
                    <button onClick={() => quickSaleStep === 2 ? setQuickSaleStep(1) : setShowQuickSale(false)} className="text-white p-1 hover:bg-white/10 rounded-full transition-all">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-[16px] font-black text-white leading-tight tracking-tight">Catat Penjualan Voucher</h2>
                      <p className="text-[11px] font-bold text-blue-100">{quickSaleStep === 1 ? 'Cari & Pilih Voucher' : 'Konfirmasi & Simpan Penjualan'}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex flex-col items-center justify-center shrink-0">
                    <Store className="text-white w-3 h-3 mb-0.5" />
                    <span className="text-[6px] font-black text-white uppercase tracking-widest">ALPHA</span>
                  </div>
                </div>

                {quickSaleStep === 1 ? (
                  <div className="flex-1 overflow-y-auto flex flex-col relative no-scrollbar">
                    {/* Filter Chips */}
                    <div className="bg-[#0066ff] px-4 py-3 shrink-0 rounded-b-2xl shadow-sm z-10 mb-2">
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {OPERATOR_CHIPS.map(chip => {
                          const isSelected = saleSelectedOperator === chip.opValue;
                          return (
                            <button
                              key={chip.id}
                              onClick={() => setSaleSelectedOperator(chip.opValue)}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-wide whitespace-nowrap transition-all border ${
                                isSelected ? "bg-white text-[#0066ff] border-white shadow-md shadow-black/10" : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                              }`}
                            >
                              {chip.label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Search */}
                      <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Cari & Pilih Voucher..."
                          value={saleSearchQuery}
                          onChange={e => setSaleSearchQuery(e.target.value)}
                          className="w-full bg-white border border-transparent rounded-2xl pl-9 pr-4 py-2.5 text-[12px] font-bold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-white focus:ring-4 focus:ring-blue-400/50 transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    {/* Product List */}
                    <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-2">
                      {filteredSaleProducts.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-[11px] font-bold text-gray-500">Tidak ada voucher yang cocok</p>
                        </div>
                      ) : (
                        filteredSaleProducts.map(p => {
                          const isSel = activeSelectedId === p.id;
                          return (
                            <div
                              key={p.id}
                              onClick={() => setFormProductId(p.id)}
                              className={`flex items-center bg-white p-3 rounded-2xl border transition-all cursor-pointer ${
                                isSel ? "border-[#0066ff] shadow-md shadow-blue-500/10 ring-1 ring-[#0066ff]" : "border-gray-200 shadow-sm hover:border-blue-300"
                              }`}
                            >
                              {/* Logo Provider */}
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 ${p.provider === 'XL' ? 'bg-[#00B14F]' : p.provider === 'TELKOMSEL' ? 'bg-[#E3000F]' : p.provider === 'INDOSAT' ? 'bg-[#FFCC00]' : 'bg-gray-50'}`}>
                                <ProviderLogo provider={p.provider} className="w-8 h-8" />
                              </div>
                              {/* Details */}
                              <div className="ml-3 flex-1 min-w-0">
                                <h3 className="text-[12px] font-black text-gray-800 truncate leading-tight">{p.name}</h3>
                                <p className="text-[10px] font-bold text-gray-500 mt-0.5">{p.category || p.provider}</p>
                              </div>
                              {/* Price & Stock */}
                              <div className="flex flex-col items-end shrink-0 ml-2">
                                <span className="text-[9px] font-bold text-gray-500">Stok: <span className={p.currentStock <= p.minStockLevel ? 'text-red-500' : 'text-gray-700'}>{p.currentStock}</span></span>
                                <span className={`text-[12px] font-black mt-0.5 ${isSel ? "text-[#0066ff]" : "text-[#0066ff]"}`}>Rp {p.sellingPrice.toLocaleString('id-ID')}</span>
                              </div>
                              {/* Radio/Check */}
                              <div className="ml-3 shrink-0">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${isSel ? "border-[#0066ff] bg-[#0066ff]" : "border-gray-300 bg-gray-50"}`}>
                                  {isSel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                    
                    {/* Bottom Bar Step 1 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] sm:rounded-b-[32px]">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066ff]">
                             <ShoppingCart className="w-5 h-5" />
                           </div>
                           <div>
                             <p className="text-[10px] font-black text-gray-800">1 Produk Dipilih</p>
                             <p className="text-[10px] font-bold text-gray-500 truncate max-w-[130px]">{selectedProduct?.name || 'Belum ada'}</p>
                           </div>
                         </div>
                         <button
                           onClick={() => { if (selectedProduct) setQuickSaleStep(2); }}
                           disabled={!selectedProduct}
                           className="bg-[#0066ff] disabled:bg-gray-300 disabled:text-gray-500 text-white px-6 py-2.5 rounded-xl font-black text-[12px] flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-wide"
                         >
                           Konfirmasi <ChevronRight className="w-4 h-4" />
                         </button>
                       </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleQuickSaleSubmit(e); }} className="flex-1 overflow-y-auto flex flex-col relative no-scrollbar">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
                      {/* Selected Product Card */}
                      {selectedProduct && (
                        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 flex gap-3">
                           <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 ${selectedProduct.provider === 'XL' ? 'bg-[#00B14F]' : selectedProduct.provider === 'TELKOMSEL' ? 'bg-[#E3000F]' : selectedProduct.provider === 'INDOSAT' ? 'bg-[#FFCC00]' : 'bg-gray-50'}`}>
                             <ProviderLogo provider={selectedProduct.provider} className="w-8 h-8" />
                           </div>
                           <div className="flex-1 min-w-0 flex flex-col justify-center">
                             <h3 className="text-[13px] font-black text-gray-800 leading-tight">{selectedProduct.name}</h3>
                             <p className="text-[9px] font-bold text-gray-500 mt-0.5">{selectedProduct.category || selectedProduct.provider}</p>
                             <div className="mt-1.5 flex items-center gap-1 text-[9px] font-black text-[#0066ff] bg-blue-50 w-fit px-2 py-0.5 rounded-md border border-blue-100">
                               <Package className="w-3 h-3" /> Stok Tersedia {selectedProduct.currentStock}
                             </div>
                           </div>
                           <div className="shrink-0 flex flex-col justify-center items-end bg-[#f8faff] px-3 py-2 rounded-xl border border-blue-100">
                             <div className="flex items-center gap-1 text-[9px] text-blue-500 font-bold">
                               <Activity className="w-3 h-3" /> Harga Satuan
                             </div>
                             <div className="text-[14px] font-black text-[#0066ff] mt-0.5">
                               Rp {selectedProduct.sellingPrice.toLocaleString('id-ID')}
                             </div>
                           </div>
                        </div>
                      )}

                      {/* Quantity Card */}
                      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-[8px] bg-blue-50 text-[#0066ff] flex items-center justify-center">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-gray-800 leading-none">Jumlah Pembelian</h4>
                            <p className="text-[9px] font-bold text-gray-500 mt-0.5">Pilih jumlah sesuai yang akan dijual</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between border border-gray-200 rounded-2xl p-1 shadow-sm bg-gray-50/50">
                          <button 
                            type="button"
                            onClick={() => setFormQuantity(Math.max(1, formQuantity - 1))}
                            className="w-16 h-12 bg-[#0066ff] hover:bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md shadow-blue-500/20"
                          >
                            <Minus className="w-6 h-6" strokeWidth={3} />
                          </button>
                          <div className="flex-1 flex items-center justify-center gap-1.5">
                            <input 
                              type="number" 
                              value={formQuantity}
                              onChange={e => setFormQuantity(parseInt(e.target.value) || 1)}
                              className="w-14 text-center text-[28px] font-black text-gray-800 bg-transparent focus:outline-none" 
                            />
                            <span className="text-[14px] font-black text-gray-500">pcs</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setFormQuantity(Math.min(selectedProduct?.currentStock || 1, formQuantity + 1))}
                            className="w-16 h-12 bg-[#0066ff] hover:bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md shadow-blue-500/20"
                          >
                            <Plus className="w-6 h-6" strokeWidth={3} />
                          </button>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between px-2">
                           <div className="flex items-center gap-1.5 text-gray-600">
                             <ClipboardList className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-black">Total Jumlah</span>
                           </div>
                           <div className="text-[12px] font-black text-gray-800">{formQuantity} pcs</div>
                        </div>
                      </div>

                      {/* Payment Method Card */}
                      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-[8px] bg-blue-50 text-[#0066ff] flex items-center justify-center">
                            <Banknote className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-gray-800 leading-none">Metode Pembayaran</h4>
                            <p className="text-[9px] font-bold text-gray-500 mt-0.5">Pilih salah satu metode pembayaran</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormPaymentMethod('TUNAI')}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 transition-all relative ${
                              formPaymentMethod === 'TUNAI' ? "border-[#0066ff] bg-[#0066ff] text-white shadow-lg shadow-blue-500/30" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300"
                            }`}
                          >
                            <Banknote className="w-6 h-6" />
                            <span className="text-[11px] font-black tracking-wide">Tunai</span>
                            {formPaymentMethod === 'TUNAI' && <div className="absolute right-2 top-2 bg-white rounded-full"><CheckCircle2 className="w-4 h-4 text-[#0066ff]" /></div>}
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormPaymentMethod('NON_TUNAI')}
                            className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border-2 transition-all relative ${
                              formPaymentMethod === 'NON_TUNAI' ? "border-[#0066ff] bg-[#0066ff] text-white shadow-lg shadow-blue-500/30" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300"
                            }`}
                          >
                            <QrCode className="w-6 h-6" />
                            <span className="text-[11px] font-black tracking-wide">Non Tunai</span>
                            <span className={`text-[8px] font-bold ${formPaymentMethod === 'NON_TUNAI' ? 'text-blue-100' : 'text-gray-400'}`}>QRIS / E-Wallet</span>
                            {formPaymentMethod === 'NON_TUNAI' && <div className="absolute right-2 top-2 bg-white rounded-full"><CheckCircle2 className="w-4 h-4 text-[#0066ff]" /></div>}
                          </button>
                        </div>

                        <label className={`flex items-center justify-between p-3 mt-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isPostClosing ? 'border-[#0066ff] bg-blue-50/50' : 'border-gray-100 bg-white hover:border-blue-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                              <History className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-gray-800 block">Penjualan Pasca-Closing</span>
                              <span className="text-[8px] font-bold text-gray-500 block leading-tight mt-0.5">Jualan setelah hitungan stok.</span>
                            </div>
                          </div>
                          <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${isPostClosing ? "bg-[#0066ff]" : "bg-gray-300"}`}>
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${isPostClosing ? "translate-x-4" : "translate-x-0"}`} />
                          </div>
                          <input type="checkbox" className="sr-only" checked={isPostClosing} onChange={e => setIsPostClosing(e.target.checked)} />
                        </label>
                      </div>

                      {/* Informasi Penjualan Card */}
                      <div className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-[8px] bg-blue-50 text-[#0066ff] flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <h4 className="text-[11px] font-black text-gray-800">Informasi Penjualan</h4>
                        </div>
                        
                        <div className="flex gap-2">
                           <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col justify-center items-center gap-1.5 text-center">
                             <div className="text-gray-400"><ShoppingCart className="w-5 h-5" /></div>
                             <div>
                               <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Total Terjual</p>
                               <p className="text-[14px] font-black text-gray-800 leading-none mt-1">{formQuantity} pcs</p>
                             </div>
                           </div>
                           <div className="flex-[1.3] bg-[#0066ff]/5 border border-[#0066ff]/20 rounded-xl p-3 flex flex-col justify-center items-center gap-1.5 text-center">
                             <div className="text-[#0066ff]"><Banknote className="w-5 h-5" /></div>
                             <div>
                               <p className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Total Penjualan</p>
                               <p className="text-[16px] font-black text-[#0066ff] leading-none mt-1">Rp {((selectedProduct?.sellingPrice || 0) * formQuantity).toLocaleString('id-ID')}</p>
                             </div>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Bar Step 2 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] sm:rounded-b-[32px] z-10">
                       <div className="flex gap-3">
                         <button
                           type="button"
                           onClick={() => setQuickSaleStep(1)}
                           className="w-[120px] bg-white border-2 border-gray-200 text-gray-600 py-3 rounded-xl font-black text-[12px] flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-gray-50"
                         >
                           <ArrowLeft className="w-4 h-4" /> Batal
                         </button>
                         <button
                           type="submit"
                           disabled={!selectedProduct}
                           className="flex-1 bg-[#0066ff] disabled:bg-gray-300 disabled:text-gray-500 text-white py-3 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95 uppercase tracking-wide"
                         >
                           <Store className="w-4 h-4" /> Konfirmasi Jual
                         </button>
                       </div>
                    </div>
                  </form>
                )}
              </div>
            );
          })()}
"""

lines[start_idx:end_idx+1] = [new_block]

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("SUCCESS")
