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

// Now for the step 2 (Hitung Stok Akhir)'s edit row logic.
content = content.replace(/activeEditingRow.step === 2/g, 'activeEditingRow.step === 3');
content = content.replace(/\{ step: 2, type: 'final'/g, '{ step: 3, type: \'final\'');
content = content.replace(/\{ step: 1 \| 2 \| 3; type: 'incoming'/g, '{ step: 1 | 2 | 3; type: \'incoming\''); // Fix just in case

// Fix 'Lanjut' button in Step 3
// find 'onClick={() => setCurrentStep(4)}' from what we replaced earlier if it was 3
// Actually, I already replaced setCurrentStep(3) to 4!
// So Awal -> Lanjut goes to 2.
// Tambah -> Lanjut goes to 3.
// Akhir -> Lanjut goes to 4.
// Cek Tunai -> Lanjut goes to 5.
content = content.replace(/setCurrentStep\(2\); \/\/ Ke langkah Tambah Stok Baru/g, 'setCurrentStep(2); // Ke langkah Tambah Stok Baru'); // Keep it 2.

fs.writeFileSync(file, content);
