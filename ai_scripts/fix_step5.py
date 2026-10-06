import os
import re

tab_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\components\AturStokTab.tsx'

with open(tab_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace handleCompleteHandover
new_handle = """
  const handleCompleteHandover = () => {
    if (onSyncSession) onSyncSession(null);
    setIsHandoverSuccess(true);
    onRecordHandover({
      initialStock: totalInitialStock,
      incomingStock: totalIncomingStock,
      finalStock: totalFinalStock,
      totalSold: totalSoldPcs,
      totalSales: totalSalesAmount,
      qrisAmount: totalDigitalAmount,
      qrisPcs: totalDigitalPcs,
      cashExpected: totalCashExpected,
      cashPhysical: physicalCashValue,
      cashDiff: cashDifference,
      note: catatanSelisih,
      toCashierId: 'NONE',
      toCashierName: 'Tutup Toko',
      isSelfHandover: true,
      items: items.map(i => ({
        ...i
      }))
    });
  };
"""

code = re.sub(r"const handleCompleteHandover = \(\) => \{[\s\S]*?items: items\.map\(i => \(\{[\s\S]*?\}\)\)\n\s*\}\);\n\s*\};", new_handle.strip(), code)

# Replace Action Button in Step 5
button_pattern = r"onClick=\{handleCompleteHandover\}\n\s*className=\{`px-4 py-2\.5 text-white[\s\S]*?\n\s*</button>"
new_button = """
                onClick={handleCompleteHandover}
                className="px-4 py-2.5 text-white text-[10px] sm:text-xs font-black rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5 uppercase tracking-wide whitespace-nowrap bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" /> SELESAI & TUTUP TOKO
              </button>
"""
code = re.sub(button_pattern, new_button.strip(), code)

with open(tab_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed handleCompleteHandover and button")
