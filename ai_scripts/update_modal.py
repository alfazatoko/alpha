import os

tab_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\components\AturStokTab.tsx'

with open(tab_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Update success title
code = code.replace(
    'Serah Terima Berhasil Diselesaikan!',
    'Tutup Toko Berhasil!'
)

# Update success description
code = code.replace(
    'Shift {activeCashier.name} telah selesai. Stok sisa ({totalFinalStock} Pcs) sudah disalin ke akun <span className={`font-semibold ${isLight ? \'text-slate-900\' : \'text-slate-700 dark:text-slate-200\'}`}>{selectedToCashier.name}</span>. Kasir penerima silakan login dengan akun masing-masing.',
    'Shift {activeCashier.name} telah selesai ditutup. Semua sisa stok fisik ({totalFinalStock} Pcs) dan laporan tersimpan aman. Toko sekarang siap dibuka kembali oleh kasir manapun.'
)

with open(tab_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Modal text updated")
