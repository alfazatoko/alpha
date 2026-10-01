const a = (
      <div className="mx-1.5 mb-3 mt-[-1.5rem] relative z-[40]">
        {/* BLUE CARD CAROUSEL */}
        <div className="bg-[#0070c0] rounded-t-[1.5rem] rounded-b-[2rem] shadow-lg border border-blue-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <i className="fa-solid fa-wallet text-6xl"></i>
          </div>
          
          <div className="absolute top-3 w-full flex justify-center gap-1.5 z-20 pointer-events-none">
            <div className="w-3.5 h-1 rounded-full bg-white"></div>
            <div className="w-1.5 h-1 rounded-full bg-white/40"></div>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full h-full pb-3 pt-6 px-4 gap-4">
            {/* Slide 1 */}
            <div className="snap-center min-w-full flex justify-between gap-3">
              <div className="flex-1 bg-white/10 rounded-2xl p-2.5 border border-white/20 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5">
                   <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0"><i className="fa-solid fa-building-columns text-[9px] text-white"></i></div>
                   <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest leading-tight">Aset Bank</span>
                </div>
                <p className="text-sm font-black text-white">{formatRupiah(props.saldoBank)}</p>
              </div>
              <div className="flex-1 bg-white/10 rounded-2xl p-2.5 border border-white/20 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5">
                   <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0"><i className="fa-solid fa-cash-register text-[9px] text-white"></i></div>
                   <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest leading-tight">Laci Kasir</span>
                </div>
                <p className="text-sm font-black text-white">{formatRupiah(ownerTotalLaci)}</p>
              </div>
            </div>
            {/* Slide 2 */}
            <div className="snap-center min-w-full flex justify-between gap-3">
              <div className="flex-1 bg-white/10 rounded-2xl p-2.5 border border-white/20 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5">
                   <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0"><i className="fa-solid fa-vault text-[9px] text-white"></i></div>
                   <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest leading-tight">Total aset likuid</span>
                </div>
                <p className="text-sm font-black text-white">{formatRupiah(props.saldoBank + ownerTotalLaci)}</p>
              </div>
              <div className="flex-1 bg-white/10 rounded-2xl p-2.5 border border-white/20 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5">
                   <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0"><i className="fa-solid fa-hand-holding-dollar text-[9px] text-white"></i></div>
                   <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest leading-tight">Total Aset masuk</span>
                </div>
                <p className="text-sm font-black text-white">{formatRupiah(ownerKasModal + ownerPenjualanDigital + ownerTotalAksesoris + ownerTotalAdmin)}</p>
              </div>
            </div>
          </div>
          
          <div className="px-4 pb-4 flex gap-3 relative z-10">
             <button onClick={() => props.setActiveView('view-isi-saldo')} className="flex-1 bg-white text-[#0070c0] rounded-xl py-2 flex items-center justify-center gap-1.5 font-black text-[10px] uppercase shadow-sm active:scale-95 transition">
               Kelola Aset <i className="fa-solid fa-arrow-right-long text-[9px]"></i>
             </button>
             <button onClick={() => setShowRincian(true)} className="flex-1 bg-transparent border border-white text-white rounded-xl py-2 flex items-center justify-center gap-1.5 font-black text-[10px] uppercase hover:bg-white/10 active:scale-95 transition">
               Rincian Laci <i className="fa-solid fa-arrow-right-long text-[9px]"></i>
             </button>
          </div>
        </div>
        
        {/* WHITE CAROUSEL BELOW */}
        <div className="bg-white rounded-b-[2rem] shadow-sm border border-gray-100 pt-7 pb-4 mx-1 -mt-5 relative z-[-1]">
          <div className="absolute top-7 right-0 left-0 flex justify-center gap-1.5 z-20 pointer-events-none">
            <div className="w-3.5 h-1 rounded-full bg-gray-300"></div>
            <div className="w-1.5 h-1 rounded-full bg-gray-200"></div>
            <div className="w-1.5 h-1 rounded-full bg-gray-200"></div>
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar w-full px-4 gap-4 mt-2">
            {/* Slide 1 */}
            <div className="snap-center min-w-full flex justify-between gap-3">
               <div className="flex-1">
                 <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight mb-1.5">Transaksi Hari Ini</p>
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><i className="fa-solid fa-receipt text-[10px]"></i></div>
                   <span className="text-[13px] font-black text-gray-800 tabular-nums">{ownerTotalTrx}</span>
                 </div>
               </div>
               <div className="w-px bg-gray-100"></div>
               <div className="flex-1 pl-2">
                 <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight mb-1.5">Total Transaksi Bulan Ini</p>
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0"><i className="fa-solid fa-chart-line text-[10px]"></i></div>
                   <span className="text-[13px] font-black text-gray-800 tabular-nums">{props.transactions.length}</span>
                 </div>
               </div>
            </div>
            {/* Slide 2 */}
            <div className="snap-center min-w-full flex justify-between gap-3">
               <div className="flex-1">
                 <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight mb-1.5">Fee & Laba Hari Ini</p>
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0"><i className="fa-solid fa-money-bill-trend-up text-[10px]"></i></div>
                   <span className="text-[13px] font-black text-emerald-600 tabular-nums">{formatRupiah(ownerTotalAdmin)}</span>
                 </div>
               </div>
               <div className="w-px bg-gray-100"></div>
               <div className="flex-1 pl-2">
                 <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight mb-1.5">Fee & Laba Bulan Ini</p>
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0"><i className="fa-solid fa-sack-dollar text-[10px]"></i></div>
                   <span className="text-[13px] font-black text-emerald-600 tabular-nums">{formatRupiah(props.totalPenjualan || ownerTotalAdmin)}</span> 
                 </div>
               </div>
            </div>
            {/* Slide 3 */}
            <div className="snap-center min-w-full flex justify-between gap-3">
               <div className="flex-1">
                 <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight mb-1.5">Volume Penjualan Hari Ini</p>
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0"><i className="fa-solid fa-chart-pie text-[10px]"></i></div>
                   <span className="text-[13px] font-black text-indigo-600 tabular-nums">{formatRupiah(ownerTotalVolume)}</span>
                 </div>
               </div>
               <div className="w-px bg-gray-100"></div>
               <div className="flex-1 pl-2">
                 <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight mb-1.5">Tarik Tunai Hari Ini</p>
                 <div className="flex items-center gap-2">
                   <div className="w-6 h-6 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0"><i className="fa-solid fa-money-bill-transfer text-[10px]"></i></div>
                   <span className="text-[13px] font-black text-rose-600 tabular-nums">{formatRupiah(ownerTotalTarik)}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
)
