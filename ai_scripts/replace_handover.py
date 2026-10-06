import os
import re

app_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\App.tsx'

with open(app_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Using regex to find handleExecuteShiftHandover
pattern = r"  const handleExecuteShiftHandover = \([\s\S]*?setShowHandoverModal\(false\);\n  \};"

new_func = """  const handleExecuteShiftHandover = (
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

    const newHandover: ShiftHandover = {
      id: `handover-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromCashierId: activeCashier.id,
      fromCashierName,
      toCashierId: 'NONE',
      toCashierName: 'Tutup Toko',
      totalProductsCount,
      totalStockTransferred,
      inventoryValue,
      status: 'Tutup Toko (Closing)',
      notes: customNotes || 'Tutup shift toko - stok direkap'
    };

    const updatedHandovers = [newHandover, ...shiftHandovers];
    
    // OVERWRITE STOCKS ON HANDOVER (SQL SYNC)
    if (activeStoreId) {
      const handoverUpserts = finalProducts.map(p => ({
        store_id: activeStoreId,
        product_id: p.id,
        cashier_id: 'GLOBAL',
        current_stock: p.currentStock
      }));
      supabase.from('voucher_stocks').upsert(handoverUpserts, { onConflict: 'store_id,product_id,cashier_id' }).then(res => console.log('Upsert handover:', res));
    }

    const newTrx: Transaction = {
      id: `trx-handover-${Date.now()}`,
      type: 'SERAH_TERIMA',
      quantity: totalStockTransferred,
      amount: inventoryValue,
      cashierName: fromCashierName,
      timestamp: new Date().toISOString(),
      notes: customNotes || `Tutup shift ${fromCashierName}`
    };

    const updatedTrx = [newTrx, ...transactions];

    const updatedNotifs = pushNotification(
      'transfer',
      'Tutup Toko Berhasil!',
      `${fromCashierName} telah menutup toko. Siap untuk shift berikutnya.`,
      notifications
    );

    // KOSONGKAN STOK LOKAL AGAR KASIR BERIKUTNYA BISA MULAI DARI 0 SEBELUM REKAP ONLINE
    const zeroedProducts: VoucherProduct[] = products.map(p => ({ ...p, currentStock: 0 }));
    const fromPrefix = `v_${storeKey}_${activeCashier.id}`;
    localStorage.setItem(`${fromPrefix}_products`, JSON.stringify(zeroedProducts));
    setProducts(sortVoucherProducts(zeroedProducts));

    setShiftHandovers(updatedHandovers);
    setTransactions(updatedTrx);
    setNotifications(updatedNotifs);

    // RESET SESI ONLINE (AGAR TIDAK ADA KASIR YANG AKTIF MENJAGA TOKO)
    syncGlobalActiveCashier(null);
    syncGlobalShiftSession(null);

    setHandoverSuccessSummary(newHandover);
    setShowHandoverSuccessOverlay(true);
    setShowHandoverModal(false);
  };"""

new_code = re.sub(pattern, new_func, code, count=1)

if code != new_code:
    with open(app_path, 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Successfully replaced handleExecuteShiftHandover.")
else:
    print("Failed to replace handleExecuteShiftHandover.")
