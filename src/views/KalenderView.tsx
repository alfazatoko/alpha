import React, { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const DAY_NAMES = [
  { short: "M", full: "MINGGU", isWeekend: true },
  { short: "S", full: "SENIN", isWeekend: false },
  { short: "S", full: "SELASA", isWeekend: false },
  { short: "R", full: "RABU", isWeekend: false },
  { short: "K", full: "KAMIS", isWeekend: false },
  { short: "J", full: "JUMAT", isWeekend: false },
  { short: "S", full: "SABTU", isWeekend: false }
];

const HIJRI_MONTHS = [
  "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
  "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban",
  "Ramadhan", "Syawal", "Dzulkaidah", "Dzulhijjah"
];

const KEMENAG_ANCHORS = [
  { gregYear: 2025, gregMonth: 6, gregDay: 26, hijriYear: 1447, hijriMonth: 1 },
  { gregYear: 2025, gregMonth: 7, gregDay: 26, hijriYear: 1447, hijriMonth: 2 },
  { gregYear: 2025, gregMonth: 8, gregDay: 24, hijriYear: 1447, hijriMonth: 3 },
  { gregYear: 2025, gregMonth: 9, gregDay: 23, hijriYear: 1447, hijriMonth: 4 },
  { gregYear: 2025, gregMonth: 10, gregDay: 22, hijriYear: 1447, hijriMonth: 5 },
  { gregYear: 2025, gregMonth: 11, gregDay: 21, hijriYear: 1447, hijriMonth: 6 },
  { gregYear: 2025, gregMonth: 12, gregDay: 21, hijriYear: 1447, hijriMonth: 7 },
  { gregYear: 2026, gregMonth: 1, gregDay: 20, hijriYear: 1447, hijriMonth: 8 },
  { gregYear: 2026, gregMonth: 2, gregDay: 19, hijriYear: 1447, hijriMonth: 9 },
  { gregYear: 2026, gregMonth: 3, gregDay: 21, hijriYear: 1447, hijriMonth: 10 },
  { gregYear: 2026, gregMonth: 4, gregDay: 19, hijriYear: 1447, hijriMonth: 11 },
  { gregYear: 2026, gregMonth: 5, gregDay: 18, hijriYear: 1447, hijriMonth: 12 },
  { gregYear: 2026, gregMonth: 6, gregDay: 16, hijriYear: 1448, hijriMonth: 1 },
  { gregYear: 2026, gregMonth: 7, gregDay: 16, hijriYear: 1448, hijriMonth: 2 },
  { gregYear: 2026, gregMonth: 8, gregDay: 14, hijriYear: 1448, hijriMonth: 3 },
  { gregYear: 2026, gregMonth: 9, gregDay: 12, hijriYear: 1448, hijriMonth: 4 },
  { gregYear: 2026, gregMonth: 10, gregDay: 12, hijriYear: 1448, hijriMonth: 5 },
  { gregYear: 2026, gregMonth: 11, gregDay: 11, hijriYear: 1448, hijriMonth: 6 },
  { gregYear: 2026, gregMonth: 12, gregDay: 10, hijriYear: 1448, hijriMonth: 7 },
];

const anchorTimestamps = KEMENAG_ANCHORS.map(a => ({
  ...a,
  timestamp: Date.UTC(a.gregYear, a.gregMonth - 1, a.gregDay)
}));

function getHijriDate(date: Date): { day: number; month: string; year: number } {
  const targetTimestamp = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  for (let i = anchorTimestamps.length - 1; i >= 0; i--) {
    const anchor = anchorTimestamps[i];
    if (targetTimestamp >= anchor.timestamp) {
      const diffDays = Math.floor((targetTimestamp - anchor.timestamp) / 86400000);
      if (diffDays <= 30) {
        return {
          day: diffDays + 1,
          month: HIJRI_MONTHS[anchor.hijriMonth - 1],
          year: anchor.hijriYear
        };
      }
    }
  }
  return { day: date.getDate(), month: "Unknown", year: 1447 };
}

interface Holiday {
  date: number;
  month: number;
  year: number;
  name: string;
  type: "merah" | "cuti";
}

const KalenderView: React.FC<{ active: boolean; setActiveView: (v: string) => void; showToast: (m: string) => void; onConfirm: (t: string, m: string, c: () => void) => void; isPc?: boolean }> = ({ active, setActiveView, isPc }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [yearHolidays, setYearHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const startingDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

  const fetchHolidays = async (year: number) => {
    setLoading(true);
    try {
      let formatted: Holiday[] = [];
      try {
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`);
        if (res.ok) {
          const json = await res.json();
          formatted = json.map((item: any) => {
            const d = new Date(item.date);
            return {
              date: d.getDate(),
              month: d.getMonth(),
              year: d.getFullYear(),
              name: item.localName || item.name,
              type: "merah"
            };
          });
        }
      } catch (e) {
        console.warn("Nager API failed", e);
      }

      const extraHolidays = [
        { date: 27, month: 0, year: 2025, name: "Isra Mikraj", type: "merah" },
        { date: 28, month: 0, year: 2025, name: "Cuti Bersama Isra Mikraj/Imlek", type: "cuti" },
        { date: 29, month: 0, year: 2025, name: "Tahun Baru Imlek", type: "merah" },
        { date: 28, month: 2, year: 2025, name: "Cuti Bersama Nyepi", type: "cuti" },
        { date: 29, month: 2, year: 2025, name: "Hari Suci Nyepi", type: "merah" },
        { date: 31, month: 2, year: 2025, name: "Idul Fitri 1446 H", type: "merah" },
        { date: 1, month: 3, year: 2025, name: "Idul Fitri 1446 H", type: "merah" },
        { date: 2, month: 3, year: 2025, name: "Cuti Bersama Idul Fitri", type: "cuti" },
        { date: 3, month: 3, year: 2025, name: "Cuti Bersama Idul Fitri", type: "cuti" },
        { date: 4, month: 3, year: 2025, name: "Cuti Bersama Idul Fitri", type: "cuti" },
        { date: 7, month: 3, year: 2025, name: "Cuti Bersama Idul Fitri", type: "cuti" },
        { date: 12, month: 4, year: 2025, name: "Hari Raya Waisak", type: "merah" },
        { date: 13, month: 4, year: 2025, name: "Cuti Bersama Waisak", type: "cuti" },
        { date: 30, month: 4, year: 2025, name: "Cuti Bersama Kenaikan Isa Al Masih", type: "cuti" },
        { date: 6, month: 5, year: 2025, name: "Idul Adha 1446 H", type: "merah" },
        { date: 9, month: 5, year: 2025, name: "Cuti Bersama Idul Adha", type: "cuti" },
        { date: 27, month: 5, year: 2025, name: "Tahun Baru Islam 1447 H", type: "merah" },
        { date: 5, month: 8, year: 2025, name: "Maulid Nabi Muhammad SAW", type: "merah" },
        { date: 26, month: 11, year: 2025, name: "Cuti Bersama Natal", type: "cuti" },
        { date: 17, month: 1, year: 2026, name: "Isra Mikraj / Imlek", type: "merah" },
        { date: 18, month: 1, year: 2026, name: "Cuti Bersama", type: "cuti" },
        { date: 19, month: 2, year: 2026, name: "Hari Suci Nyepi", type: "merah" },
        { date: 20, month: 2, year: 2026, name: "Idul Fitri 1447 H", type: "merah" },
        { date: 21, month: 2, year: 2026, name: "Idul Fitri 1447 H", type: "merah" },
        { date: 18, month: 2, year: 2026, name: "Cuti Bersama Idul Fitri", type: "cuti" },
        { date: 19, month: 2, year: 2026, name: "Cuti Bersama Idul Fitri", type: "cuti" },
        { date: 23, month: 2, year: 2026, name: "Cuti Bersama Idul Fitri", type: "cuti" },
        { date: 24, month: 2, year: 2026, name: "Cuti Bersama Idul Fitri", type: "cuti" },
        { date: 27, month: 4, year: 2026, name: "Idul Adha 1447 H", type: "merah" },
        { date: 28, month: 4, year: 2026, name: "Cuti Bersama Idul Adha", type: "cuti" },
        { date: 31, month: 4, year: 2026, name: "Hari Raya Waisak", type: "merah" },
        { date: 16, month: 5, year: 2026, name: "Tahun Baru Islam 1448 H", type: "merah" },
        { date: 25, month: 7, year: 2026, name: "Maulid Nabi Muhammad SAW", type: "merah" },
        { date: 24, month: 11, year: 2026, name: "Cuti Bersama Natal", type: "cuti" },
        { date: 26, month: 11, year: 2026, name: "Cuti Bersama Natal", type: "cuti" },
      ];

      extraHolidays.filter(h => h.year === year).forEach(extra => {
        if (!formatted.find(f => f.date === extra.date && f.month === extra.month)) {
          formatted.push(extra as Holiday);
        } else if (extra.type === "cuti") {
          const idx = formatted.findIndex(f => f.date === extra.date && f.month === extra.month);
          if (idx !== -1) formatted[idx] = extra as Holiday;
        }
      });

      formatted.sort((a, b) => {
        if (a.month !== b.month) return a.month - b.month;
        return a.date - b.date;
      });

      setYearHolidays(formatted);
    } catch (e) {
      console.warn("Holiday fetch suppressed or failed:", e);
      setYearHolidays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays(currentYear);
  }, [currentYear]);

  const holidays = useMemo(() => {
    return yearHolidays.filter(h => h.month === currentMonth);
  }, [yearHolidays, currentMonth]);

  const firstHijri = getHijriDate(firstDayOfMonth);
  const lastHijri = getHijriDate(lastDayOfMonth);

  const renderPcCells = () => {
    const cells = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      const dayNum = prevMonthLastDay - startingDayOfWeek + i + 1;
      cells.push(
        <div key={`prev-${i}`} className="border-b border-r border-slate-100 dark:border-slate-700/50 p-3 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col justify-between h-[100px] opacity-40">
          <span className="text-xl font-bold text-slate-300 dark:text-slate-700">{dayNum}</span>
        </div>
      );
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(currentYear, currentMonth, i);
      const isSunday = dateObj.getDay() === 0;
      const holiday = holidays.find(h => h.date === i);
      let gregorianColor = "text-slate-800 dark:text-slate-100";
      if (isSunday || holiday?.type === "merah") gregorianColor = "text-rose-500 font-black";
      else if (holiday?.type === "cuti") gregorianColor = "text-amber-500 font-black";

      const hijri = getHijriDate(dateObj);
      const hijriColor = hijri.month === firstHijri.month ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400";
      const isToday = i === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
      const isSelected = selectedDate?.getDate() === i && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;

      let cellBg = "bg-white dark:bg-slate-800";
      if (isSelected) cellBg = "bg-sky-50 dark:bg-sky-950/20 ring-inset ring-2 ring-sky-500 z-10";
      else if (isToday) cellBg = "bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/30";
      else cellBg = "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50";

      cells.push(
        <div 
          key={`curr-${i}`} 
          onClick={() => setSelectedDate(dateObj)} 
          className={`border-b border-r border-slate-100 dark:border-slate-700/50 p-3 flex flex-col justify-between h-[100px] cursor-pointer transition-all ${cellBg}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-xl font-bold ${gregorianColor}`}>{i}</span>
            {isToday && (
              <span className="text-[7px] font-black uppercase tracking-wider bg-amber-500 text-white px-1.5 py-0.5 rounded-full leading-none">Hari Ini</span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-[10px] font-black ${hijriColor}`}>{hijri.day}</span>
            <span className="text-[7px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">{hijri.month.split(' ')[0]}</span>
          </div>
        </div>
      );
    }
    const totalCells = cells.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      cells.push(
        <div key={`next-${i}`} className="border-b border-r border-slate-100 dark:border-slate-700/50 p-3 bg-slate-50/50 dark:bg-slate-900/10 flex flex-col justify-between h-[100px] opacity-40">
          <span className="text-xl font-bold text-slate-300 dark:text-slate-700">{i}</span>
        </div>
      );
    }
    return cells;
  };

  const renderCells = () => {
    const cells = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      const dayNum = prevMonthLastDay - startingDayOfWeek + i + 1;
      cells.push(
        <div key={`prev-${i}`} className="border-b border-r border-gray-300 p-1 bg-gray-50 flex flex-col justify-between items-center h-[60px]">
          <span className="text-3xl font-bold text-gray-300 mt-0">{dayNum}</span>
        </div>
      );
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(currentYear, currentMonth, i);
      const isSunday = dateObj.getDay() === 0;
      const holiday = holidays.find(h => h.date === i);
      let gregorianColor = "text-black";
      if (isSunday || holiday?.type === "merah") gregorianColor = "text-red-600";
      else if (holiday?.type === "cuti") gregorianColor = "text-amber-500";

      const hijri = getHijriDate(dateObj);
      const hijriColor = hijri.month === firstHijri.month ? "text-emerald-600" : "text-blue-700";
      const isToday = i === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();
      const isSelected = selectedDate?.getDate() === i && selectedDate?.getMonth() === currentMonth && selectedDate?.getFullYear() === currentYear;

      let cellBg = "bg-white";
      if (isSelected) cellBg = "bg-sky-100 ring-inset ring-2 ring-sky-500 z-10 cursor-pointer";
      else if (isToday) cellBg = "bg-yellow-100 cursor-pointer hover:bg-yellow-200 transition";
      else cellBg = "bg-white cursor-pointer hover:bg-gray-50 transition";

      cells.push(
        <div key={`curr-${i}`} onClick={() => setSelectedDate(dateObj)} className={`border-b border-r border-gray-300 p-1 flex flex-col items-center justify-between h-[60px] relative ${cellBg}`}>
          <span className={`text-3xl font-black mt-0 tracking-tighter ${gregorianColor}`}>{i}</span>
          <div className="flex flex-col items-center mb-0.5">
            <span className={`text-[10px] leading-none font-black ${hijriColor}`}>{hijri.day}</span>
          </div>
        </div>
      );
    }
    const totalCells = cells.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      cells.push(
        <div key={`next-${i}`} className="border-b border-r border-gray-300 p-1 bg-gray-50 flex flex-col justify-between items-center h-[60px]">
          <span className="text-3xl font-bold text-gray-300 mt-0">{i}</span>
        </div>
      );
    }
    return cells;
  };

  if (!active) return null;

  if (isPc) {
    const selectedHijri = selectedDate ? getHijriDate(selectedDate) : null;
    const selectedHoliday = selectedDate ? holidays.find(h => h.date === selectedDate.getDate()) : null;
    
    return (
      <div className={cn("flex-grow h-full flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden", active ? "flex" : "hidden")}>
        
        <div className="flex items-center justify-between px-8 py-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase">Kalender Kerja & Hari Libur</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">Sistem kalender gregorian terintegrasi dengan penanggalan hijriah & hari libur nasional</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pilih Tahun:</span>
            <div className="relative">
              <select 
                className="border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 pr-10 font-black text-xs focus:outline-none bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-all appearance-none cursor-pointer"
                value={currentYear}
                onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentMonth, 1))}
              >
                {Array.from({length: 10}).map((_, i) => {
                  const y = new Date().getFullYear() - 5 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
            </div>
          </div>
        </div>

        <div className="flex-grow flex overflow-hidden p-8 gap-8">
          
          <div className="w-[320px] shrink-0 h-full flex flex-col gap-6 overflow-y-auto pr-2 scrollbar-thin">
            
            {selectedDate && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 shrink-0">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-100 dark:border-slate-700">Tanggal Terpilih</h4>
                
                <div className="text-center py-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-4xl font-black text-slate-800 dark:text-white tracking-tight">{selectedDate.getDate()}</p>
                  <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-1">{MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {DAY_NAMES[selectedDate.getDay()].full}
                  </p>
                </div>

                {selectedHijri && (
                  <div className="flex justify-between items-center text-[10px] font-bold bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
                    <span className="text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Hijriah</span>
                    <span className="text-emerald-900 dark:text-emerald-300">{selectedHijri.day} {selectedHijri.month} {selectedHijri.year} H</span>
                  </div>
                )}

                {selectedHoliday && (
                  <div className={cn(
                    "p-3 rounded-xl border text-[10px] font-bold leading-relaxed",
                    selectedHoliday.type === 'merah' 
                      ? "bg-rose-50 border-rose-100 text-rose-600 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
                      : "bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-400"
                  )}>
                    <p className="uppercase tracking-widest text-[8px] font-black mb-1">Hari Libur:</p>
                    <p>{selectedHoliday.name}</p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex-grow flex flex-col min-h-[200px]">
              <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
                <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Daftar Libur Bulan Ini</h4>
              </div>
              
              <div className="flex-grow overflow-y-auto scrollbar-thin p-6">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : holidays.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 text-center">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Tidak ada libur</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {holidays.map((h, i) => (
                      <div 
                        key={i} 
                        onClick={() => setSelectedDate(new Date(currentYear, currentMonth, h.date))}
                        className={cn(
                          "p-3 rounded-2xl border text-xs font-bold flex gap-3 cursor-pointer hover:scale-[1.02] transition-transform",
                          h.type === "merah" 
                            ? "bg-rose-50/50 border-rose-100/50 text-rose-600 dark:bg-rose-950/10 dark:border-rose-900/20 dark:text-rose-400" 
                            : "bg-amber-50/50 border-amber-100/50 text-amber-600 dark:bg-amber-950/10 dark:border-amber-900/20 dark:text-amber-400"
                        )}
                      >
                        <span className="w-6 shrink-0 text-center font-black">{h.date}</span>
                        <span className="flex-1">{h.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="flex-grow h-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <i className="fa-solid fa-chevron-left text-xs"></i>
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Hari Ini
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
                  className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <i className="fa-solid fa-chevron-right text-xs"></i>
                </button>
              </div>

              <div className="text-center">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">{MONTH_NAMES[currentMonth]} {currentYear}</h3>
                <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                  {firstHijri.month} {firstHijri.year} H - {lastHijri.month} {lastHijri.year} H
                </p>
              </div>

              <div className="w-[120px]"></div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-slate-50/50 dark:bg-slate-900/20">
              {DAY_NAMES.map((d, i) => (
                <div key={i} className="flex flex-col items-center justify-center py-3 border-r border-slate-100 dark:border-slate-700/50 last:border-r-0">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${d.isWeekend ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'}`}>{d.full}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 flex-grow overflow-y-auto scrollbar-thin">
              {renderPcCells()}
            </div>

          </div>

        </div>

      </div>
    );
  }

  if (isPc) return null; // safety fallback

  return (
    <div className="page-view active bg-gray-100 hide-scrollbar pb-24">
      <div className="px-4 pt-7 pb-4 border-b flex justify-between items-center bg-slate-900 text-white shadow-lg">
        <button 
          onClick={() => setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <div className="text-center">
          <h2 className="font-black text-xs uppercase tracking-widest leading-none">KALENDER KERJA</h2>
          <p className="text-[8px] text-white/50 mt-1 font-bold">ALFAZA CELL</p>
        </div>
        <button 
          onClick={() => setActiveView('view-beranda')}
          className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 active:scale-90"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div className="bg-white border-b flex items-center p-3 gap-3 justify-between">
        <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">Pilih Tahun</h1>
        <div className="relative">
          <select 
            className="border border-slate-200 rounded-xl px-4 py-2 pr-10 font-black text-xs focus:outline-none focus:ring-2 focus:ring-slate-500 bg-slate-50 text-slate-800 transition-all appearance-none cursor-pointer"
            value={currentYear}
            onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentMonth, 1))}
          >
            {Array.from({length: 10}).map((_, i) => {
              const y = new Date().getFullYear() - 5 + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none"></i>
        </div>
      </div>

      <div className="bg-white mx-auto max-w-2xl shadow-sm border-x border-gray-300">
        <div className="flex justify-between items-center px-4 py-3 bg-[#f0f0f0] border-b border-gray-300">
          <div className="text-center font-black">
            <div className="text-[10px] text-gray-400 uppercase">Awal</div>
            <div className="text-xs">{firstHijri.month}</div>
            <div className="text-[10px]">{firstHijri.year} H</div>
          </div>
          <div className="text-center font-black">
            <div className="text-xl text-blue-700">{MONTH_NAMES[currentMonth]}</div>
            <div className="text-lg">{currentYear}</div>
          </div>
          <div className="text-center font-black">
            <div className="text-[10px] text-gray-400 uppercase">Akhir</div>
            <div className="text-xs">{firstHijri.month !== lastHijri.month ? lastHijri.month : ""}</div>
            <div className="text-[10px]">{firstHijri.month !== lastHijri.month ? lastHijri.year + " H" : ""}</div>
          </div>
        </div>

        <div className="flex bg-[#5bc0de] text-white border-b border-gray-300">
          <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))} className="flex-1 py-3 font-bold text-center hover:bg-black/10 transition">&larr; PREV</button>
          <button onClick={() => setCurrentDate(new Date())} className="flex-1 py-3 font-black text-center hover:bg-black/10 transition tracking-widest">TODAY</button>
          <button onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))} className="flex-1 py-3 font-bold text-center hover:bg-black/10 transition">NEXT &rarr;</button>
        </div>

        <div className="grid grid-cols-7 border-b border-gray-300 bg-white">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className="flex flex-col items-center justify-center py-2 border-r border-gray-200 last:border-r-0">
              <span className={`text-2xl leading-none font-black ${d.isWeekend ? 'text-red-600' : 'text-gray-800'}`}>{d.short}</span>
              <span className={`text-[8px] font-bold ${d.isWeekend ? 'text-red-600' : 'text-gray-400'}`}>{d.full}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-l border-gray-300 bg-white">
          {renderCells()}
        </div>

        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
        ) : (
          holidays.length > 0 && (
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-300 space-y-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Hari Libur & Cuti</h4>
              {holidays.map((h, i) => (
                <div key={i} className={`font-bold text-xs flex gap-2 ${h.type === "merah" ? "text-red-600" : "text-amber-500"}`}>
                  <span className="w-6">{h.date}</span>
                  <span>: {h.name}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default KalenderView;
