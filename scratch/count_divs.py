with open(r'c:\Users\Administrator\Desktop\ALFAZA CELL\ALPHA\src\views\LaporanView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

open_divs = 0
for i, line in enumerate(lines):
    open_divs += line.count('<div')
    open_divs -= line.count('</div>')
    print(f"{i+1}: {open_divs}")
