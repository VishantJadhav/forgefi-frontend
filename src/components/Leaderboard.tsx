import { useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import idl from "../idl/idl.json";

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

const PROGRAM_ID = new PublicKey("AyN3aAx2VJTSxJGaR5n9Ayhpa6inCAxaSGupxbGw1Rnz"); 

// 🚨 Define a standard type so both Solo and Squad vaults look the same to the UI
interface LeaderboardEntry {
  id: string;
  displayAddress: string;
  streak: number;
  type: 'SOLO' | 'SQUAD';
}

export default function Leaderboard() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!wallet) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const provider = new AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
        const program = new Program(idl as any, PROGRAM_ID, provider);

        // 1. Fetch Lone Wolf V3 Vaults (64 bytes)
        const loneWolves = await program.account.userStake.all([
          { dataSize: 64 } 
        ]);

        // 2. Fetch Squad V3 Vaults (219 bytes)
        const squads = await program.account.squadVaultV2.all([
          { dataSize: 209 }
        ]);

        // 3. Standardize Lone Wolf Data
        const formattedWolves: LeaderboardEntry[] = loneWolves.map((v: any) => ({
          id: v.publicKey.toBase58(),
          displayAddress: v.account.user.toBase58(),
          streak: v.account.daysCompleted,
          type: 'SOLO'
        }));

        // 4. Standardize Squad Data (Displaying Player 1 as the representative)
        const formattedSquads: LeaderboardEntry[] = squads.map((v: any) => ({
          id: v.publicKey.toBase58(),
          displayAddress: v.account.playerOne.toBase58(),
          streak: v.account.daysCompleted,
          type: 'SQUAD'
        }));

        // 5. Combine, Sort by highest streak, and grab the Top 10 Alphas
        const combined = [...formattedWolves, ...formattedSquads];
        const sortedVaults = combined.sort((a, b) => b.streak - a.streak);
        
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
          <div className="col-span-1 text-left">Lifter / Squad</div>
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
        {wallet && !loading && leaders.map((leader, index) => {
          const rankDetails = getRank(leader.streak);
          
          return (
            <div 
              key={leader.id} 
              className="grid grid-cols-4 gap-4 p-4 border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors items-center group"
            >
              {/* Position Number */}
              <div className="col-span-1 text-center font-black text-xl sm:text-2xl text-zinc-700 group-hover:text-zinc-400 transition-colors">
                #{index + 1}
              </div>
              
              {/* Wallet Address & Type Badge */}
              <div className="col-span-1 text-left flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-mono text-xs sm:text-sm text-zinc-300">
                  {shortenAddress(leader.displayAddress)}
                </span>
                <span className={`text-[8px] sm:text-[10px] px-1 py-0.5 rounded uppercase font-bold tracking-widest w-fit ${leader.type === 'SQUAD' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                  {leader.type}
                </span>
              </div>
              
              {/* Streak Count */}
              <div className="col-span-1 text-center font-mono text-lg sm:text-xl font-bold text-white">
                {leader.streak} <span className="text-[10px] sm:text-xs text-zinc-600 font-sans uppercase hidden sm:inline-block ml-1">Days</span>
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