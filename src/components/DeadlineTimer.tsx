import { useState, useEffect } from 'react';

// Pass the smart contract data into the timer
export default function DeadlineTimer({ lastCheckIn, daysCompleted }: { lastCheckIn: number, daysCompleted: number }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [status, setStatus] = useState<'READY' | 'RECOVERY' | 'LIQUIDATION'>('READY');

  useEffect(() => {
    const calculateTime = () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const COOLDOWN_PERIOD = 57600; // 16 hours in seconds

      // 1. First Workout (No cooldown, ready immediately)
      if (daysCompleted === 0) {
        setStatus('READY');
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const timeSinceLastWorkout = currentTimestamp - lastCheckIn;

      // 2. Muscle Recovery Mode (Under 16 hours)
      if (timeSinceLastWorkout < COOLDOWN_PERIOD) {
        setStatus('RECOVERY');
        const secondsLeft = COOLDOWN_PERIOD - timeSinceLastWorkout;
        
        setTimeLeft({
          hours: Math.floor((secondsLeft / 3600)),
          minutes: Math.floor((secondsLeft % 3600) / 60),
          seconds: Math.floor(secondsLeft % 60)
        });
      } 
      // 3. Ready to Lift / Liquidation countdown
      else {
        setStatus('READY');
        // If you want it to count down to midnight after recovery, you can add that here, 
        // but showing 00:00:00 and "READY TO LIFT" is the cleanest UX!
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
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
        ? 'border-blue-900 bg-blue-950/20 shadow-[0_0_20px_rgba(30,58,138,0.2)]' // Blue for recovery
        : status === 'READY'
        ? 'border-green-900 bg-green-950/20 shadow-[0_0_20px_rgba(20,83,45,0.2)]' // Green for ready
        : 'border-zinc-800 bg-black shadow-[0_0_15px_rgba(0,0,0,1)]'
    }`}>
      
      {/* Background glitch aesthetic */}
      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] mix-blend-overlay pointer-events-none"></div>

      <span className={`text-[10px] uppercase font-black tracking-[0.3em] mb-2 z-10 ${status === 'RECOVERY' ? 'text-blue-500' : 'text-green-500'}`}>
        {status === 'RECOVERY' ? 'Muscle Recovery Phase' : 'Iron is Hot'}
      </span>
      
      <div className={`font-mono text-4xl md:text-5xl font-black tracking-tighter z-10 flex items-center gap-2 ${
        status === 'RECOVERY' ? 'text-blue-400' : 'text-green-400 animate-pulse'
      }`}>
        {status === 'READY' ? (
          <span className="text-3xl tracking-widest uppercase">Ready to Lift</span>
        ) : (
          <>
            <span>{format(timeLeft.hours)}</span>
            <span className="text-zinc-600 mb-2">:</span>
            <span>{format(timeLeft.minutes)}</span>
            <span className="text-zinc-600 mb-2">:</span>
            <span>{format(timeLeft.seconds)}</span>
          </>
        )}
      </div>

      {status === 'RECOVERY' && (
        <div className="absolute bottom-0 w-full h-1 bg-blue-600 opacity-50"></div>
      )}
      {status === 'READY' && (
        <div className="absolute bottom-0 w-full h-1 bg-green-600 animate-pulse"></div>
      )}
    </div>
  );
}