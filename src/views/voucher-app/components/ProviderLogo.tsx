/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface ProviderLogoProps {
  operator: 'Telkomsel' | 'Axis' | 'Indosat' | 'XL' | 'Tri' | 'Smartfren' | string;
  category?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export default function ProviderLogo({
  operator,
  category,
  className = '',
  size = 'md'
}: ProviderLogoProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 rounded-full',
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-16 h-16 rounded-2xl',
    lg: 'w-20 h-20 rounded-3xl'
  };

  const opLower = (operator || '').toLowerCase();
  const catLower = (category || '').toLowerCase();

  // If category is PLN
  if (catLower === 'pln' || opLower.includes('pln')) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 p-1.5 flex flex-col items-center justify-center shadow-sm border border-white/60 relative overflow-hidden shrink-0 ${className}`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <rect x="15" y="10" width="70" height="80" rx="8" fill="#facc15" stroke="#0284c7" strokeWidth="4" />
          {/* Waves */}
          <path d="M 25 35 Q 35 28, 45 35 T 65 35 T 80 35" fill="none" stroke="#0284c7" strokeWidth="3" />
          <path d="M 25 45 Q 35 38, 45 45 T 65 45 T 80 45" fill="none" stroke="#0284c7" strokeWidth="3" />
          <path d="M 25 55 Q 35 48, 45 55 T 65 55 T 80 55" fill="none" stroke="#0284c7" strokeWidth="3" />
          {/* Lightning Bolt */}
          <polygon points="55,15 32,52 48,52 38,82 72,42 54,42" fill="#dc2626" stroke="#b91c1c" strokeWidth="1.5" />
          <text x="50" y="88" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="900" fontFamily="sans-serif">PLN</text>
        </svg>
      </div>
    );
  }

  // Axis Logo
  if (opLower.includes('axis')) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 p-1.5 flex items-center justify-center shadow-sm border border-white/60 relative overflow-hidden shrink-0 ${className}`}
      >
        {/* Subtle metallic sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
        
        {/* Axis Purple Bubble */}
        <div className="w-[88%] h-[78%] bg-gradient-to-br from-[#7c2d82] to-[#581c87] rounded-[18px] rounded-br-[4px] flex items-center justify-center shadow-md p-1 transform transition-transform">
          <span className="text-slate-900 dark:text-white font-black text-[13px] tracking-tight font-sans">
            AXIS
          </span>
        </div>
      </div>
    );
  }

  // Telkomsel Logo
  if (opLower.includes('telkomsel') || opLower.includes('tsel')) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-gradient-to-br from-slate-100 via-rose-50 to-indigo-100 p-1 flex flex-col items-center justify-center shadow-sm border border-white/60 relative overflow-hidden shrink-0 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
        
        {/* Telkomsel Modern Origami/Diamond T Icon */}
        <div className="w-8 h-8 relative flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
            {/* Diamond outer red */}
            <polygon points="50,5 92,50 50,95 8,50" fill="#e11424" />
            {/* Left triangle facet orange-red */}
            <polygon points="50,5 50,95 8,50" fill="#cc0016" />
            {/* Right facet */}
            <polygon points="50,5 92,50 50,95" fill="#f02438" />
            {/* Stylized White T */}
            <path 
              d="M 28 32 L 72 32 L 72 44 L 56 44 L 56 75 L 44 75 L 44 44 L 28 44 Z" 
              fill="#ffffff" 
            />
          </svg>
        </div>
        <span className="text-[8.5px] font-black text-slate-900 tracking-tighter mt-0.5 font-sans leading-none">
          Telkomsel
        </span>
      </div>
    );
  }

  // Indosat / im3 Logo
  if (opLower.includes('indosat') || opLower.includes('im3') || opLower.includes('isat')) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 p-1 flex flex-col items-center justify-center shadow-sm border border-white/60 relative overflow-hidden shrink-0 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none" />
        
        {/* im3 logo representation */}
        <div className="flex items-center justify-center leading-none mt-1">
          {/* Stylized 'i' with red dot */}
          <div className="flex flex-col items-center mr-[1px]">
            <span className="w-[5px] h-[5px] rounded-full bg-red-600 mb-[2px] shadow-sm" />
            <span className="w-[5px] h-[14px] bg-black rounded-sm" />
          </div>
          {/* 'm3' */}
          <span className="font-black text-black text-[22px] tracking-tighter font-sans leading-none">
            m3
          </span>
        </div>

        {/* Indosat text */}
        <span className="text-[6px] font-black text-black uppercase tracking-widest mt-1 opacity-80">
          INDOSAT
        </span>
      </div>
    );
  }

  // Tri (3) Logo
  if (opLower.includes('tri') || opLower.includes('3')) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-gradient-to-br from-slate-800 via-slate-900 to-black p-1 flex items-center justify-center shadow-sm border border-white/20 relative overflow-hidden shrink-0 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
        
        <span className="font-black text-slate-900 dark:text-white text-[42px] leading-none font-sans drop-shadow-md">
          3
        </span>
      </div>
    );
  }

  // XL Logo
  if (opLower.includes('xl')) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-gradient-to-br from-slate-100 via-blue-50 to-emerald-50 p-1 flex flex-col items-center justify-center shadow-sm border border-white/60 relative overflow-hidden shrink-0 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
        
        {/* XL Axiata Logo */}
        <div className="flex items-center justify-center">
          <svg viewBox="0 0 100 80" className="w-10 h-8 drop-shadow-sm">
            {/* X in Blue & Green ribbon */}
            <path d="M 15 15 L 45 65" stroke="#0284c7" strokeWidth="14" strokeLinecap="round" />
            <path d="M 45 15 L 15 65" stroke="#10b981" strokeWidth="14" strokeLinecap="round" />
            {/* L in Royal Blue */}
            <path d="M 60 15 L 60 65 L 85 65" fill="none" stroke="#1d4ed8" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[8px] font-black text-slate-800 tracking-tighter -mt-0.5 font-sans">
          AXIATA
        </span>
      </div>
    );
  }

  // Smartfren Logo
  if (opLower.includes('smartfren') || opLower.includes('smart')) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-gradient-to-br from-slate-100 via-rose-50 to-red-100 p-1 flex flex-col items-center justify-center shadow-sm border border-white/60 relative overflow-hidden shrink-0 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
        
        <div className="w-8 h-8 relative flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm">
            {/* Smartfren red curve loops */}
            <path d="M 20 60 C 20 30, 45 20, 60 35 C 75 50, 50 70, 75 75 C 85 77, 90 70, 90 70" 
              fill="none" 
              stroke="#e11d48" 
              strokeWidth="12" 
              strokeLinecap="round" 
            />
          </svg>
        </div>
        <span className="text-[7.5px] font-black text-rose-500 font-black dark:text-rose-400 tracking-tight font-sans -mt-1">
          smartfren
        </span>
      </div>
    );
  }

  // Default / Game / General
  return (
    <div 
      className={`${sizeClasses[size]} bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 p-1 flex items-center justify-center shadow-sm border border-white/60 relative overflow-hidden shrink-0 ${className}`}
    >
      <div className="w-[85%] h-[85%] rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-md font-black text-slate-900 dark:text-white text-xs">
        {operator ? operator.substring(0, 3).toUpperCase() : 'VOU'}
      </div>
    </div>
  );
}
