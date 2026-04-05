import { useState, useEffect } from 'react';

export default function DeadlineTimer({ lastCheckIn, daysCompleted }: { lastCheckIn: number, daysCompleted: number }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [status, setStatus] = useState<'READY' | 'RECOVERY' | 'CRITICAL'>('READY');

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const currentTimestamp = Math.floor(now.getTime() / 1000);
      const COOLDOWN_PERIOD = 57600; // 16 hours in seconds
      
      // Calculate time until midnight tonight
      const midnight = new Date();
      midnight.setHours(23, 59, 59, 999);
      const secondsToMidnight = Math.floor((midnight.getTime() - now.getTime()) / 1000);

      const timeSinceLastWorkout = currentTimestamp - lastCheckIn;
      const isRecovering = daysCompleted > 0 && timeSinceLastWorkout < COOLDOWN_PERIOD;

      // 1. RECOVERY MODE (Blue)
      if (isRecovering) {
        setStatus('RECOVERY');
        const secondsLeft = COOLDOWN_PERIOD - timeSinceLastWorkout;
        setTimeLeft({
          hours: Math.floor((secondsLeft / 3600)),
          minutes: Math.floor((secondsLeft % 3600) / 60),
          seconds: Math.floor(secondsLeft % 60)
        });
      } 
      // 2. ACTIVE COUNTDOWN TO MIDNIGHT (Green or Red)
      else {
        if (secondsToMidnight < 10800) { // Less than 3 hours = CRITICAL
          setStatus('CRITICAL');
        } else {
          setStatus('READY');
        }
        
        setTimeLeft({
          hours: Math.floor((secondsToMidnight / 3600)),
          minutes: Math.floor((secondsToMidnight % 3600) / 60),
          seconds: Math.floor(secondsToMidnight % 60)
        });
      }
    };

    const timer = setInterval(calculateTime, 1000);
    calculateTime(); // Initial call
    
    return () => clearInterval(timer);
  }, [lastCheckIn, daysCompleted]);

  const format = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className={`w-full border-2 p-4 flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-500 ${
      status === 'RECOVERY' 
        ? 'border-blue-900 bg-blue-950/20 shadow-[0_0_20px_rgba(30,58,138,0.2)]'
        : status === 'CRITICAL'
        ? 'border-red-600 bg-red-950/40 shadow-[0_0_30px_rgba(220,38,38,0.4)]'
        : 'border-green-900 bg-green-950/20 shadow-[0_0_20px_rgba(20,83,45,0.2)]'
    }`}>
      
      {/* Background glitch aesthetic */}
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] mix-blend-overlay pointer-events-none"></div>

      <span className={`text-[10px] uppercase font-black tracking-[0.3em] mb-2 z-10 ${
        status === 'RECOVERY' ? 'text-blue-500' : status === 'CRITICAL' ? 'text-red-500' : 'text-green-500'
      }`}>
        {status === 'RECOVERY' ? 'Muscle Recovery Phase' : status === 'CRITICAL' ? 'Liquidation Imminent' : 'Time Until Liquidation'}
      </span>
      
      <div className={`font-mono text-4xl md:text-5xl font-black tracking-tighter z-10 flex items-center gap-2 ${
        status === 'RECOVERY' ? 'text-blue-400' : status === 'CRITICAL' ? 'text-red-500 animate-pulse' : 'text-green-400'
      }`}>
        <span>{format(timeLeft.hours)}</span>
        <span className={`text-zinc-600 mb-2 ${status === 'CRITICAL' ? 'text-red-800' : ''}`}>:</span>
        <span>{format(timeLeft.minutes)}</span>
        <span className={`text-zinc-600 mb-2 ${status === 'CRITICAL' ? 'text-red-800' : ''}`}>:</span>
        <span>{format(timeLeft.seconds)}</span>
      </div>

      {status === 'RECOVERY' && <div className="absolute bottom-0 w-full h-1 bg-blue-600 opacity-50"></div>}
      {status === 'CRITICAL' && <div className="absolute bottom-0 w-full h-1 bg-red-600 animate-pulse"></div>}
      {status === 'READY' && <div className="absolute bottom-0 w-full h-1 bg-green-600 opacity-50"></div>}
    </div>
  );
}