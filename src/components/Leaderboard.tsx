// The ForgeFi Gamified Ranking System
const FORGE_RANKS = [
  { minDays: 180, title: "TREN FIEND", color: "text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]" },
  { minDays: 90,  title: "IRON ZEALOT", color: "text-purple-500" },
  { minDays: 30,  title: "EGO-LIFTER", color: "text-red-500" },
  { minDays: 7,   title: "PLATE RATTLER", color: "text-orange-500" },
  { minDays: 1,   title: "EMPTY BAR", color: "text-zinc-300" },
  { minDays: 0,   title: "CHALK DUST", color: "text-zinc-600" },
];

const getRank = (days: number) => {
  return FORGE_RANKS.find(rank => days >= rank.minDays) || FORGE_RANKS[5];
};

// Mock Data (To be replaced with Solana Smart Contract data later)
const MOCK_LEADERBOARD = [
  { wallet: "7x9A...3fB2", streak: 214 },
  { wallet: "2pL4...9mK1", streak: 112 },
  { wallet: "9qX1...4vC8", streak: 45 },
  { wallet: "4aB3...1nZ7", streak: 12 },
  { wallet: "8mM2...6pX9", streak: 4 },
  { wallet: "1zY9...8wQ4", streak: 0 },
];

export default function Leaderboard() {
  return (
    <div className="w-full mx-auto animate-fade-in relative z-20">
      
      {/* Header */}
      <div className="flex flex-col items-center mb-8">
        <h2 className="text-4xl font-black uppercase text-white tracking-tighter drop-shadow-lg text-center">
          The Hall of Iron
        </h2>
        <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-xs mt-2 text-center">
          Verified On-Chain Streaks
        </p>
      </div>

      {/* The Brutalist Table */}
      <div className="border-2 border-zinc-800 bg-zinc-900/90 backdrop-blur-md shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Table Column Headers */}
        <div className="grid grid-cols-4 gap-4 p-4 border-b-2 border-zinc-800 bg-black/80 text-[10px] sm:text-xs font-black text-zinc-500 uppercase tracking-widest">
          <div className="col-span-1 text-center">Rank</div>
          <div className="col-span-1 text-left">Lifter</div>
          <div className="col-span-1 text-center">Streak</div>
          <div className="col-span-1 text-right">Title</div>
        </div>

        {/* Map through the mock lifters */}
        {MOCK_LEADERBOARD.map((user, index) => {
          const rankDetails = getRank(user.streak);
          
          return (
            <div 
              key={index} 
              className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors items-center group"
            >
              {/* Position Number */}
              <div className="col-span-1 text-center font-black text-xl sm:text-2xl text-zinc-700 group-hover:text-zinc-400 transition-colors">
                #{index + 1}
              </div>
              
              {/* Wallet Address */}
              <div className="col-span-1 text-left font-mono text-xs sm:text-sm text-zinc-300">
                {user.wallet}
              </div>
              
              {/* Streak Count */}
              <div className="col-span-1 text-center font-mono text-lg sm:text-xl font-bold text-white">
                {user.streak} <span className="text-[10px] sm:text-xs text-zinc-600 font-sans uppercase hidden sm:inline-block ml-1">Days</span>
              </div>
              
              {/* Dynamic Heavy Metal Title */}
              <div className={`col-span-1 text-right font-black uppercase text-[10px] sm:text-xs md:text-sm tracking-wider ${rankDetails.color}`}>
                {rankDetails.title}
              </div>
            </div>
          );
        })}
        
      </div>
    </div>
  );
}