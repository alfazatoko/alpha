import re

with open("src/views/voucher-app/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_logic = """                        const updatedDetailed = [newDetailedRecord, ...detailedHandovers];
                        setDetailedHandovers(updatedDetailed);

                        // Jalankan handover — menyalin stok ke kasir penerima
                        // Kasir yang login TIDAK DIGANTI
                        handleExecuteShiftHandover(
                          `Serah terima: Stok fisik ${handoverData.finalStock} PCS, Kas Rp${handoverData.cashPhysical?.toLocaleString('id-ID')}`,
                          toCashierId,
                          toCashierName,
                          finalProductsForReceiver,
                          handoverData.isSelfHandover
                        );
                        saveState(products, transactions, notifications, shiftHandovers, updatedDetailed);"""

new_logic = """                        const updatedDetailed = [newDetailedRecord, ...detailedHandovers];
                        setDetailedHandovers(updatedDetailed);

                        // Generate transactions for items sold during shift (pasca closing)
                        const newTransactions: any[] = [];
                        (handoverData.items || []).forEach((item: any) => {
                          const initial = item.initialStock || 0;
                          const incoming = item.incomingStock || 0;
                          const final = item.finalStock || 0;
                          const soldQty = (initial + incoming) - final;
                          
                          if (soldQty > 0) {
                            const p = products.find(prod => prod.id === item.productId);
                            newTransactions.push({
                              id: `trx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                              type: 'PENJUALAN',
                              productId: item.productId,
                              productName: item.productName,
                              quantity: soldQty,
                              amount: soldQty * item.price,
                              cogs: p ? (p.costPrice * soldQty) : 0,
                              cashierName: activeCashier.name,
                              timestamp: now.toISOString(),
                              notes: 'Pasca Closing',
                              paymentMethod: 'TUNAI' // Default asumsi tunai jika tidak tercatat qris per item
                            });
                          }
                        });
                        
                        const updatedTransactions = [...newTransactions, ...transactions];
                        if (newTransactions.length > 0) {
                          setTransactions(updatedTransactions);
                        }

                        // Jalankan handover — menyalin stok ke kasir penerima
                        // Kasir yang login TIDAK DIGANTI
                        handleExecuteShiftHandover(
                          `Serah terima: Stok fisik ${handoverData.finalStock} PCS, Kas Rp${handoverData.cashPhysical?.toLocaleString('id-ID')}`,
                          toCashierId,
                          toCashierName,
                          finalProductsForReceiver,
                          handoverData.isSelfHandover
                        );
                        saveState(products, updatedTransactions, notifications, shiftHandovers, updatedDetailed);"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open("src/views/voucher-app/App.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Handover transactions logic injected successfully.")
else:
    print("Error: Could not find old_logic block.")
