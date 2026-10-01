with open("src/views/voucher-app/components/AturStokTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# We need to replace the logic inside opItems filtering
old_logic = """const safeOp = (p.operator || '').toLowerCase();
                      return safeOp.includes(op.toLowerCase()) || 
                        (op === 'Lainnya' && !operatorsList.slice(0,6).some(o => safeOp.includes(o.toLowerCase())));"""

new_logic = """const safeOp = (p.operator || '').toLowerCase();
                      const checkOp = (o) => {
                        const tgt = o.toLowerCase();
                        if (tgt === 'telkomsel' && (safeOp.includes('tsel') || safeOp.includes('telkomsel'))) return true;
                        if (tgt === 'tri' && (safeOp.includes('tri') || safeOp.includes('three') || safeOp.includes('3'))) return true;
                        if (tgt === 'indosat' && (safeOp.includes('indosat') || safeOp.includes('im3') || safeOp.includes('isat'))) return true;
                        return safeOp.includes(tgt);
                      };
                      return checkOp(op) || (op === 'Lainnya' && !operatorsList.slice(0,6).some(o => checkOp(o)));"""

content = content.replace(old_logic, new_logic)

with open("src/views/voucher-app/components/AturStokTab.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Grouping logic fixed.")
