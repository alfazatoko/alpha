import json

transcript_path = r'C:\Users\Administrator\.gemini\antigravity-ide\brain\d7dcb41c-5df3-411f-8efb-15b42308d396\.system_generated\logs\transcript.jsonl'
output_path = r'C:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\search_out.txt'

with open(transcript_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

found_steps = []
for line in lines:
    try:
        data = json.loads(line)
        content = data.get('content', '')
        if 'Alur Shift Kasir' in content and data.get('type') == 'USER_INPUT':
            found_steps.append(content)
    except:
        pass

with open(output_path, 'w', encoding='utf-8') as out:
    for step in found_steps:
        out.write("===================\n")
        out.write(step + "\n")
