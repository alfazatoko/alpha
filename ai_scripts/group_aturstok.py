import re

with open("src/views/voucher-app/components/AturStokTab.tsx", "r", encoding="utf-8") as f:
    content = f.read()

replacement_start = """{(() => {
                  const operatorsList = ['Telkomsel', 'Axis', 'Indosat', 'XL', 'Tri', 'Smartfren', 'Lainnya'];
                  const OP_COLORS: Record<string, string> = {
                    'Telkomsel': 'bg-rose-600 text-slate-900 dark:text-white',
                    'Axis': 'bg-purple-600 text-slate-900 dark:text-white',
                    'Indosat': 'bg-yellow-500 text-slate-900',
                    'XL': 'bg-blue-600 text-slate-900 dark:text-white',
                    'Tri': 'bg-white border-slate-200 shadow-sm dark:bg-slate-800 text-slate-900 dark:text-white',
                    'Smartfren': 'bg-pink-600 text-slate-900 dark:text-white'
                  };

                  return operatorsList.map(op => {
                    const opItems = filteredItems.filter(item => {
                      const p = products.find(prod => prod.id === item.productId);
                      if (!p) return false;
                      const safeOp = (p.operator || '').toLowerCase();
                      return safeOp.includes(op.toLowerCase()) || 
                        (op === 'Lainnya' && !operatorsList.slice(0,6).some(o => safeOp.includes(o.toLowerCase())));
                    });

                    if (opItems.length === 0) return null;

                    return (
                      <React.Fragment key={op}>
                        <tr className="bg-white dark:bg-slate-900">
                          <td colSpan={7} className={`py-1.5 px-3 font-black text-[9px] text-left uppercase tracking-widest sticky left-0 z-10 border-y border-slate-200 dark:border-white/10 ${OP_COLORS[op] || 'bg-slate-700 text-slate-900 dark:text-white'}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-3 bg-white/30 rounded-full" />
                              {op}
                            </div>
                          </td>
                        </tr>
                        {opItems.map((item) => {"""

content = content.replace("{filteredItems.map((item) => {", replacement_start)

pieces = content.split("                })}\n              </tbody>")
if len(pieces) == 4:
    content = pieces[0] + "                        })}\n                      </React.Fragment>\n                    );\n                  });\n                })()}\n              </tbody>" + \
              pieces[1] + "                        })}\n                      </React.Fragment>\n                    );\n                  });\n                })()}\n              </tbody>" + \
              pieces[2] + "                        })}\n                      </React.Fragment>\n                    );\n                  });\n                })()}\n              </tbody>" + \
              pieces[3]
    with open("src/views/voucher-app/components/AturStokTab.tsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Replaced 3 occurrences successfully.")
else:
    print("Error: Expected 4 pieces, got", len(pieces))
