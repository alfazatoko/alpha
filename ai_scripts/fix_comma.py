import sys

filepath = 'src/views/voucher-app/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Palette\n  Store,', 'Palette,\n  Store,')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")
