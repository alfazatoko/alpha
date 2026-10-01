import re

with open(r'c:\Users\Administrator\Desktop\ALFAZA CELL\ALPHA\src\views\AkunView.tsx', 'r') as f:
    content = f.read()

opens = len(re.findall(r'<div', content))
closes = len(re.findall(r'</div', content))
print(f"Opens: {opens}, Closes: {closes}")

# Also check for curly braces
c_opens = content.count('{')
c_closes = content.count('}')
print(f"Curly Opens: {c_opens}, Curly Closes: {c_closes}")
