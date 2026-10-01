import sys

filepath = 'src/components/TransactionForm.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_val = "const val = e.target.value.toUpperCase();"
new_val = "const val = e.target.value ? e.target.value.charAt(0).toUpperCase() + e.target.value.slice(1) : '';"

content = content.replace(old_val, new_val)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("SUCCESS")
