const fs = require('fs');
const file = 'src/views/voucher-app/components/AturStokTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1 & 2
content = content.replace(/useState<1 \| 2 \| 3 \| 4>\(loadedSession\?\.currentStep \?\? 1\)/g, 'useState<1 | 2 | 3 | 4 | 5>(loadedSession?.currentStep as any ?? 1)');
content = content.replace(/\[1, 2, 3, 4\]\.map/g, '[1, 2, 3, 4, 5].map');
content = content.replace(/step: 1 \| 2; type: 'incoming'/g, 'step: 1 | 2 | 3; type: \\'incoming\\'');

// 9 - Sales calculations
content = content.replace(/items\.reduce\(\(sum, i\) => sum \+ Math\.max\(0, i\.initialStock - i\.finalStock\), 0\)/g, 'items.reduce((sum, i) => sum + Math.max(0, (i.initialStock + i.incomingStock) - i.finalStock), 0)');
content = content.replace(/items\.reduce\(\(sum, i\) => sum \+ \(Math\.max\(0, i\.initialStock - i\.finalStock\) \* i\.price\), 0\)/g, 'items.reduce((sum, i) => sum + (Math.max(0, (i.initialStock + i.incomingStock) - i.finalStock) * i.price), 0)');
content = content.replace(/const soldCount = Math\.max\(0, item\.initialStock - item\.finalStock\);/g, 'const soldCount = Math.max(0, (item.initialStock + item.incomingStock) - item.finalStock);');

// 10 - Handle Incoming
content = content.replace(
\  const handleIncomingDelta = (productId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newIncoming = Math.max(0, item.incomingStock + delta);
        return { 
          ...item, 
          incomingStock: newIncoming,
          initialStock: item.previousStock + newIncoming,
          finalStock: item.previousStock + newIncoming
        };
      }
      return item;
    }));
  };\,
\  const handleIncomingDelta = (productId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newIncoming = Math.max(0, item.incomingStock + delta);
        return { 
          ...item, 
          incomingStock: newIncoming,
          finalStock: item.finalStock + delta
        };
      }
      return item;
    }));
  };

  const handleSetIncomingDirect = (productId: string, val: number) => {
    setItems(prev => prev.map(item => {
      if (item.productId === productId) {
        const newIncoming = Math.max(0, val);
        const delta = newIncoming - item.incomingStock;
        return { 
          ...item, 
          incomingStock: newIncoming,
          finalStock: item.finalStock + delta
        };
      }
      return item;
    }));
  };\);

// Rename Step 4 to 5
content = content.replace(/4\. LANGKAH 4: SERAH TERIMA KASIR/g, '5. LANGKAH 5: SERAH TERIMA KASIR');
content = content.replace(/currentStep === 4 && !isHandoverSuccess/g, 'currentStep === 5 && !isHandoverSuccess');
content = content.replace(/setCurrentStep\(4\)/g, 'setCurrentStep(5)');

// Rename Step 3 to 4
content = content.replace(/3\. LANGKAH 3: CEK TUNAI VS NON-TUNAI/g, '4. LANGKAH 4: CEK TUNAI VS NON-TUNAI');
content = content.replace(/currentStep === 3 && !isHandoverSuccess/g, 'currentStep === 4 && !isHandoverSuccess');
content = content.replace(/setCurrentStep\(3\)/g, 'setCurrentStep(4)');
content = content.replace(/<div className="w-5 h-5 rounded-full bg-amber-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-\\[10px\\] shrink-0 mt-0.5 shadow-xs">\\s*3\\s*<\\/div>/, '<div className="w-5 h-5 rounded-full bg-amber-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">\\n                4\\n              </div>');

// Rename Step 2 to 3
content = content.replace(/2\. LANGKAH 2: HITUNG STOK AKHIR/g, '3. LANGKAH 3: HITUNG STOK AKHIR');
content = content.replace(/currentStep === 2 && !isHandoverSuccess/g, 'currentStep === 3 && !isHandoverSuccess');
content = content.replace(/<div className="w-5 h-5 rounded-full bg-emerald-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-\\[10px\\] shrink-0 mt-0.5 shadow-xs">\\s*2\\s*<\\/div>/, '<div className="w-5 h-5 rounded-full bg-emerald-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">\\n                3\\n              </div>');

// Edit Row Step Updates for Final (which was 2, now 3)
content = content.replace(/activeEditingRow.step === 2/g, 'activeEditingRow.step === 3');
content = content.replace(/\\{ step: 2, type: 'final'/g, '{ step: 3, type: \\'final\\'');
content = content.replace(/activeEditingRow\\.step === 1 \\? 'Edit Stok Awal' : 'Edit Sisa Akhir'/g, 'activeEditingRow.step === 1 ? \\'Edit Stok Awal\\' : activeEditingRow.step === 2 ? \\'Tambah Stok Baru\\' : \\'Edit Sisa Akhir\\'');

// Wait, the setCurrentStep(2) inside step 1 "Lanjut" button should stay 2!
// Wait, when I replaced setCurrentStep(2) -> setCurrentStep(3), wait I didn't write it above. So it's still 2! Good!

// Now inject Step 2 UI before Step 3.
const step2UI = \
      {/* ========================================================================= */}
      {/* 2. LANGKAH 2: TAMBAH STOK BARU (BARANG MASUK) */}
      {/* ========================================================================= */}
      {currentStep === 2 && !isHandoverSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2.5"
        >
          <div className="px-1 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">
                2
              </div>
              <div>
                <h3 className={\\\	ext-xs sm:text-sm font-bold tracking-tight leading-tight \\\\}>
                  Tambah Stok Baru (Barang Masuk)
                </h3>
                <p className={\\\	ext-[9.5px] sm:text-[10px] mt-0.5 leading-tight \\\\}>
                  Catat penambahan voucher baru jika ada barang masuk di tengah shift. Stok akan langsung bertambah!
                </p>
              </div>
            </div>
          </div>

          <div className={\\\w-full overflow-hidden rounded-xl border shadow-xs \\\\}>
            <table className="w-full table-fixed text-left border-collapse bg-transparent">
              <thead className={\\\order-b \\\\}>
                <tr className="text-[9px] sm:text-[10px] uppercase tracking-tight">
                  <th className="py-2 px-2 w-[42%] sm:w-[40%] font-bold">VOUCHER</th>
                  <th className="py-2 px-1 text-center w-[16%] sm:w-[20%] font-bold">AWAL</th>
                  <th className={\\\py-2 px-1 text-center w-[26%] sm:w-[20%] font-bold \\\\}>+ MASUK</th>
                  <th className="py-2 px-2 text-right w-[16%] sm:w-[20%] font-bold">TOTAL</th>
                </tr>
              </thead>
              <tbody className={\\\	ext-xs divide-y \\\\}>
                {filteredItems.map((item) => {
                  const isEditingIncoming = activeEditingRow.step === 2 && 
                                         activeEditingRow.type === 'incoming' && 
                                         activeEditingRow.productId === item.productId;
                  const productDetails = products.find(p => p.id === item.productId);
                  const nameParts = item.productName.split(' ');
                  const brandTitle = nameParts[0];
                  const variantSubtitle = nameParts.slice(1).join(' ');

                  return (
                    <tr 
                      key={item.productId} 
                      onClick={() => !isOwnerMode && setActiveEditingRow({ step: 2, type: 'incoming', productId: item.productId })}
                      className={\\\	ransition-colors \ \\\\}
                    >
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CompactOperatorLogo name={brandTitle} operator={productDetails?.operator} size="md" />
                          <div className="flex flex-col min-w-0 leading-tight">
                            <span className={\\\	ext-sm sm:text-base font-black truncate \\\\}>
                              {brandTitle}
                            </span>
                            <span className={\\\	ext-xs sm:text-[13px] font-bold truncate \\\\}>
                              {variantSubtitle || item.productName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className={\\\py-2 px-1 text-center font-mono font-bold text-xs sm:text-sm \\\\}>
                        {item.initialStock}
                      </td>
                      
                      <td className="py-2 px-1 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOwnerMode) setActiveEditingRow({ step: 2, type: 'incoming', productId: item.productId });
                          }}
                          disabled={isOwnerMode}
                          className={\\\inline-flex items-center justify-center min-w-[36px] py-1 px-2 rounded-lg border transition \ \\\\}
                        >
                          <span className="text-xs sm:text-sm font-black font-mono tracking-tight">
                            {item.incomingStock > 0 ? '+' + item.incomingStock : 0}
                          </span>
                        </button>
                      </td>

                      <td className={\\\py-2 px-2 text-right font-mono font-black text-xs sm:text-sm leading-tight \\\\}>
                        {item.initialStock + item.incomingStock}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end pt-2">
            <button 
              onClick={() => setCurrentStep(3)} 
              className="px-3.5 py-1.5 bg-blue-600 text-slate-900 dark:text-white rounded-lg font-bold text-[9px] sm:text-[10px] hover:bg-blue-500 transition flex items-center gap-1 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Lanjut Hitung Stok Akhir <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}

\;
content = content.replace(/\{\/\\* ========================================================================= \\*\/\\}\\s*\{\/\\* 3\\. LANGKAH 3: HITUNG STOK AKHIR \\(TUTUP SHIFT\\) \\*\/\\}/, step2UI + '      {/* ========================================================================= */}\\n      {/* 3. LANGKAH 3: HITUNG STOK AKHIR (TUTUP SHIFT) */}');

// The modal input for incoming stock! (Step 2)
// I need to add an input block for step 2 in the modal.
// Below \{isStep1 && (\ block, I will inject \{activeEditingRow.step === 2 && (\
const modalStep2 = \
                  {activeEditingRow.step === 2 && (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <label className={\\\	ext-xs font-bold \\\\}>
                          JUMLAH BARANG MASUK SAAT INI
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSetIncomingDirect(item.productId, item.incomingStock - 1)}
                            className={\\\w-12 h-12 rounded-2xl flex items-center justify-center transition active:scale-90 \\\\}
                          >
                            <Minus className="w-5 h-5" />
                          </button>

                          <div className={\\\elative w-28 h-16 rounded-2xl flex items-center justify-center border-2 \\\\}>
                            <input
                              type="number"
                              min="0"
                              value={item.incomingStock || ''}
                              onChange={(e) => handleSetIncomingDirect(item.productId, parseInt(e.target.value) || 0)}
                              className={\\\w-full text-center bg-transparent border-none outline-none font-black text-3xl font-mono \\\\}
                              placeholder="0"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSetIncomingDirect(item.productId, item.incomingStock + 1)}
                            className={\\\w-12 h-12 rounded-2xl flex items-center justify-center transition active:scale-90 shadow-md \\\\}
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        {[1, 5, 10, 50].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleSetIncomingDirect(item.productId, item.incomingStock + val)}
                            className={\\\py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 border \\\\}
                          >
                            <span className="text-[10px] opacity-70">Tambah</span>
                            <span>+{val}</span>
                          </button>
                        ))}
                      </div>
                      
                      {/* Simpan & Push ke Global Stock */}
                      <button
                        onClick={() => {
                          // Karena local update sudah terjadi via onUpdateProductStock di handleLockInitialStock,
                          // kita bisa memperbarui global product live juga saat button simpan ini ditekan!
                          if (productDetails && item.incomingStock > 0) {
                            // Hitung stock riil baru = initialStock + incomingStock - soldCount.
                            // Tapi soldCount mungkin update live, mending langsung panggil onUpdateProductStock.
                            onUpdateProductStock(item.productId, item.initialStock + item.incomingStock, 'restock');
                          }
                          setActiveEditingRow(prev => ({ ...prev, productId: null }));
                        }}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg transition active:scale-95 flex flex-col items-center justify-center"
                      >
                        <span>Simpan Stok Baru (Enter)</span>
                        <span className="text-[9px] font-normal opacity-80">Otomatis menambah stok kasir jualan saat ini</span>
                      </button>
                    </div>
                  )}
\;
content = content.replace(/\{!isStep1 && \\(/, modalStep2 + '\\n                  {activeEditingRow.step === 3 && (');

fs.writeFileSync(file, content);
