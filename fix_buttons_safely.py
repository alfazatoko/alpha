import sys

filepath = 'src/views/voucher-app/components/AturStokTab.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add pb-24
old_step_2_motion = """      {currentStep === 2 && viewMode !== 'lobby' && !isHandoverSuccess && (
        <motion.div"""
new_step_2_motion = """      {currentStep === 2 && viewMode !== 'lobby' && !isHandoverSuccess && (
        <div className="pb-24">
        <motion.div"""
content = content.replace(old_step_2_motion, new_step_2_motion)

# 2. Replace button wrapper
old_btn_wrap = '          <div className="flex items-center justify-between gap-2 pt-1">'
new_btn_wrap = '          <div className={`fixed bottom-[56px] left-0 right-0 z-[140] flex justify-center pointer-events-none transition-all`}>\n            <div className={`pointer-events-auto w-full max-w-5xl px-4 py-3 flex items-center justify-between gap-2 border-t shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.1)] backdrop-blur-xl ${isLight ? "bg-white/95 border-slate-200" : "bg-slate-950/95 border-white/5"}`}>'
content = content.replace(old_btn_wrap, new_btn_wrap)

# 3. Add closing divs at the end of Step 2
old_end_step_2 = """            )}
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 3. LANGKAH 3: HITUNG STOK AKHIR (TUTUP SHIFT) */}"""
      
new_end_step_2 = """            )}
          </div>
          </div>
        </motion.div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LANGKAH 3: HITUNG STOK AKHIR (TUTUP SHIFT) */}"""
content = content.replace(old_end_step_2, new_end_step_2)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
