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
    <div className="relative theme-header" style={{ paddingBottom: '2.5rem' }}>
      <div className="px-4 pt-12 pb-2 flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {storePhoto ? (
              <img src={storePhoto} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-md" />
            ) : (
              <img src="/logo_icon.png" alt="Logo" className="w-12 h-12 object-contain" />
            )}
            <div>
              <h1 className="text-[13px] font-black text-white leading-tight uppercase tracking-widest">{storeName || 'ALFAZA CELL'}</h1>
              <p className="text-blue-200 text-[8px] font-bold uppercase tracking-tighter opacity-80">{storeSubtext || 'Pembukuan Agen brilink & Konter'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-white text-[10px] font-black">{kasirName}</span>
                <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full font-black", kasirRole === 'owner' ? "bg-amber-400 text-amber-900" : "bg-white/25 text-white")}>
                  {kasirRole === 'owner' ? 'OWNER' : 'KASIR'}
                </span>
                <span className={cn(
                  "text-[7px] px-1.5 py-0.5 rounded-full font-black flex items-center gap-1",
                  isOnline 
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                    : "bg-red-500 text-white animate-pulse"
                )}>
                  <span className={cn("w-1 h-1 rounded-full", isOnline ? "bg-emerald-400" : "bg-white")}></span>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end justify-center gap-0.5">
            <div className="text-right">
              <p className="text-blue-200 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5">
                {dayName}, <span className="text-blue-100 tabular-nums">{clockStr}</span>
              </p>
              <p className="text-white text-[9px] sm:text-[10px] font-black tracking-tight leading-none mb-0.5">{fullDate}</p>
            </div>

            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              {kasirRole !== 'owner' && (
                <div className="relative z-50">
                  <button 
                    onClick={onNotifClick}
                    className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-[10px] sm:rounded-xl bg-rose-500/90 backdrop-blur-md flex items-center justify-center text-white border border-rose-400/50 shadow-lg active:scale-90 hover:bg-rose-600/90 transition-all"
                  >
                    <i className="fa-solid fa-bell text-[10px] sm:text-[11px]"></i>
                    {showNotifBadge && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 rounded-full flex items-center justify-center text-[7px] font-black shadow-sm border border-red-400">
                        {notifBadgeCount}
                      </span>
                    )}
                  </button>
                  {notifPopupContent}
                </div>
              )}

              <button 
                onClick={() => window.location.reload()} 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-[10px] sm:rounded-xl bg-emerald-500/90 backdrop-blur-md flex items-center justify-center text-white border border-emerald-400/50 shadow-lg active:scale-90 hover:bg-emerald-600/90 transition-all"
              >
                <i className="fa-solid fa-rotate-right text-[10px] sm:text-[11px]"></i>
              </button>

              <button 
                onClick={onMenuClick} 
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-[10px] sm:rounded-xl bg-blue-500/90 backdrop-blur-md flex items-center justify-center text-white border border-blue-400/50 shadow-lg active:scale-90 hover:bg-blue-600/90 transition-all"
              >
                <i className="fa-solid fa-bars text-[10px] sm:text-[11px]"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
