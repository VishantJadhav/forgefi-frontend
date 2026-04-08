import { useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "../idl/idl.json"; // 🚨 Ensure this path points to your actual IDL file!

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

// 🚨 CRITICAL: Replace with your actual deployed Program ID
const PROGRAM_ID = new PublicKey("AyN3aAx2VJTSxJGaR5n9Ayhpa6inCAxaSGupxbGw1Rnz"); 

export default function Leaderboard() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  
  // State to hold the live blockchain data
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to make Public Keys look clean (e.g., 7x9A...3fB2)
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // If no wallet is connected, we can't initialize the Anchor Provider easily in this setup
      if (!wallet) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const provider = new AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
        const program = new Program(idl as any, PROGRAM_ID, provider);

        // 1. Put the shield up to ignore 50-byte ghost accounts
        const allVaults = await program.account.userStake.all([
          { dataSize: 60 }
        ]);

        // 2. Sort by the highest streak (daysCompleted)
        const sortedVaults = allVaults.sort((a: any, b: any) => {
          return b.account.daysCompleted - a.account.daysCompleted;
        });

        // 3. Take the Top 10 Alphas
        setLeaders(sortedVaults.slice(0, 10));
      } catch (error) {
        console.error("❌ Failed to load the Iron Matrix:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [wallet, connection]);

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

        {/* Loading / Empty States */}
        {!wallet && !loading && (
          <div className="p-8 text-center text-zinc-500 font-bold uppercase tracking-widest">
            Connect Wallet to Scan the Matrix
          </div>
        )}

        {wallet && loading && (
          <div className="p-8 text-center text-red-500 font-bold uppercase animate-pulse tracking-widest">
            Scanning Blockchain...
          </div>
        )}

        {wallet && !loading && leaders.length === 0 && (
          <div className="p-8 text-center text-zinc-500 font-bold uppercase tracking-widest">
            The Hall is Empty. Claim the first stake.
          </div>
        )}

        {/* Live Data Mapping */}
        {wallet && !loading && leaders.map((vault, index) => {
          const streak = vault.account.daysCompleted;
          const rankDetails = getRank(streak);
          const walletPubkey = vault.account.user.toBase58();
          
          return (
            <div 
              key={walletPubkey} 
              className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors items-center group"
            >
              {/* Position Number */}
              <div className="col-span-1 text-center font-black text-xl sm:text-2xl text-zinc-700 group-hover:text-zinc-400 transition-colors">
                #{index + 1}
              </div>
              
              {/* Wallet Address */}
              <div className="col-span-1 text-left font-mono text-xs sm:text-sm text-zinc-300">
                {shortenAddress(walletPubkey)}
              </div>
              
              {/* Streak Count */}
              <div className="col-span-1 text-center font-mono text-lg sm:text-xl font-bold text-white">
                {streak} <span className="text-[10px] sm:text-xs text-zinc-600 font-sans uppercase hidden sm:inline-block ml-1">Days</span>
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