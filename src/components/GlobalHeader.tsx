import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

export interface GlobalHeaderProps {
  storePhoto?: string;
  storeName?: string;
  storeSubtext?: string;
  kasirName?: string;
  kasirRole?: string;
  dayName?: string;
  fullDate?: string;
  clockStr?: string;
  
  onMenuClick?: () => void;
  showNotifBadge?: boolean;
  notifBadgeCount?: number;
  onNotifClick?: () => void;
  notifPopupContent?: React.ReactNode;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  storePhoto, storeName, storeSubtext, kasirName, kasirRole, 
  dayName: propDayName, fullDate: propFullDate, clockStr: propClockStr,
  onMenuClick, showNotifBadge, notifBadgeCount, onNotifClick, notifPopupContent
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const dayName = propDayName || currentTime.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
  const fullDate = propFullDate || currentTime.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const clockStr = propClockStr || currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="relative theme-header pb-8 pt-10">
      {/* TOP ROW: Logo/Text on left, Buttons on right */}
      <div className="px-4 flex items-center justify-between gap-3 mb-4">
        {/* LOGO + TEXT */}
        <div className="flex items-center gap-3">
          {storePhoto ? (
            <img src={storePhoto} alt="Logo" className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/50 shadow-md" />
          ) : (
            <img src="/logo_icon.png" alt="Logo" className="w-11 h-11 sm:w-12 sm:h-12 object-contain" />
          )}
          <div>
            <h1 className="text-[12px] sm:text-[13px] font-black text-white leading-tight uppercase tracking-widest">{storeName || 'ALFAZA CELL'}</h1>
            <p className="text-blue-200 text-[7px] sm:text-[8px] font-bold uppercase tracking-tighter opacity-80">{storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col items-end justify-center gap-1">
          <div className="flex items-center justify-end gap-1.5">
            <button 
              onClick={() => window.location.reload()} 
              className="w-8 h-8 rounded-[10px] bg-emerald-500/90 backdrop-blur-md flex items-center justify-center text-white border border-emerald-400/50 shadow-lg active:scale-90 hover:bg-emerald-600/90 transition-all"
            >
              <i className="fa-solid fa-rotate-right text-[11px]"></i>
            </button>

            {kasirRole === 'owner' ? (
              <button 
                onClick={onNotifClick}
                className="relative w-8 h-8 rounded-[10px] bg-amber-500/90 backdrop-blur-md flex items-center justify-center text-white border border-amber-400/50 shadow-lg active:scale-90 hover:bg-amber-600/90 transition-all"
                title="Notifikasi Owner"
              >
                <i className="fa-solid fa-bell text-[11px]"></i>
                {showNotifBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-rose-600 text-white text-[7.5px] font-black flex items-center justify-center border border-rose-400 shadow-sm animate-in zoom-in duration-200">
                    {notifBadgeCount}
                  </span>
                )}
              </button>
            ) : (
              <div className="relative z-50">
                <button 
                  onClick={onNotifClick}
                  className="relative w-8 h-8 rounded-[10px] bg-rose-500/90 backdrop-blur-md flex items-center justify-center text-white border border-rose-400/50 shadow-lg active:scale-90 hover:bg-rose-600/90 transition-all"
                >
                  <i className="fa-solid fa-bell text-[11px]"></i>
                  {showNotifBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[7.5px] font-black shadow-sm border border-red-400">
                      {notifBadgeCount}
                    </span>
                  )}
                </button>
                {notifPopupContent}
              </div>
            )}

            <button 
              onClick={onMenuClick} 
              className="w-8 h-8 rounded-[10px] bg-blue-500/90 backdrop-blur-md flex items-center justify-center text-white border border-blue-400/50 shadow-lg active:scale-90 hover:bg-blue-600/90 transition-all"
            >
              <i className="fa-solid fa-bars text-[11px]"></i>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: White Bar */}
      <div className="px-1.5">
        <div className="bg-white w-full flex items-center justify-between px-3 py-1.5 rounded-xl shadow-sm border border-white/50">
          <div className="flex items-center gap-1.5">
            <span className="bg-blue-50/50 text-blue-800 text-[8.5px] sm:text-[9px] font-black px-2 py-1 rounded-full flex items-center gap-1.5">
              <i className="fa-solid fa-user-circle text-[11px] text-blue-600"></i>
              {kasirRole === 'owner' ? 'Owner : ' : 'Kasir : '}{kasirName}
            </span>
            <span className={cn(
              "text-[8px] sm:text-[8.5px] px-2 py-1 rounded-full font-black flex items-center gap-1 border",
              isOnline 
                ? "text-emerald-600 border-emerald-100 bg-emerald-50/50" 
                : "text-red-500 border-red-100 bg-red-50/50"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500")}></span>
              {isOnline ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>
          
          <div className="text-[8px] sm:text-[8.5px] font-black text-gray-700 flex items-center gap-1.5">
            <i className="fa-regular fa-calendar text-blue-500"></i>
            <span>{dayName}, {fullDate.split(' ').slice(0, 3).join(' ')}</span>
            <span className="text-[8.5px] sm:text-[9px] text-blue-600 bg-blue-50/80 px-1.5 py-0.5 rounded-md tabular-nums border border-blue-100/50 ml-0.5">
              {clockStr}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
