export default function Graveyard() {
  // Simulated on-chain liquidation data
  const liquidations = [
    "TX: 8xF9...2A 🩸 1.5 SOL LIQUIDATED (MISSED LEG DAY)",
    "TX: 3bA1...9C 🩸 0.5 SOL LIQUIDATED (MISSED PUSH DAY)",
    "TX: 9xZ4...11 🩸 2.0 SOL LIQUIDATED (MISSED PULL DAY)",
    "TX: 1cA8...7F 🩸 0.2 SOL LIQUIDATED (MISSED FULL BODY)",
    "TX: 5vB2...0D 🩸 1.0 SOL LIQUIDATED (MISSED LEG DAY)",
  ];

  return (
    <div className="w-full bg-red-950/20 border-y border-red-900/50 py-3 overflow-hidden flex whitespace-nowrap relative">
      {/* Injecting CSS keyframes directly for the marquee effect */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>
      
      {/* Absolute overlays for fade-in/out on edges */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-zinc-950 to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-zinc-950 to-transparent z-10"></div>

      <div className="animate-marquee flex gap-12 text-red-500/80 font-mono text-sm tracking-widest uppercase font-black">
        {/* Render twice for the seamless loop */}
        {[...liquidations, ...liquidations].map((tx, idx) => (
          <span key={idx} className="drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">
            {tx}
          </span>
        ))}
      </div>
    </div>
  );
}