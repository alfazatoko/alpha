const fs = require('fs');

let lines = fs.readFileSync('src/components/TransactionForm.tsx', 'utf8').split(/\r?\n/);

const newUI = `        <div className="relative group px-2">
          <div className="flex justify-between items-center mb-1 px-1">
            <label className="block text-[10px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
              <i className="fa-solid fa-align-left text-gray-400"></i> Keterangan
            </label>
            <label className="flex items-center gap-1 cursor-pointer bg-[#0066ff] px-1.5 py-0.5 rounded-md shadow-sm hover:bg-blue-700 transition-colors">
              <input type="checkbox" checked={isKetAuto} onChange={(e) => setIsKetAuto(e.target.checked)} className="w-3 h-3 accent-white rounded-sm" />
              <span className="text-[9px] font-bold text-white uppercase tracking-widest">OTOMATIS</span>
            </label>
          </div>
          <div className="relative">
            {isKetAuto && autoTextPrefix && (
              <div className="text-[9px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-t-lg border-b-0 flex items-center gap-1.5 uppercase tracking-tight">
                <i className="fa-solid fa-magic text-blue-400"></i>
                <span className="opacity-70">Otomatis ditambah:</span> {autoTextPrefix}
              </div>
            )}
            <textarea 
              ref={keteranganRef}
              onFocus={handleInputFocus}
              rows={1} 
              placeholder="Tulis catatan/tujuan di sini..." 
              value={keterangan}
              onChange={(e) => {
                setKeterangan(e.target.value.toUpperCase());
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setTimeout(() => nominalRef.current?.focus(), 10);
                }
              }}
              className={cn("w-full resize-none text-[11px] font-black py-1.5 min-h-[32px] px-3 border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all shadow-sm", isKetAuto && autoTextPrefix ? "rounded-b-lg border-t-0" : "rounded-lg")}
            ></textarea>
          </div>

          {/* Autocomplete Suggestions */}
          {presets && presets.length > 0 && (activeMode === 'DIGITAL' || activeMode === 'TARIK') && (
            <div className="mt-1 flex flex-wrap gap-1">
              {(() => {
                const searchQuery = keterangan.replace(/=/g, '').trim().toLowerCase();
                
                // Only show if user has typed something and there's a match
                if (searchQuery.length === 0) return null;
                
                const filtered = presets.filter(p => {
                  const pCat = p.kategori || 'Order Kuota';
                  return pCat === kategori && p.keterangan.toLowerCase().includes(searchQuery);
                });
                
                if (filtered.length === 0) return null;
                
                return filtered.map(p => {
                  const pCat = p.kategori || 'Order Kuota';
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setKeterangan(\`\${p.keterangan.toUpperCase()}\`);
                        if (pCat === 'Order Kuota') {
                          setNominal(p.modal.toLocaleString('id-ID').replace(/,/g, '.'));
                          setAdmin(p.jual.toLocaleString('id-ID').replace(/,/g, '.'));
                          adminRef.current?.focus();
                        } else {
                          nominalRef.current?.focus();
                        }
                        setIsKetAuto(true);
                      }}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-md transition-all text-left"
                    >
                      {pCat === 'Order Kuota' 
                        ? \`\${p.keterangan} (M:\${p.modal / 1000}k J:\${p.jual / 1000}k)\` 
                        : p.keterangan}
                    </button>
                  );
                })
              })()}
            </div>
          )}
        </div>`.split('\\n');

const newSave = `  const onSaveInternal = () => {
    setErrorMsg(null)
    
    // Combine manual keterangan with auto prefix if needed
    const finalKeteranganBase = (isKetAuto && autoTextPrefix) 
      ? (keterangan.trim() ? \`\${autoTextPrefix} \${keterangan.trim()}\` : autoTextPrefix)
      : keterangan;

    if (activeMode === 'AKSESORIS') {
      const cleanNominal = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
      if (cleanNominal <= 0) {
        setErrorMsg('Harga wajib diisi!')
        return
      }
      // Set admin=0 for aksesoris, isAdminNonTunai based on pay mode
      setAdmin('0')
      const isNonTunai = aksesorisPayMode === 'QRIS'
      onSave({ kategori, nominal, admin: '0', keterangan: finalKeteranganBase }, { activeTab: 'BARU', subTab: 'KHUSUS', isAdminNonTunai: isNonTunai })
      setIsKetAuto(true)
      return
    }
    
    // Validasi Khusus Transfer & Tarik Tunai
    if (activeMode === 'DIGITAL' || activeMode === 'TARIK') {
      const cleanNominal = parseInt(nominal.replace(/[^0-9]/g, '')) || 0
      const cleanAdmin = parseInt(admin.replace(/[^0-9]/g, '')) || 0
      
      if (cleanNominal <= 0 || cleanAdmin <= 0) {
        setErrorMsg('Nominal & Admin Wajib diisi!')
        return
      }

      // Validasi khusus Order Kuota: Jual HARUS lebih besar dari Modal
      if (kategori === 'Order Kuota') {
        if (cleanAdmin <= cleanNominal) {
          setErrorMsg(\`Harga JUAL (\${admin}) harus lebih besar dari MODAL (\${nominal})!\`)
          adminRef.current?.focus()
          return
        }
      } else {
        // Untuk kategori lain: Admin harus lebih kecil dari Nominal (reminder saja, tidak block)
        if (cleanAdmin >= cleanNominal) {
          setErrorMsg('⚠️ Perhatian: ADMIN biasanya lebih kecil dari NOMINAL. Pastikan tidak terbalik!')
          return
        }
      }
    }

    const activeTab = subMode === 'NORMAL' ? 'BARU' : 'LAIN'
    const subTab = subMode === 'NORMAL' ? 'KHUSUS' : subMode
    
    if (tujuanMasuk === '2X BAYAR (TUNAI & NON TUNAI)') {
      const nonTunaiAmount = parseInt(nominalNonTunaiSplit.replace(/\\D/g, '') || '0', 10)
      const tunaiAmount = parseInt(nominalCashSplit.replace(/\\D/g, '') || '0', 10)
      const totNominal = parseInt(nominal.replace(/\\D/g, '') || '0', 10)
      
      if (tunaiAmount + nonTunaiAmount !== totNominal) {
        setErrorMsg('Total Tunai + Non Tunai harus sama dengan Nominal!')
        return
      }
      
      const splitKeterangan = \`\${finalKeteranganBase} [SPLIT: Tunai \${tunaiAmount.toLocaleString('id-ID')}, NonTunai \${nonTunaiAmount.toLocaleString('id-ID')}]\`
      onSave({ kategori, nominal, admin, keterangan: splitKeterangan }, { activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai, isSplit: true, nonTunaiAmount })
    } else {
      onSave({ kategori, nominal, admin, keterangan: finalKeteranganBase }, { activeTab, subTab: subMode === 'NORMAL' ? 'KHUSUS' : (subTab as any), isAdminNonTunai })
    }
    setIsKetAuto(true)
  }`.split('\\n');

const newLogic = `  // Auto Keterangan Logic (Prefix calculation)
  const autoTextPrefix = React.useMemo(() => {
    if (!isKetAuto) return '';
    let autoText = '';
    if (activeMode === 'DIGITAL') {
      if (sumberAplikasi === 'BANK') autoText = \`Transfer Bank\`;
      else if (sumberAplikasi === 'FLIP') autoText = \`Transfer FLIP\`;
      else if (sumberAplikasi === 'ORDER KUOTA') autoText = \`Order Kuota\${nominal && nominal !== '0' ? \` \${nominal}\` : ''}\`;
      else autoText = \`Transfer \${sumberAplikasi}\`;
    } else if (activeMode === 'TARIK') {
      autoText = \`TARIK_TUNAI|\${selectedSumber}\`;
    } else {
      autoText = \`\${kategori}\`;
      if (nominal && nominal !== '0' && kategori !== 'Order Kuota') autoText += \` \${nominal}\`;
    }
    return autoText.toUpperCase();
  }, [isKetAuto, kategori, nominal, activeMode, selectedBank, selectedSumber, sumberAplikasi]);`.split('\\n');

// Replace from bottom to top so line numbers don't shift!
lines.splice(743, 823 - 744 + 1, ...newUI);
lines.splice(430, 493 - 431 + 1, ...newSave);
lines.splice(138, 155 - 139 + 1, ...newLogic);

fs.writeFileSync('src/components/TransactionForm.tsx', lines.join('\\n'));
console.log("DONE");
