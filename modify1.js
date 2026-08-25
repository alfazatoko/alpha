const fs = require('fs');
const file = 'src/views/voucher-app/components/AturStokTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update stepper rendering
content = content.replace(/\[1, 2, 3, 4\].map/g, '[1, 2, 3, 4, 5].map');

// Replace Step 4 to Step 5
content = content.replace(/4\. LANGKAH 4: SERAH TERIMA KASIR/g, '5. LANGKAH 5: SERAH TERIMA KASIR');
content = content.replace(/currentStep === 4 && !isHandoverSuccess/g, 'currentStep === 5 && !isHandoverSuccess');
content = content.replace(/setCurrentStep\(4\)/g, 'setCurrentStep(5)');

// Replace Step 3 to Step 4
content = content.replace(/3\. LANGKAH 3: CEK TUNAI VS NON-TUNAI/g, '4. LANGKAH 4: CEK TUNAI VS NON-TUNAI');
content = content.replace(/currentStep === 3 && !isHandoverSuccess/g, 'currentStep === 4 && !isHandoverSuccess');
content = content.replace(/setCurrentStep\(3\)/g, 'setCurrentStep(4)');
content = content.replace(/<div className="w-5 h-5 rounded-full bg-amber-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-\[10px\] shrink-0 mt-0.5 shadow-xs">\s*3\s*<\/div>/, '<div className="w-5 h-5 rounded-full bg-amber-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">\n                4\n              </div>');

// Replace Step 2 to Step 3
content = content.replace(/2\. LANGKAH 2: HITUNG STOK AKHIR/g, '3. LANGKAH 3: HITUNG STOK AKHIR');
content = content.replace(/currentStep === 2 && !isHandoverSuccess/g, 'currentStep === 3 && !isHandoverSuccess');
content = content.replace(/<div className="w-5 h-5 rounded-full bg-emerald-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-\[10px\] shrink-0 mt-0.5 shadow-xs">\s*2\s*<\/div>/, '<div className="w-5 h-5 rounded-full bg-emerald-600 text-slate-900 dark:text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">\n                3\n              </div>');
// Wait, the button in Step 2 to go to Step 3: 
// Lanjut <ArrowRight className="w-3 h-3" /> inside Step 2
content = content.replace(/onClick=\{\(\) => setCurrentStep\(3\)\}/g, 'onClick={() => setCurrentStep(4)}'); // From step 3 to step 4! Ah wait, I already replaced it above if there's any.

// Now for the step 2 (Hitung Stok Akhir)'s edit row logic.
content = content.replace(/activeEditingRow.step === 2/g, 'activeEditingRow.step === 3');
content = content.replace(/step: 2/g, 'step: 3');
// Wait, step: 2 was used in setCurrentStep(2) for lock initial stock!
// I should revert that specific one.
content = content.replace(/setCurrentStep\(3\); \/\/ Ke langkah Tambah Stok Baru/g, 'setCurrentStep(2); // Ke langkah Tambah Stok Baru'); // Wait I did this in my last replace manually?
// Let's ensure handleLockInitialStock has setCurrentStep(2); // Ke langkah Tambah Stok Baru
// Above replace might have changed it to step: 3 if it was step: 2. Actually setCurrentStep(2) wasn't step: 2.
content = content.replace(/setActiveEditingRow\(\{ step: 3/g, 'setActiveEditingRow({ step: 3');

fs.writeFileSync(file, content);
