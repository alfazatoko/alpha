import os
import re

app_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\App.tsx'
tab_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\components\AturStokTab.tsx'

with open(app_path, 'r', encoding='utf-8') as f:
    app_code = f.read()

# Refactor handleExecuteShiftHandover in App.tsx
new_handover_logic = """
    const handleExecuteShiftHandover = (
      customNotes: string,
      toCashierIdOverride?: string,
      toCashierNameOverride?: string,
      finalProductsOverride?: VoucherProduct[],
      isSelfHandover?: boolean
    ) => {
      const storeKey = activeStoreId || 'default';
      const finalProducts = finalProductsOverride || products;
      const totalProductsCount = finalProducts.length;
      const totalStockTransferred = finalProducts.reduce((acc, p) => acc + p.currentStock, 0);
      const inventoryValue = finalProducts.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);
  
      const fromCashierName = activeCashier.name;
      const toCashierId = 'NONE';
      const toCashierName = 'Toko Tutup';
  
      const newHandover: ShiftHandover = {
        id: `handover-${Date.now()}`,
        timestamp: new Date().toISOString(),
        fromCashierId: activeCashier.id,
        fromCashierName,
        toCashierId,
        toCashierName,
        totalProductsCount,
        totalStockTransferred,
        inventoryValue,
        status: 'Tutup Shift Selesai',
        notes: customNotes || 'Tutup shift selesai - Menunggu kasir baru buka toko.'
      };
  
      const updatedHandovers = [newHandover, ...shiftHandovers];
      
      const newTrx: Transaction = {
        id: `trx-handover-${Date.now()}`,
        type: 'SERAH_TERIMA',
        quantity: totalStockTransferred,
        amount: inventoryValue,
        cashierName: fromCashierName,
        timestamp: new Date().toISOString(),
        notes: `Tutup shift selesai. Sisa stok: ${totalStockTransferred} pcs.`
      };
      
      const updatedTrx = [newTrx, ...transactions];
      
      const updatedNotifs = pushNotification(
        'success',
        'Tutup Shift Berhasil!',
        `${fromCashierName} telah menutup shift. Toko siap dibuka oleh kasir selanjutnya.`,
        notifications
      );
      
      setShiftHandovers(updatedHandovers);
      setTransactions(updatedTrx);
      setNotifications(updatedNotifs);

      // Kunci utama: lepaskan kasir aktif!
      syncGlobalActiveCashier(null);
      syncGlobalShiftSession(null);
      
      setHandoverSuccessSummary(newHandover);
      setShowHandoverSuccessOverlay(true);
      setShowHandoverModal(false);
    };
"""

app_pattern = r"const handleExecuteShiftHandover = \([\s\S]*?setShowHandoverModal\(false\);\n    \};"
app_code = re.sub(app_pattern, new_handover_logic.strip(), app_code)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(app_code)


with open(tab_path, 'r', encoding='utf-8') as f:
    tab_code = f.read()

# Replace Step 5 Title and remove "Pilih Kasir Penerima"
tab_code = tab_code.replace("Serah Terima Kasir", "Rincian Akhir Closing")
tab_code = tab_code.replace("Shift {activeCashier.name} selesai - pilih kasir penerima stok.", "Shift selesai. Pastikan ringkasan akhir sudah sesuai.")

# Remove PILIH KASIR PENERIMA block
select_cashier_pattern = r"\{\/\* ===== PILIH KASIR PENERIMA ===== \*\/\}[\s\S]*?\{\/\* Action Buttons \- hidden for owner \*\/\}?"
# We will just replace it with empty, up to "Action Buttons"
tab_code = re.sub(select_cashier_pattern, "{/* Action Buttons - hidden for owner */", tab_code)

# Replace the button text
button_pattern = r"onClick=\{handleCompleteHandover\}[\s\S]*?>\s*(?:Serah Terima|Selesai & Serah Terima) <ArrowRight"
button_repl = "onClick={handleCompleteHandover}\n                className={`px-4 py-2.5 text-white text-[10px] sm:text-xs font-black rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5 uppercase tracking-wide whitespace-nowrap bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400`}>\n                SELESAI & TUTUP TOKO <ArrowRight"
tab_code = re.sub(r"onClick=\{handleCompleteHandover\}[\s\S]*?>\s*(?:Serah Terima|Selesai & Serah Terima) <ArrowRight", "onClick={handleCompleteHandover}\n                className={`px-4 py-2.5 text-white text-[10px] sm:text-xs font-black rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5 uppercase tracking-wide whitespace-nowrap bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400`}>\n                SELESAI & TUTUP TOKO <ArrowRight", tab_code)

# Change the button in Step 4 that says "Serah Terima" to "Tutup Toko"
tab_code = tab_code.replace("Serah Terima <ArrowRight", "Tutup Toko <ArrowRight")

with open(tab_path, 'w', encoding='utf-8') as f:
    f.write(tab_code)

print("Simplification complete")
