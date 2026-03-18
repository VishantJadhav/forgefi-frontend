import { useState, useEffect } from 'react';

export default function DeadlineTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isCritical, setIsCritical] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Set deadline to midnight tonight
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      
      const difference = midnight.getTime() - now.getTime();
      
      if (difference > 0) {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        
        setTimeLeft({ hours, minutes, seconds });
        
        // If less than 3 hours remain, trigger critical UI state
        setIsCritical(hours < 3);
      }
    };

    // Update the clock every second
    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft(); // Initial call
    
    return () => clearInterval(timer);
  }, []);

  // Pad numbers with leading zeros (e.g., "09" instead of "9")
  const format = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className={`w-full border-2 p-4 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      isCritical 
        ? 'border-red-600 bg-red-950/40 shadow-[0_0_30px_rgba(220,38,38,0.4)]' 
        : 'border-zinc-800 bg-black shadow-[0_0_15px_rgba(0,0,0,1)]'
    }`}>
      
      {/* Background glitch aesthetic */}
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] mix-blend-overlay pointer-events-none"></div>

      <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] mb-2 z-10">
        Time Until Liquidation
      </span>
      
      <div className={`font-mono text-4xl md:text-5xl font-black tracking-tighter z-10 flex items-center gap-2 ${
        isCritical ? 'text-red-500 animate-pulse' : 'text-zinc-300'
      }`}>
        <span>{format(timeLeft.hours)}</span>
        <span className={`text-zinc-600 mb-2 ${isCritical ? 'text-red-800' : ''}`}>:</span>
        <span>{format(timeLeft.minutes)}</span>
        <span className={`text-zinc-600 mb-2 ${isCritical ? 'text-red-800' : ''}`}>:</span>
        <span>{format(timeLeft.seconds)}</span>
      </div>

      {isCritical && (
        <div className="absolute bottom-0 w-full h-1 bg-red-600 animate-pulse"></div>
      )}
    </div>
  );
}