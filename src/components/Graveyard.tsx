import  { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

// 🚨 Replace this with your actual Devnet RPC and ForgeFi Program ID
const RPC_URL = "https://api.devnet.solana.com"; 
const PROGRAM_ID = new PublicKey("AyN3aAx2VJTSxJGaR5n9Ayhpa6inCAxaSGupxbGw1Rnz"); 

// The initial Mirage Data
const INITIAL_LIQUIDATIONS = [
  "TX: 8xF9...2A 🩸 1.5 SOL LIQUIDATED (MISSED LEG DAY)",
  "TX: 3bA1...9C 🩸 0.5 SOL LIQUIDATED (MISSED PUSH DAY)",
  "TX: 9xZ4...11 🩸 2.0 SOL LIQUIDATED (MISSED PULL DAY)",
  "TX: 1cA8...7F 🩸 0.2 SOL LIQUIDATED (MISSED FULL BODY)",
  "TX: 5vB2...0D 🩸 1.0 SOL LIQUIDATED (MISSED LEG DAY)",
];

export default function Graveyard() {
  const [liquidations, setLiquidations] = useState(INITIAL_LIQUIDATIONS);

  useEffect(() => {
    // 1. Set up the radar to listen to the Devnet
    const connection = new Connection(RPC_URL, "confirmed");
    console.log("💀 Marquee Radar Online: Listening for blood...");

    // 2. Listen for logs coming from your specific smart contract
    const subscriptionId = connection.onLogs(
      PROGRAM_ID,
      (logsInfo) => {
        // Look for the exact instruction name your Rust contract emits
        const isSlashEvent = logsInfo.logs.some(log => log.includes("Instruction: SlashMissedDay"));

        if (isSlashEvent) {
          const shortSignature = logsInfo.signature.slice(0, 4) + "..." + logsInfo.signature.slice(-2);
          
          // Format the new real liquidation string
          const newRealSlash = `TX: ${shortSignature} 🩸 0.10 SOL LIQUIDATED (LIVE EXECUTION)`;

          // Inject it at the front of the array and keep the list at a max of 8 items
          setLiquidations(prev => [newRealSlash, ...prev].slice(0, 8));
        }
      },
      "confirmed"
    );

    // Cleanup when component closes
    return () => { connection.removeOnLogsListener(subscriptionId); };
  }, []);

  return (
    <div className="w-full bg-red-950/20 border-y border-red-900/50 py-3 overflow-hidden flex whitespace-nowrap relative">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>
      
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10"></div>

      <div className="animate-marquee flex gap-12 text-red-500/80 font-mono text-sm tracking-widest uppercase font-black">
        {[...liquidations, ...liquidations].map((tx, idx) => (
          <span 
            key={idx} 
            className={`drop-shadow-[0_0_8px_rgba(220,38,38,0.5)] ${tx.includes("LIVE EXECUTION") ? "text-red-400 animate-pulse" : ""}`}
          >
            {tx}
          </span>
        ))}
      </div>
    </div>
  );
}