import toast from 'react-hot-toast';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  // Trigger for features you haven't built yet
  const handleComingSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    toast("Leaderboard syncing... Coming in v2.", { icon: '🚧' });
  };

  return (
    <footer className="w-full bg-transparent border-t-2 border-zinc-900 py-16 relative z-10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center md:items-start gap-12">
        
        {/* BRAND & DISCLAIMER */}
        <div className="flex flex-col items-center md:items-start max-w-md text-center md:text-left">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest leading-relaxed">
            <span className="text-red-600 font-black tracking-[0.2em]">⚠️ WARNING:</span> The ForgeFi protocol interacts directly with immutable smart contracts. Staked SOL <strong>will be slashed</strong> if physical location constraints are not met. The protocol is brutal by design. Use at your own risk.
          </p>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="flex gap-12 font-mono uppercase tracking-[0.1em] text-xs">
          <div className="flex flex-col gap-4 items-center md:items-start">
            <span className="text-zinc-300 font-black mb-2 border-b border-red-900 pb-1">Protocol</span>
            {/* PASTE YOUR GITHUB README OR NOTION LINK HERE */}
            <a href="https://github.com/VishantJadhav/forgefi-frontend/blob/main/README.md" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-red-500 hover:translate-x-1 transition-all">Docs / Rules</a>
            
            {/* PASTE YOUR SOLANA EXPLORER LINK HERE */}
            <a href="https://explorer.solana.com/address/AyN3aAx2VJTSxJGaR5n9Ayhpa6inCAxaSGupxbGw1Rnz?cluster=devnet" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-red-500 hover:translate-x-1 transition-all">Smart Contract</a>
            
            {/* COMING SOON BUTTON */}
            <a href="#" onClick={handleComingSoon} className="text-zinc-500 hover:text-red-500 hover:translate-x-1 transition-all">Leaderboard</a>
          </div>
          
          <div className="flex flex-col gap-4 items-center md:items-start">
            <span className="text-zinc-300 font-black mb-2 border-b border-red-900 pb-1">Builder</span >
            {/* PASTE YOUR PERSONAL LINKS HERE */}
            <a href="https://x.com/VishantJadhav7" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-red-500 hover:translate-x-1 transition-all">X</a>
            <a href="https://github.com/VishantJadhav/forgefi-frontend" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-red-500 hover:translate-x-1 transition-all">GitHub </a>
            {/* <a href="#" className="text-zinc-500 hover:text-red-500 hover:translate-x-1 transition-all">Discord: yourname#1234</a> */}
          </div>
        </div>
      </div>

      {/* BOTTOM COPYRIGHT ROW */}
      <div className="mt-16 pt-6 border-t border-zinc-900/50 flex justify-center">
         <span className="text-xs font-mono text-zinc-600 uppercase tracking-[0.3em]">
           © {currentYear} ForgeFi. The Iron Never Lies.
         </span>
      </div>
    </footer>
  );
}