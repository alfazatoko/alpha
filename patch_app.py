import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Calculate penjualanVoucherTunai
old_saldo_kas = """  // Saldo Laci Kasir (Cumulative Calculation)
  const totalSaldoKas = kasModal + penjualanDigital + totalAksesoris + totalAdmin - totalTarik"""
new_saldo_kas = """  // Calculate Penjualan Voucher Tunai for Today (for Saldo Laci Kasir)
  let penjualanVoucherTunai = 0;
  if (targetStoreId) {
    let cashierIds = ['c1', 'cashier-1'];
    if (kasirList) {
      const keys = Object.keys(kasirList);
      if (keys.length > 0) {
        cashierIds = [...cashierIds, ...keys.map(k => `c_${k}`)];
      }
    }
    if (filterKasir && filterKasir !== 'Semua') cashierIds = [`c_${filterKasir}`];
    
    cashierIds.forEach(cId => {
      try {
        const saved = localStorage.getItem(`v_${targetStoreId}_${cId}_transactions`);
        if (saved) {
          const txs = JSON.parse(saved);
          if (Array.isArray(txs)) {
            txs.forEach((log: any) => {
              if (log.type === 'PENJUALAN' && log.timestamp && log.timestamp.startsWith(todayISO)) {
                const amount = log.amount || 0;
                if (!(log.paymentMethod === 'NON_TUNAI' || log.paymentMethod === 'QRIS' || log.paymentMethod === 'TRANSFER' || (log.notes || '').includes('[NON_TUNAI]') || (log.notes || '').includes('[QRIS]') || (log.notes || '').includes('[TRANSFER]'))) {
                  penjualanVoucherTunai += amount;
                }
              }
            });
          }
        }
      } catch (e) {}
    });
  }

  // Saldo Laci Kasir (Cumulative Calculation)
  const totalSaldoKas = kasModal + penjualanDigital + totalAksesoris + totalAdmin - totalTarik + penjualanVoucherTunai;"""
content = content.replace(old_saldo_kas, new_saldo_kas)

# 2. Pass penjualanVoucherTunai to BerandaView
old_beranda = """                      penjualanDigital={penjualanDigital}
                      kasModal={kasModal}
                      kasirName={account.name}"""
new_beranda = """                      penjualanDigital={penjualanDigital}
                      penjualanVoucherTunai={penjualanVoucherTunai}
                      kasModal={kasModal}
                      kasirName={account.name}"""
content = content.replace(old_beranda, new_beranda)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Patched App.tsx!")
