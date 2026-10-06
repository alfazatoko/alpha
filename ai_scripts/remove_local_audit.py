import os
import re

app_path = r'c:\Users\Administrator\Desktop\ALFAZA CELL\APLIKASI BARU\ALPHA(apk-toko)\src\views\voucher-app\App.tsx'

with open(app_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace hasActiveAuditSession logic
old_logic = """                        hasActiveAuditSession={isActiveCashierOnDuty && (() => {
                          try {
                            const raw = localStorage.getItem(`audit_${activeStoreId || 'default'}_${activeCashier.id}`);
                            if (!raw) return false;
                            const session = JSON.parse(raw);
                            const isUnfinishedBukaToko = session.currentStep <= 2 && !session.isBukaTokoCompleted;
                            const isUnfinishedTutupToko = session.currentStep > 2;
                            return isUnfinishedBukaToko || isUnfinishedTutupToko;
                          } catch { return false; }
                        })()}"""

new_logic = """                        hasActiveAuditSession={isActiveCashierOnDuty && (() => {
                          if (!globalShiftSession) return false;
                          const session = globalShiftSession;
                          const isUnfinishedBukaToko = session.currentStep <= 2 && !session.isBukaTokoCompleted;
                          const isUnfinishedTutupToko = session.currentStep > 2;
                          return isUnfinishedBukaToko || isUnfinishedTutupToko;
                        })()}"""

code = code.replace(old_logic, new_logic)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Removed localStorage dependency for audit session")
