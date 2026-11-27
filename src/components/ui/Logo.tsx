import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  lightText?: boolean;
  pgName?: string;
}

export const DasPGLogo: React.FC<LogoProps> = ({
  size = 'md',
  lightText = true,
  pgName = 'DAS PG',
}) => {
  const iconDim = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const titleSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className={`${iconDim} rounded-xl bg-[#0B192C] border border-emerald-400/40 shadow-sm flex items-center justify-center shrink-0`}
      >
        <svg viewBox="0 0 64 64" className="w-[78%] h-[78%]" fill="none">
          <path
            d="M32 8L10 25V53C10 54.6569 11.3431 56 13 56H51C52.6569 56 54 54.6569 54 53V25L32 8Z"
            fill="#132B4A"
            stroke="#10B981"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M20 30H27C31.5 30 34.5 32.8 34.5 37.5C34.5 42.2 31.5 45 27 45H20V30Z"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          <path
            d="M38.5 45V30H43.5C46.2 30 48 31.8 48 34.5C48 37.2 46.2 39 43.5 39H38.5"
            stroke="#10B981"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="leading-tight">
        <div
          className={`${titleSize} font-bold tracking-tight ${
            lightText ? 'text-white' : 'text-[#0B192C]'
          }`}
        >
          {pgName.toUpperCase()}
        </div>
        <div
          className={`text-[10px] font-semibold uppercase tracking-widest ${
            lightText ? 'text-emerald-400' : 'text-emerald-600'
          }`}
        >
          PG Management
        </div>
      </div>
    </div>
  );
};
