import { useEffect, useState } from 'react';

export default function IronMatrix({ 
  daysCommitted, 
  daysCompleted = 0, 
  missedDays = 0,
  userKey
}: { 
  daysCommitted: number; 
  daysCompleted?: number;
  missedDays: number;
  userKey?: string;
}) {
  const [sequence, setSequence] = useState<string[]>([]);

  // THE CHRONOLOGICAL LISTENER
  useEffect(() => {
    if (!userKey) return;
    
    const storageKey = `forgefi_matrix_seq_${userKey}`;
    const savedSeq = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    const savedCompleted = savedSeq.filter((s: string) => s === 'completed').length;
    const savedMissed = savedSeq.filter((s: string) => s === 'missed').length;
    
    let newSeq = [...savedSeq];
    
    if (daysCompleted > savedCompleted) {
      const diff = daysCompleted - savedCompleted;
      for(let i=0; i<diff; i++) newSeq.push('completed');
    }
    
    if (missedDays > savedMissed) {
      const diff = missedDays - savedMissed;
      for(let i=0; i<diff; i++) newSeq.push('missed');
    }
    
    if (daysCompleted === 0 && missedDays === 0) {
      newSeq = [];
    }

    setSequence(newSeq);
    localStorage.setItem(storageKey, JSON.stringify(newSeq));
    
  }, [daysCompleted, missedDays, userKey]);

  const blocks = Array.from({ length: daysCommitted }, (_, i) => {
    if (i < sequence.length) return sequence[i];
    return 'pending';
  });

  return (
    <div className="w-full flex flex-col gap-2 mt-2 relative z-10">
      <div className="flex justify-between items-end">
        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">
          The Iron Matrix
        </span>
        <span className="text-[10px] text-red-500 uppercase font-black tracking-widest">
          {daysCompleted} / {daysCommitted} Forged
        </span>
      </div>
      
      {/* FIX 1: Swapped Grid for Flexbox with justify-center */}
      <div className="flex flex-wrap justify-center gap-3 py-2">
        {blocks.map((status, blockIndex) => {
          const isCompleted = status === 'completed';
          const isMissed = status === 'missed';
          
          return (
            <div 
              key={blockIndex} 
              // Added fixed w-12 to keep them perfectly square while centering
              className={`h-12 w-12 flex-shrink-0 border-2 transition-all duration-500 relative flex items-center justify-center overflow-hidden ${
                isCompleted 
                  ? 'bg-red-600 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                  : isMissed
                  ? 'bg-zinc-900 border-zinc-800'
                  // FIX 2: Brighter gunmetal border (zinc-600) and full opacity for visibility
                  : 'bg-black border-zinc-600 shadow-inner'
              }`}
            >
              {/* COMPLETED: The SVG Overlay */}
              {isCompleted && (
                <div className="absolute inset-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4=')] mix-blend-overlay"></div>
              )}

              {/* MISSED: The Dead "X" */}
              {isMissed && (
                <div className="absolute inset-0 flex items-center justify-center opacity-100">
                  <div className="w-full h-1 bg-red-600 rotate-45 absolute"></div>
                  <div className="w-full h-1 bg-red-600 -rotate-45 absolute"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}