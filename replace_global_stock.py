import os
import re

app_tsx_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\App.tsx'
products_tsx_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\components\ProductsTab.tsx'

with open(app_tsx_path, 'r', encoding='utf-8') as f:
    app_code = f.read()

# Replace cashier_id in fetchSQLData
app_code = app_code.replace(
    ".eq('cashier_id', targetCashierId)",
    ".eq('cashier_id', 'GLOBAL')"
)

# Replace cashier_id in upserts
app_code = app_code.replace(
    "cashier_id: cashiers[activeCashierIndex]?.id || 'c1'",
    "cashier_id: 'GLOBAL'"
)
app_code = app_code.replace(
    "cashier_id: toCashierId",
    "cashier_id: 'GLOBAL'"
)

# Remove the zeroUpserts logic from handover in App.tsx
pattern = r"const zeroUpserts = finalProducts\.map\(p => \(\{\s*store_id: activeStoreId,\s*product_id: p\.id,\s*cashier_id: fromCashierId,\s*current_stock: 0 \/\/[^\n]*\s*\}\)\);"
app_code = re.sub(pattern, "const zeroUpserts = [];", app_code)

# Remove zeroUpserts from upsert array (though empty array is fine too)
# Actually, if we just keep `const zeroUpserts = [];` it's fine.

with open(app_tsx_path, 'w', encoding='utf-8') as f:
    f.write(app_code)

print("App.tsx modified")

with open(products_tsx_path, 'r', encoding='utf-8') as f:
    prod_code = f.read()

# Replace copyTargetCashierId to 'GLOBAL'
prod_code = prod_code.replace(
    ".eq('cashier_id', copyTargetCashierId)",
    ".eq('cashier_id', 'GLOBAL')"
)

prod_code = prod_code.replace(
    "cashier_id: copyTargetCashierId",
    "cashier_id: 'GLOBAL'"
)

with open(products_tsx_path, 'w', encoding='utf-8') as f:
    f.write(prod_code)

print("ProductsTab.tsx modified")
