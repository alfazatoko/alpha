
def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple tag counter
    div_opens = content.count('<div')
    div_closes = content.count('</div')
    
    # Brackets
    brace_opens = content.count('{')
    brace_closes = content.count('}')
    
    paren_opens = content.count('(')
    paren_closes = content.count(')')
    
    print(f"File: {filename}")
    print(f"Divs: {div_opens} open, {div_closes} close (Diff: {div_opens - div_closes})")
    print(f"Braces: {brace_opens} open, {brace_closes} close (Diff: {brace_opens - brace_closes})")
    print(f"Parens: {paren_opens} open, {paren_closes} close (Diff: {paren_opens - paren_closes})")

check_balance('c:/Users/Administrator/Desktop/ALFAZA CELL/ALPHA/src/views/BerandaView.tsx')
