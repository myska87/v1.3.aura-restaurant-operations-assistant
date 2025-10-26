import React from "react";

export default function AuraLogo({ className = "", size = "default" }) {
  const sizeClasses = {
    small: "h-8",
    default: "h-10",
    large: "h-16",
  };

  // Try to get generated logo from localStorage
  const generatedLogo = typeof window !== 'undefined' 
    ? localStorage.getItem('aura_logo_url') 
    : null;

  if (generatedLogo) {
    return (
      <img
        src={generatedLogo}
        alt="AURA Restaurant Management"
        className={`${sizeClasses[size]} w-auto ${className}`}
      />
    );
  }

  // Fallback: Styled text logo
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        {/* Logo Icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#014D40] via-emerald-600 to-[#E0B037] flex items-center justify-center shadow-lg">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Restaurant/Chef Hat Icon */}
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" y1="17" x2="18" y2="17" />
          </svg>
        </div>
        {/* Gold accent dot */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#E0B037] rounded-full border-2 border-white"></div>
      </div>
      
      {/* Text Logo */}
      <div className="flex flex-col">
        <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-[#014D40] to-emerald-600 bg-clip-text text-transparent">
          AURA
        </span>
        <span className="text-[9px] font-semibold text-gray-500 tracking-widest -mt-1">
          ONE PRO
        </span>
      </div>
    </div>
  );
}