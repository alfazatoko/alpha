import os
import re

app_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\App.tsx'

with open(app_path, 'r', encoding='utf-8') as f:
    code = f.read()

sort_func = """
export const sortVoucherProducts = (products: VoucherProduct[]) => {
  return [...products].sort((a, b) => {
    const getDays = (name: string) => {
      const match = name.match(/(\\d+)\\s*Hari/i);
      if (match) return parseInt(match[1], 10);
      return 999;
    };
    const daysA = getDays(a.name);
    const daysB = getDays(b.name);
    
    if (daysA !== daysB) {
      return daysA - daysB;
    }
    
    if (a.sellingPrice !== b.sellingPrice) {
      return a.sellingPrice - b.sellingPrice;
    }
    
    const getGB = (name: string) => {
      const match = name.match(/([\\d\\.]+)\\s*GB/i);
      if (match) return parseFloat(match[1]);
      return 0;
    };
    const gbA = getGB(a.name);
    const gbB = getGB(b.name);
    if (gbA !== gbB) {
      return gbA - gbB;
    }
    
    return a.name.localeCompare(b.name);
  });
};
"""

if "export const sortVoucherProducts" not in code:
    code = code.replace("const App = () => {", sort_func + "\nconst App = () => {")

replacements = [
    ("setProducts(mapped);", "setProducts(sortVoucherProducts(mapped));"),
    ("setProducts(currentProducts);", "setProducts(sortVoucherProducts(currentProducts));"),
    ("setProducts(updatedProducts);", "setProducts(sortVoucherProducts(updatedProducts));"),
    ("setProducts(zeroedProducts);", "setProducts(sortVoucherProducts(zeroedProducts));"),
    ("setProducts(theirProducts);", "setProducts(sortVoucherProducts(theirProducts));"),
    ("setProducts(INITIAL_PRODUCTS);", "setProducts(sortVoucherProducts(INITIAL_PRODUCTS));"),
    ("if (data.products) setProducts(data.products);", "if (data.products) setProducts(sortVoucherProducts(data.products));")
]

for old, repl in replacements:
    code = code.replace(old, repl)

prev_pattern = r"setProducts\(prev => \{\s*const updated = \[newProduct, \.\.\.prev\];"
prev_replacement = r"setProducts(prev => {\n      const updated = sortVoucherProducts([newProduct, ...prev]);"
code = re.sub(prev_pattern, prev_replacement, code)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Sorting applied successfully")
