import sys

filepath = 'src/views/voucher-app/components/RiwayatTab.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Filter Shift Pills (add flex-wrap)
content = content.replace(
    '<div className="flex items-center gap-1.5 sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-3">',
    '<div className="flex flex-wrap items-center gap-1.5 sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-3">'
)

# Fix 2: 5-column grid (TRX | Omset | Fisik | Sistem | Status) -> flex horizontal scroll
old_5_col = '<div className="grid grid-cols-5 gap-1.5 text-xs">'
new_5_col = '<div className="flex overflow-x-auto gap-2 text-xs no-scrollbar pb-1">'
content = content.replace(old_5_col, new_5_col)

# Add min-w and flex-1 to the 5 children
content = content.replace(
    '<div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-2 space-y-0.5 col-span-1">',
    '<div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-2 space-y-0.5 min-w-[70px] flex-1 shrink-0">'
)
content = content.replace(
    '<div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-2 space-y-0.5 col-span-1">',
    '<div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-2 space-y-0.5 min-w-[75px] flex-1 shrink-0">'
)
content = content.replace(
    '<div className="bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-2 space-y-0.5 col-span-1">',
    '<div className="bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-2 space-y-0.5 min-w-[75px] flex-1 shrink-0">'
)
content = content.replace(
    '<div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-2 space-y-0.5 col-span-1">',
    '<div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-2 space-y-0.5 min-w-[75px] flex-1 shrink-0">'
)

content = content.replace(
    "col-span-1 border ${",
    "min-w-[65px] flex-1 shrink-0 border ${"
)

# Fix 3: 3-column grid (Omset | Kas Fisik | Kas Sistem) -> flex horizontal scroll
old_3_col = '<div className="grid grid-cols-3 gap-2">'
new_3_col = '<div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">'
content = content.replace(old_3_col, new_3_col)

content = content.replace(
    '<div className="bg-emerald-50 dark:bg-slate-950/50 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-2.5 space-y-0.5">',
    '<div className="bg-emerald-50 dark:bg-slate-950/50 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-2.5 space-y-0.5 min-w-[110px] flex-1 shrink-0">'
)
content = content.replace(
    '<div className="bg-cyan-50 dark:bg-slate-950/50 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-2.5 space-y-0.5">',
    '<div className="bg-cyan-50 dark:bg-slate-950/50 border border-cyan-200 dark:border-cyan-500/20 rounded-xl p-2.5 space-y-0.5 min-w-[110px] flex-1 shrink-0">'
)
content = content.replace(
    '<div className="bg-amber-50 dark:bg-slate-950/50 border border-amber-200 dark:border-amber-500/20 rounded-xl p-2.5 space-y-0.5">',
    '<div className="bg-amber-50 dark:bg-slate-950/50 border border-amber-200 dark:border-amber-500/20 rounded-xl p-2.5 space-y-0.5 min-w-[110px] flex-1 shrink-0">'
)

# Fix 4: Reduce padding on the container so it doesn't push bounds
content = content.replace(
    '<div className="space-y-4 max-w-5xl mx-auto pb-12 text-slate-700 dark:text-slate-200"',
    '<div className="space-y-4 w-full max-w-5xl mx-auto pb-12 overflow-x-hidden px-0.5 text-slate-700 dark:text-slate-200"'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS")
