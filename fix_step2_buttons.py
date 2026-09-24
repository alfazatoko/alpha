import sys

filepath = 'src/views/voucher-app/components/AturStokTab.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add extra padding bottom to Step 2 so content is not blocked by the fixed bar
old_step_2_motion = "      {currentStep === 2 && viewMode !== 'lobby' && !isHandoverSuccess && ("
new_step_2_motion = "      {currentStep === 2 && viewMode !== 'lobby' && !isHandoverSuccess && (\n        <div className=\"pb-24\">"
content = content.replace(old_step_2_motion, new_step_2_motion)
content = content.replace(
    '          <div className="flex items-center justify-between gap-2 pt-1">',
    '          <div className={`fixed bottom-[56px] left-0 right-0 z-[140] flex justify-center pointer-events-none transition-all`}>\n            <div className={`pointer-events-auto w-full max-w-5xl px-4 py-3 flex items-center justify-between gap-2 border-t shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)] backdrop-blur-xl ${isLight ? "bg-white/95 border-slate-200" : "bg-slate-950/95 border-white/5"}`}>'
)

# Replace the closing tag for Step 2 motion.div
# Find the end of Step 2:
step_3 = "{/* ========================================================================="
start_idx = content.find('          <div className={`fixed bottom-[56px]')
if start_idx != -1:
    end_idx = content.find('</motion.div>', start_idx)
    if end_idx != -1:
        # Before </motion.div>, we need to close the `div` we opened for fixed bottom bar
        content = content[:end_idx] + "            </div>\n          </div>\n        </motion.div>\n        </div>" + content[end_idx+13:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
