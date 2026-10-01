import re

with open("src/views/LaporanView.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update useMemo signature
old_memo = "const { totalQtyLaku, totalUangKeseluruhan, totalUangQris, totalProfitVoucher } = useMemo(() => {"
new_memo = "const { totalQtyLaku, totalUangKeseluruhan, totalUangQris, totalProfitVoucher, totalPascaClosingQty } = useMemo(() => {"
content = content.replace(old_memo, new_memo)

old_return_early = "return { totalQtyLaku: 0, totalUangKeseluruhan: 0, totalUangQris: 0, totalProfitVoucher: 0 }"
new_return_early = "return { totalQtyLaku: 0, totalUangKeseluruhan: 0, totalUangQris: 0, totalProfitVoucher: 0, totalPascaClosingQty: 0 }"
content = content.replace(old_return_early, new_return_early)

# 2. Add pascaQty var
old_vars = """    let uang = 0
    let qris = 0
    let profit = 0"""
new_vars = """    let uang = 0
    let qris = 0
    let profit = 0
    let pascaQty = 0"""
content = content.replace(old_vars, new_vars)

# 3. Add pascaQty increment inside the loop
old_profit = """                  // Profit
                  const cogs = log.cogs || 0;
                  if (cogs > 0) {
                     profit += (amount - cogs);
                  }
               }
             })"""
new_profit = """                  // Profit
                  const cogs = log.cogs || 0;
                  if (cogs > 0) {
                     profit += (amount - cogs);
                  }
                  
                  // Pasca Closing Qty
                  if ((log.notes || '').includes('[PASCA-CLOSING]')) {
                     pascaQty += q;
                  }
               }
             })"""
content = content.replace(old_profit, new_profit)

# 4. Update useMemo return
old_return = """    return { 
      totalQtyLaku: qty, 
      totalUangKeseluruhan: uang, 
      totalUangQris: qris,
      totalProfitVoucher: profit
    }"""
new_return = """    return { 
      totalQtyLaku: qty, 
      totalUangKeseluruhan: uang, 
      totalUangQris: qris,
      totalProfitVoucher: profit,
      totalPascaClosingQty: pascaQty
    }"""
content = content.replace(old_return, new_return)

# 5. Add the Pasca Closing Box in the modal
old_modal_box = """              <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-4 relative mt-6 text-center">"""
new_modal_box = """              <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 rounded-2xl p-3 relative mt-6 text-center flex flex-col justify-center items-center">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-3 z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 whitespace-nowrap">PENJUALAN PASCA CLOSING</span>
                </div>
                <span className="text-lg font-black text-rose-600 mt-1 flex items-baseline gap-1">
                  {totalPascaClosingQty} pcs
                </span>
                <span className="text-[8px] font-bold text-rose-700/60 dark:text-rose-500/60 mt-0.5 uppercase tracking-widest">
                  Terjual di Akhir Sesi
                </span>
              </div>

              <div className="bg-orange-50/50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-4 relative mt-6 text-center">"""
content = content.replace(old_modal_box, new_modal_box)

with open("src/views/LaporanView.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated LaporanView modal!")
