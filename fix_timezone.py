import os
import re

directory = r"c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src"

# This regex finds <SOMETHING>.toISOString().split('T')[0]
# But we need to be careful. <SOMETHING> might be `new Date(t.timestamp)`.
# Let's match specific common patterns to be safe.

patterns = [
    (r"new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]", r"new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]"),
    (r"now\.toISOString\(\)\.split\('T'\)\[0\]", r"new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0]"),
    (r"today\.toISOString\(\)\.split\('T'\)\[0\]", r"new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0]"),
    (r"yesterday\.toISOString\(\)\.split\('T'\)\[0\]", r"new Date(yesterday.getTime() - yesterday.getTimezoneOffset() * 60000).toISOString().split('T')[0]"),
    (r"new Date\((.*?)\)\.toISOString\(\)\.split\('T'\)\[0\]", r"new Date(new Date(\1).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]")
]

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith(".tsx") or file.endswith(".ts"):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for pattern, repl in patterns:
                new_content = re.sub(pattern, repl, new_content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
