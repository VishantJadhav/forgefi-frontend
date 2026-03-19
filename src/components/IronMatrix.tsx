export default function IronMatrix({ daysCommitted, daysCompleted = 2 }: { daysCommitted: number, daysCompleted?: number }) {
  // Create an array representing the total days
  const blocks = Array.from({ length: daysCommitted }, (_, i) => i);

  return (
    <div className="w-full flex flex-col gap-2 mt-2 relative z-10">
      <div className="flex justify-between items-end">
        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em]">
          The Iron Matrix
        </span>
        <span className="text-[10px] text-red-500 uppercase font-black tracking-widest">
          {daysCompleted} / {daysCommitted} Check-ins
        </span>
      </div>
      
      <div className="grid grid-cols-6 gap-2">
        {blocks.map((blockIndex) => {
          const isCompleted = blockIndex < daysCompleted;
          
          return (
            <div 
              key={blockIndex} 
              className={`h-12 w-full border-2 transition-all duration-500 ${
                isCompleted 
                  ? 'bg-red-600 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                  : 'bg-black border-zinc-800 shadow-inner'
              }`}
            >
              {isCompleted && (
                <div className="w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMiIvPgo8L3N2Zz4=')] mix-blend-overlay"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}