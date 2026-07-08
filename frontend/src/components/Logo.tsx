import { useState } from 'react';

interface LogoProps {
  variant?: 'light' | 'dark';
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { icon: 32, text: 'text-lg', height: 'h-8' },
  md: { icon: 40, text: 'text-xl', height: 'h-10' },
  lg: { icon: 56, text: 'text-3xl', height: 'h-14' },
};

export default function Logo({ variant = 'light', showTagline = false, size = 'md' }: LogoProps) {
  const s = sizes[size];
  const textColor = variant === 'light' ? 'text-litmus-black' : 'text-white';
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {!logoError ? (
        <img 
          src="/logo.png" 
          onError={() => setLogoError(true)} 
          className={`${s.height} object-contain`} 
          alt="Litmus Logo" 
        />
      ) : (
        <svg width={s.icon} height={s.icon} viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="16" fill="#121212" />
          <path d="M20 14h8v26h16v8H20z" fill="#C1121F" />
          <path
            d="M44 14a14 14 0 1 1 -14 14"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
        </svg>
      )}
      <div className="leading-tight">
        <div className={`font-extrabold ${s.text} ${textColor}`}>
          <span className="text-litmus-red">Litmus</span> Solutions
        </div>
        {showTagline && (
          <div className={`text-[10px] ${variant === 'light' ? 'text-gray-500' : 'text-gray-300'}`}>
            Cyber Services &amp; Laptop Store
          </div>
        )}
      </div>
    </div>
  );
}
