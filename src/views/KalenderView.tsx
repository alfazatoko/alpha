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
        <div 
          key={`prev-${i}`} 
          className="border-b border-r border-slate-100 dark:border-slate-800/80 p-1 bg-slate-50/40 dark:bg-slate-900/10 flex flex-col items-center justify-center h-[54px] sm:h-[62px] opacity-30 select-none"
        >
          <span className="text-xs font-bold text-slate-400">{dayNum}</span>
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

      let cellStyle = "bg-white dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors";
      if (isSelected) {
        cellStyle = "bg-blue-50 dark:bg-blue-950/40 ring-2 ring-inset ring-[#0000c6] dark:ring-blue-500 z-10";
      } else if (isToday) {
        cellStyle = "bg-amber-50/80 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-400/60";
      }

      cells.push(
        <div 
          key={`curr-${i}`} 
          onClick={() => setSelectedDate(dateObj)} 
          className={`border-b border-r border-slate-100 dark:border-slate-800/80 p-1 flex flex-col items-center justify-between h-[54px] sm:h-[62px] relative cursor-pointer select-none transition-all ${cellStyle}`}
        >
          {isToday && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          )}
          <span className={`text-sm sm:text-base font-black mt-0.5 tracking-tight ${gregorianColor}`}>
            {i}
          </span>
          <div className="flex flex-col items-center mb-0.5">
            <span className={`text-[8.5px] leading-none font-bold ${hijriColor}`}>
              {hijri.day}
            </span>
          </div>
        </div>
      );
    }
    const totalCells = cells.length;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      cells.push(
        <div 
          key={`next-${i}`} 
          className="border-b border-r border-slate-100 dark:border-slate-800/80 p-1 bg-slate-50/40 dark:bg-slate-900/10 flex flex-col items-center justify-center h-[54px] sm:h-[62px] opacity-30 select-none"
        >
          <span className="text-xs font-bold text-slate-400">{i}</span>
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
    <div className="page-view active bg-slate-50 dark:bg-slate-900 min-h-screen hide-scrollbar pb-24">
      {/* HEADER UTAMA: Senada Halaman Utama (bg-[#0000c6] + Geometric Pattern) */}
      <div className="relative bg-[#0000c6] text-white overflow-hidden pb-4 pt-6 px-4 shadow-md">
        {/* Futuristic Geometric Pattern (Sama dengan GlobalHeader & NotaView) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20 mix-blend-overlay"></div>
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="stripes-kalender" width="6" height="6" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
              </pattern>
            </defs>
            <circle cx="10%" cy="10%" r="60" fill="url(#stripes-kalender)" />
            <circle cx="95%" cy="95%" r="80" fill="url(#stripes-kalender)" />
            <circle cx="35%" cy="30%" r="20" fill="url(#stripes-kalender)" opacity="0.8" />
            <circle cx="80%" cy="60%" r="30" fill="url(#stripes-kalender)" opacity="0.6" />
            <circle cx="50%" cy="50%" r="90" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx="15%" cy="75%" r="7" fill="rgba(255,255,255,0.7)" />
            <circle cx="80%" cy="35%" r="4" fill="#ffffff" opacity="0.8" />
          </svg>
        </div>

        {/* Content Header Bar (Minimalis 1 Baris Utama) */}
        <div className="relative z-10 max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Tombol Back */}
          <button 
            onClick={() => setActiveView('view-beranda')}
            className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 active:scale-90 hover:bg-white/25 transition-all shadow-sm"
            title="Kembali ke Beranda"
          >
            <i className="fa-solid fa-arrow-left text-sm"></i>
          </button>

          {/* Judul & Subtitle */}
          <div className="flex-1 text-center">
            <h1 className="text-xs sm:text-sm font-black text-white leading-tight uppercase tracking-widest drop-shadow-sm">
              KALENDER KERJA
            </h1>
            <p className="text-[7.5px] sm:text-[8.5px] text-blue-100 font-bold uppercase tracking-wider opacity-90 drop-shadow-sm mt-0.5">
              PENANGGALAN MASEHI, HIJRIAH & HARI LIBUR
            </p>
          </div>

          {/* Tombol Aksi Kanan (Hari Ini & Exit) */}
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setSelectedDate(now);
              }}
              title="Ke Tanggal Hari Ini"
              className="px-2.5 h-9 rounded-xl bg-white text-[#0000c6] flex items-center justify-center gap-1 shadow-md active:scale-90 hover:bg-blue-50 transition-all font-black text-[10px]"
            >
              <i className="fa-solid fa-calendar-day text-[11px]"></i>
              <span className="hidden sm:inline">Hari Ini</span>
            </button>
            <button 
              onClick={() => setActiveView('view-beranda')}
              className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 active:scale-90 hover:bg-white/25 transition-all shadow-sm"
              title="Tutup"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Status & Month Navigator Bar (Mirip White Bar di Beranda & Nota) */}
      <div className="px-3 -mt-2.5 relative z-20 max-w-2xl mx-auto">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm w-full flex items-center justify-between px-3 py-1.5 rounded-full shadow-md border border-slate-200/80 dark:border-slate-700/80">
          {/* Navigasi Bulan Prev & Next */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-90 transition-all text-xs"
              title="Bulan Sebelumnya"
            >
              <i className="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            
            <div className="px-2.5 py-1 text-center">
              <span className="text-xs sm:text-sm font-black text-[#0000c6] dark:text-blue-400 tracking-wide uppercase">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
            </div>

            <button 
              onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
              className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-90 transition-all text-xs"
              title="Bulan Berikutnya"
            >
              <i className="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
          </div>

          {/* Selector Tahun Ringkas */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select 
                className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full pl-2.5 pr-6 py-1 font-black text-[9px] text-slate-800 dark:text-slate-100 outline-none cursor-pointer appearance-none"
                value={currentYear}
                onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentMonth, 1))}
              >
                {Array.from({length: 10}).map((_, i) => {
                  const y = new Date().getFullYear() - 5 + i;
                  return <option key={y} value={y} className="text-slate-900">{y}</option>;
                })}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[7px] text-slate-400 pointer-events-none"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-bar Hijriah Periode Bulan Ini */}
      <div className="max-w-2xl mx-auto px-3.5 pt-3">
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl px-3 py-1.5 flex items-center justify-between text-[8.5px] sm:text-[9.5px] font-bold text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-1.5">
            <i className="fa-solid fa-moon text-emerald-600 text-[10px]"></i>
            <span className="uppercase tracking-wider">Bulan Hijriah:</span>
          </div>
          <span className="font-black">
            {firstHijri.month} {firstHijri.year} H {firstHijri.month !== lastHijri.month ? `– ${lastHijri.month} ${lastHijri.year} H` : ''}
          </span>
        </div>
      </div>

      {/* Card Kalender Utama */}
      <div className="max-w-2xl mx-auto px-3.5 pt-2.5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          {/* Header Hari */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-900/40">
            {DAY_NAMES.map((d, i) => (
              <div key={i} className="flex flex-col items-center justify-center py-2.5 border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                <span className={`text-[10px] font-black uppercase tracking-wider ${d.isWeekend ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {d.short}
                </span>
                <span className={`text-[7px] font-bold uppercase tracking-tight ${d.isWeekend ? 'text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
                  {d.full.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Sel Kalender */}
          <div className="grid grid-cols-7">
            {renderCells()}
          </div>
        </div>
      </div>

      {/* Detail Tanggal Terpilih & Daftar Libur */}
      <div className="max-w-2xl mx-auto px-3.5 pt-3 space-y-3">
        {selectedDate && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#0000c6] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex flex-col items-center justify-center shrink-0">
                <span className="text-lg font-black leading-none">{selectedDate.getDate()}</span>
                <span className="text-[7.5px] font-bold uppercase tracking-tight text-slate-400 mt-0.5">{DAY_NAMES[selectedDate.getDay()].full.slice(0, 3)}</span>
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                  {DAY_NAMES[selectedDate.getDay()].full}, {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </p>
                {(() => {
                  const h = getHijriDate(selectedDate);
                  return (
                    <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                      <i className="fa-solid fa-moon text-[8px]"></i>
                      <span>{h.day} {h.month} {h.year} H</span>
                    </p>
                  );
                })()}
              </div>
            </div>

            {(() => {
              const hol = holidays.find(h => h.date === selectedDate.getDate());
              if (hol) {
                return (
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider shrink-0",
                    hol.type === 'merah' ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-600 border border-amber-200"
                  )}>
                    {hol.name}
                  </span>
                );
              }
              if (selectedDate.getDay() === 0) {
                return (
                  <span className="px-2.5 py-1 rounded-full text-[8.5px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                    Hari Minggu
                  </span>
                );
              }
              return (
                <span className="px-2.5 py-1 rounded-full text-[8.5px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-700/50 shrink-0">
                  Hari Kerja
                </span>
              );
            })()}
          </div>
        )}

        {/* Daftar Hari Libur & Cuti Bulan Ini */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700 mb-2.5">
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-[10px]">
              <i className="fa-solid fa-calendar-xmark"></i>
            </div>
            <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Hari Libur & Cuti Bersama ({MONTH_NAMES[currentMonth]})
            </h4>
          </div>

          {loading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
          ) : holidays.length === 0 ? (
            <div className="py-4 text-center text-slate-400 dark:text-slate-500 italic text-[11px]">
              Tidak ada hari libur nasional atau cuti bersama di bulan ini
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map((h, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs p-2 rounded-xl bg-slate-50/60 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
                  <span className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-black text-[11px] shrink-0",
                    h.type === "merah" ? "bg-red-50 text-red-600 border border-red-200/60" : "bg-amber-50 text-amber-600 border border-amber-200/60"
                  )}>
                    {h.date}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-bold truncate text-[11px]", h.type === "merah" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400")}>
                      {h.name}
                    </p>
                    <p className="text-[8.5px] font-medium text-slate-400 uppercase tracking-tight">
                      {h.type === "merah" ? "Libur Nasional" : "Cuti Bersama"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KalenderView;
