import sys

filepath = 'src/views/voucher-app/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "} from 'lucide-react';" in line:
        lines.insert(i, "  Store,\n  CheckCircle2,\n")
        break

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("SUCCESS")
