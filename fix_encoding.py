#!/usr/bin/env python3
"""Fix double-encoded UTF-8 (mojibake) in AkunView.tsx"""
import sys

filepath = r"c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\AkunView.tsx"

with open(filepath, 'rb') as f:
    raw = f.read()

# The file is UTF-8 but some emoji were double-encoded (UTF-8 bytes interpreted as Latin-1 then re-encoded as UTF-8)
# Strategy: decode as UTF-8, then find known mojibake patterns and replace them

content = raw.decode('utf-8')

# Map of mojibake -> correct character
replacements = {
    '\u00f0\u0178\u201c\u0160': '\U0001F4CA',  # 📊
    '\u00f0\u0178\u2019\u00bc': '\U0001F4BC',  # 💼
    '\u00f0\u0178\u0... ': '',  # various broken patterns
    '\u00c2\u00b7': '\u00b7',  # · (middle dot)
    '\u00e2\u20ac\u201c': '\u2013',  # – (en dash)
    '\u00e2\u20ac\u00a2': '\u2022',  # • (bullet)
}

# More targeted approach: find lines with known garbled patterns and fix them
lines = content.split('\n')
fixed_count = 0

for i, line in enumerate(lines):
    original = line
    
    # Fix "📊 Kehadiran Bulan Ini" - line ~2216
    if 'Kehadiran Bulan Ini' in line and ('dY' in line or '\u00f0' in line or '\u0178' in line):
        # Replace the garbled emoji prefix before "Kehadiran"
        idx = line.index('Kehadiran Bulan Ini')
        # Find the start of the garbled emoji (look back from "Kehadiran")
        prefix_start = idx - 1
        while prefix_start > 0 and line[prefix_start-1] not in '>"':
            prefix_start -= 1
        garbled = line[prefix_start:idx]
        line = line[:prefix_start] + '\U0001F4CA ' + line[idx:]
    
    # Fix "💼 Masa Kerja" - line ~2264
    if 'Masa Kerja' in line and ('dY' in line or '\u00f0' in line or '\u0178' in line):
        idx = line.index('Masa Kerja')
        prefix_start = idx - 1
        while prefix_start > 0 and line[prefix_start-1] not in '>"':
            prefix_start -= 1
        line = line[:prefix_start] + '\U0001F4BC ' + line[idx:]
    
    # Fix "🎁 Bonus!" - line ~2276
    if 'Bonus!' in line and ('dY' in line or '\u00f0' in line or '\u0178' in line):
        idx = line.index('Bonus!')
        prefix_start = idx - 1
        while prefix_start > 0 and line[prefix_start-1] not in '>"':
            prefix_start -= 1
        line = line[:prefix_start] + '\U0001F381 ' + line[idx:]
    
    # Fix "🧑 Data Pribadi" - line ~2284
    if 'Data Pribadi' in line and ('dY' in line or '\u00f0' in line or '\u0178' in line):
        idx = line.index('Data Pribadi')
        prefix_start = idx - 1
        while prefix_start > 0 and line[prefix_start-1] not in '>"':
            prefix_start -= 1
        line = line[:prefix_start] + '\U0001F9D1 ' + line[idx:]
    
    # Fix "– Ketuk" (en-dash)
    if 'Belum Dibayar' in line and 'Ketuk' in line:
        # Find garbled en-dash between them
        line = line.replace('\u00e2\u20ac\u201c', '\u2013')
        # Also try other mojibake pattern
        line = line.replace('\u00e2\u0080\u0093', '\u2013')
    
    if line != original:
        lines[i] = line
        fixed_count += 1
        print(f"Fixed line {i+1}")

content = '\n'.join(lines)

# Also fix remaining comment mojibake patterns
content = content.replace('\u00e2\u0080\u0094', '\u2014')  # em dash in comments
content = content.replace('\u00e2\u0080\u0093', '\u2013')  # en dash  

with open(filepath, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nTotal lines fixed: {fixed_count}")
print("Done!")
