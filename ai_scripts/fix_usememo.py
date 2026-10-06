with open("src/views/voucher-app/components/AturStokTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import re

old_logic = """  const filteredItems = useMemo(() => {
    // Filter to ensure only products that are still visible (not hidden by owner) are shown
    const activeItems = items.filter(item => products.some(p => p.id === item.productId));
    
    if (selectedOperator === 'SEMUA') return activeItems;
    return activeItems.filter(item => {
      const brand = item.productName.split(' ')[0].toLowerCase();
      const op = selectedOperator.toLowerCase();
      
      if (op === 'indosat' || op === 'im3') {
        return brand.includes('indosat') || brand.includes('im3') || brand.includes('isat');
      }
      if (op === 'tsel' || op === 'telkomsel') {
        return brand.includes('telkomsel') || brand.includes('tsel');
      }
      if (op === 'three' || op === '3') {
        return brand.includes('three') || brand.includes('3');
      }
      return brand.includes(op);
    });
  }, [items, selectedOperator]);"""

new_logic = """  const filteredItems = useMemo(() => {
    // Filter to ensure only products that are still visible (not hidden by owner) are shown
    const activeItems = items.filter(item => products.some(p => p.id === item.productId));
    
    let result = activeItems;
    if (selectedOperator !== 'SEMUA') {
      result = activeItems.filter(item => {
        const brand = item.productName.split(' ')[0].toLowerCase();
        const op = selectedOperator.toLowerCase();
        
        if (op === 'indosat' || op === 'im3') {
          return brand.includes('indosat') || brand.includes('im3') || brand.includes('isat');
        }
        if (op === 'tsel' || op === 'telkomsel') {
          return brand.includes('telkomsel') || brand.includes('tsel');
        }
        if (op === 'three' || op === '3') {
          return brand.includes('three') || brand.includes('3');
        }
        return brand.includes(op);
      });
    }

    // SORT THE ARRAY TO MATCH THE VISUAL GROUPING ORDER
    const operatorsList = ['Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren', 'Lainnya'];
    const checkOp = (safeOp: string, tgt: string) => {
      if (tgt === 'telkomsel' && (safeOp.includes('tsel') || safeOp.includes('telkomsel'))) return true;
      if (tgt === 'tri' && (safeOp.includes('tri') || safeOp.includes('three') || safeOp.includes('3'))) return true;
      if (tgt === 'indosat' && (safeOp.includes('indosat') || safeOp.includes('im3') || safeOp.includes('isat'))) return true;
      return safeOp.includes(tgt);
    };

    const sortedResult: StockAuditItem[] = [];
    operatorsList.forEach(op => {
      const opItems = result.filter(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (!p) return false;
        const safeOp = (p.operator || '').toLowerCase();
        return checkOp(safeOp, op.toLowerCase()) || 
          (op === 'Lainnya' && !operatorsList.slice(0,6).some(o => checkOp(safeOp, o.toLowerCase())));
      });
      sortedResult.push(...opItems);
    });

    return sortedResult;
  }, [items, selectedOperator, products]);"""

content = content.replace(old_logic, new_logic)

with open("src/views/voucher-app/components/AturStokTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("useMemo logic replaced successfully.")
