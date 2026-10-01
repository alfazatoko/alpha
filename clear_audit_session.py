import os
import re

app_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\App.tsx'

with open(app_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Let's insert localStorage.removeItem(`audit_${storeKey}_${activeCashier.id}`);
target_text = "syncGlobalActiveCashier(null);\n      syncGlobalShiftSession(null);"
replacement = "syncGlobalActiveCashier(null);\n      syncGlobalShiftSession(null);\n      localStorage.removeItem(`audit_${storeKey}_${activeCashier.id}`);"

code = code.replace(target_text, replacement)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Local session cleared on close")
