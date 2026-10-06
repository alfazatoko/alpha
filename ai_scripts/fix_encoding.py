import re

filepath = r"c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\AkunView.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
fixed = 0

for i, line in enumerate(lines):
    orig = line
    
    if 'Kehadiran Bulan Ini' in line and 'tracking-widest' in line:
        line = re.sub(r'>[^<]*Kehadiran Bulan Ini', '>\U0001F4CA Kehadiran Bulan Ini', line, count=1)
    
    if 'Masa Kerja</p>' in line and 'tracking-widest' in line:
        line = re.sub(r'>[^<]*Masa Kerja</p>', '>\U0001F4BC Masa Kerja</p>', line, count=1)
    
    if 'Bonus!</span>' in line and 'animate-bounce' in line:
        line = re.sub(r'>[^<]*Bonus!</span>', '>\U0001F381 Bonus!</span>', line, count=1)
    
    if 'Data Pribadi</p>' in line and 'tracking-widest' in line:
        line = re.sub(r'>[^<]*Data Pribadi</p>', '>\U0001F9D1 Data Pribadi</p>', line, count=1)
    
    # Fix en-dash in "Belum Dibayar" line
    if 'Belum Dibayar' in line and 'Ketuk untuk Lunasi' in line:
        line = re.sub(r'Belum Dibayar[^\w]*Ketuk', 'Belum Dibayar - Ketuk', line)
    
    if line != orig:
        lines[i] = line
        fixed += 1
        print(f"Fixed line {i+1}: {line.strip()[:80]}...")

content = '\n'.join(lines)

with open(filepath, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nFixed {fixed} lines total.")
