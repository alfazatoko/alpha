import os
import re

app_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\components\AturStokTab.tsx'

with open(app_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Fix Step 1 (Change Buka Kunci to Edit)
code = code.replace(
    '<Unlock className="w-3 h-3" /> Buka Kunci',
    '<Pencil className="w-3 h-3" /> Edit'
)

# Fix Step 2
# Remove the old banner block for Step 2
banner_pattern = r"\{\/\* Edit toggle for locked incoming stock \*\/.*?\}\)\s*\}"
code = re.sub(banner_pattern, "", code, flags=re.DOTALL)

# Insert the Edit button into the bottom bar of Step 2
# We look for the "Kembali" button in Step 2, and insert the Edit button after it.
step2_kembali_button = r"""<ArrowLeft className={`w-3.5 h-3.5 \$\{isLight \? 'text-slate-500' : 'text-slate-400'\}`} /> <span className="whitespace-nowrap">Kembali</span>
              </button>"""

edit_button_html = """
              {isIncomingLocked && viewMode === 'buka' && (
                <button
                  type="button"
                  onClick={() => setIsIncomingLocked(false)}
                  className={`px-3 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer rounded-xl ${
                    isLight 
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                      : 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
"""
code = code.replace(step2_kembali_button, step2_kembali_button + edit_button_html)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("UI updated successfully")
