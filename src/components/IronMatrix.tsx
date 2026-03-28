export default function IronMatrix({ 
  daysCommitted, 
  daysCompleted = 0, 
  missedDays = 0 
}: { 
  daysCommitted: number; 
  daysCompleted?: number;
  missedDays: number;
}) {
  // Create an array representing the total days
  const blocks = Array.from({ length: daysCommitted }, (_, i) => i);

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
      
      <div className="grid grid-cols-6 gap-2">
        {blocks.map((blockIndex) => {
          // Determine the status of the current block
          const isCompleted = blockIndex < daysCompleted;
          const isMissed = blockIndex >= daysCompleted && blockIndex < daysCompleted + missedDays;
          const isPending = !isCompleted && !isMissed;
          
          return (
            <div 
              key={blockIndex} 
              className={`h-12 w-full border-2 transition-all duration-500 relative flex items-center justify-center overflow-hidden ${
                isCompleted 
                  ? 'bg-red-600 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                  : isMissed
                  ? 'bg-zinc-900 border-zinc-800'
                  : 'bg-black border-zinc-800/50 shadow-inner opacity-50'
              }`}
            >
              {/* COMPLETED: The SVG Overlay */}
              {isCompleted && (
                <div className="absolute inset-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4=')] mix-blend-overlay"></div>
              )}

              {/* MISSED: The Dead "X" */}
              {isMissed && (
                <div className="absolute inset-0 flex items-center justify-center opacity-30">
                  <div className="w-full h-0.5 bg-red-900 rotate-45 absolute"></div>
                  <div className="w-full h-0.5 bg-red-900 -rotate-45 absolute"></div>
                </div>
              )}

              {/* Day Number inside the block */}
              <span className={`text-[10px] font-black font-mono z-10 ${
                isCompleted ? 'text-white' : isMissed ? 'text-zinc-700' : 'text-zinc-700'
              }`}>
                {blockIndex + 1}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}