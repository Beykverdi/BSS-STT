import { useEffect, useRef } from 'react';

interface WaveAnimationProps {
  isActive: boolean;
}

export function WaveAnimation({ isActive }: WaveAnimationProps) {
  const bars = Array.from({ length: 20 });

  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {bars.map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all ${
            isActive ? 'bg-blue-500 animate-wave' : 'bg-gray-300'
          }`}
          style={{
            height: isActive ? undefined : '8px',
            animationDelay: isActive ? `${i * 0.05}s` : '0s',
            animationDuration: isActive ? `${0.8 + (i % 5) * 0.15}s` : '0s',
          }}
        />
      ))}
    </div>
  );
}
