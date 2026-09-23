const fs = require('fs');
let c = fs.readFileSync('src/components/TransactionForm.tsx', 'utf8');

// ==== TEMA 2 ====
// 4 TOMBOL LAYANAN
c = c.replace(
  '{/* 4 TOMBOL LAYANAN */}\r\n        <div className="grid grid-cols-4 gap-2 mb-2 px-3">',
  '{/* 4 TOMBOL LAYANAN */}\r\n        <div className="grid grid-cols-4 gap-2 mb-2 px-4">'
);
c = c.replace(
  '{/* 4 TOMBOL LAYANAN */}\n        <div className="grid grid-cols-4 gap-2 mb-2 px-3">',
  '{/* 4 TOMBOL LAYANAN */}\n        <div className="grid grid-cols-4 gap-2 mb-2 px-4">'
);

// KATEGORI ROW
c = c.replace(
  '<div className="mx-3 flex items-center justify-between mb-2 bg-white rounded-2xl px-3',
  '<div className="mx-4 flex items-center justify-between mb-2 bg-white rounded-2xl px-4'
);

// VOUCHER JUAL CEPAT
c = c.replace(
  '<div className="mx-3 mb-2 flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 p-3 rounded-2xl cursor-pointer',
  '<div className="mx-4 mb-2 flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 p-3 rounded-2xl cursor-pointer'
);

// TRANSFER BANK SCROLL 1
c = c.replace(
  '<div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-3">',
  '<div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-4">'
);
// TRANSFER BANK SCROLL 2
c = c.replace(
  '<div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-3">',
  '<div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-4">'
);

// TARIK GRID
c = c.replace(
  '{activeMode === \'TARIK\' && (\r\n          <div className="grid grid-cols-5 gap-1 mb-2">',
  '{activeMode === \'TARIK\' && (\r\n          <div className="grid grid-cols-5 gap-1 mb-2 px-4">'
);
c = c.replace(
  '{activeMode === \'TARIK\' && (\n          <div className="grid grid-cols-5 gap-1 mb-2">',
  '{activeMode === \'TARIK\' && (\n          <div className="grid grid-cols-5 gap-1 mb-2 px-4">'
);

// KETERANGAN
c = c.replace(
  '{/* KETERANGAN */}\r\n        <div className="mb-1">',
  '{/* KETERANGAN */}\r\n        <div className="mb-1 px-4">'
);
c = c.replace(
  '{/* KETERANGAN */}\n        <div className="mb-1">',
  '{/* KETERANGAN */}\n        <div className="mb-1 px-4">'
);

// NOMINAL & ADMIN
c = c.replace(
  '{/* NOMINAL & ADMIN */}\r\n        <div className="flex gap-2 flex-nowrap mb-2">',
  '{/* NOMINAL & ADMIN */}\r\n        <div className="flex gap-2 flex-nowrap mb-2 px-4">'
);
c = c.replace(
  '{/* NOMINAL & ADMIN */}\n        <div className="flex gap-2 flex-nowrap mb-2">',
  '{/* NOMINAL & ADMIN */}\n        <div className="flex gap-2 flex-nowrap mb-2 px-4">'
);

// SIMPAN TEMA 2
c = c.replace(
  '{/* TOMBOL SIMPAN */}\r\n        <div className="mt-auto pt-2">',
  '{/* TOMBOL SIMPAN */}\r\n        <div className="mt-auto pt-2 px-4">'
);
c = c.replace(
  '{/* TOMBOL SIMPAN */}\n        <div className="mt-auto pt-2">',
  '{/* TOMBOL SIMPAN */}\n        <div className="mt-auto pt-2 px-4">'
);

// ==== TEMA 3 ====

// MAIN BUTTON
c = c.replace(
  '{/* TEMA 3 LAYOUT (KOMPAK & SIDEBAR) */}\r\n        <button',
  '{/* TEMA 3 LAYOUT (KOMPAK & SIDEBAR) */}\r\n        <div className="px-4">\r\n        <button'
);
c = c.replace(
  '{/* TEMA 3 LAYOUT (KOMPAK & SIDEBAR) */}\n        <button',
  '{/* TEMA 3 LAYOUT (KOMPAK & SIDEBAR) */}\n        <div className="px-4">\n        <button'
);
// Find the end of the main button
c = c.replace(
  '           <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-1">\r\n             <i className="fa-solid fa-chevron-right text-[#64748b] text-[12px]"></i>\r\n           </div>\r\n        </button>',
  '           <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-1">\r\n             <i className="fa-solid fa-chevron-right text-[#64748b] text-[12px]"></i>\r\n           </div>\r\n        </button>\r\n        </div>'
);
c = c.replace(
  '           <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-1">\n             <i className="fa-solid fa-chevron-right text-[#64748b] text-[12px]"></i>\n           </div>\n        </button>',
  '           <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mr-1">\n             <i className="fa-solid fa-chevron-right text-[#64748b] text-[12px]"></i>\n           </div>\n        </button>\n        </div>'
);

// KETERANGAN
c = c.replace(
  '{/* KETERANGAN ROW */}\r\n        <div className="mb-4">',
  '{/* KETERANGAN ROW */}\r\n        <div className="mb-4 px-4">'
);
c = c.replace(
  '{/* KETERANGAN ROW */}\n        <div className="mb-4">',
  '{/* KETERANGAN ROW */}\n        <div className="mb-4 px-4">'
);

// AKSESORIS PAYMENT MODE
c = c.replace(
  '{/* PAYMENT MODE TOGGLE FOR AKSESORIS - TEMA 3 */}\r\n        {activeMode === \'AKSESORIS\' && (\r\n          <div className="flex gap-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-300">',
  '{/* PAYMENT MODE TOGGLE FOR AKSESORIS - TEMA 3 */}\r\n        {activeMode === \'AKSESORIS\' && (\r\n          <div className="flex gap-2 mb-3 px-4 animate-in fade-in slide-in-from-top-2 duration-300">'
);
c = c.replace(
  '{/* PAYMENT MODE TOGGLE FOR AKSESORIS - TEMA 3 */}\n        {activeMode === \'AKSESORIS\' && (\n          <div className="flex gap-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-300">',
  '{/* PAYMENT MODE TOGGLE FOR AKSESORIS - TEMA 3 */}\n        {activeMode === \'AKSESORIS\' && (\n          <div className="flex gap-2 mb-3 px-4 animate-in fade-in slide-in-from-top-2 duration-300">'
);

// NOMINAL & ADMIN
c = c.replace(
  '{/* NOMINAL & ADMIN ROW */}\r\n        <div className="flex gap-2 flex-nowrap mb-5">',
  '{/* NOMINAL & ADMIN ROW */}\r\n        <div className="flex gap-2 flex-nowrap mb-5 px-4">'
);
c = c.replace(
  '{/* NOMINAL & ADMIN ROW */}\n        <div className="flex gap-2 flex-nowrap mb-5">',
  '{/* NOMINAL & ADMIN ROW */}\n        <div className="flex gap-2 flex-nowrap mb-5 px-4">'
);

// SIMPAN TEMA 3
c = c.replace(
  '{/* SIMPAN BUTTON TEMA 3 */}\r\n        <div className="mt-auto pb-2">',
  '{/* SIMPAN BUTTON TEMA 3 */}\r\n        <div className="mt-auto px-4 pb-2">'
);
c = c.replace(
  '{/* SIMPAN BUTTON TEMA 3 */}\n        <div className="mt-auto pb-2">',
  '{/* SIMPAN BUTTON TEMA 3 */}\n        <div className="mt-auto px-4 pb-2">'
);

fs.writeFileSync('src/components/TransactionForm.tsx', c);
console.log('Done padding fixes.');
