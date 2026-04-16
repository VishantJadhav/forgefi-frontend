import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Toaster } from 'react-hot-toast';

// Components
import Footer from './Footer';
import LoneWolfDashboard from './LoneWolfDashboard';
import BloodPactDashboard from './BloodPactDashboard';

export default function ForgeDashboard() {
  const { publicKey, connected } = useWallet();
  
  const [activeTab, setActiveTab] = useState<'LONE_WOLF' | 'BLOOD_PACT'>('LONE_WOLF');
  const [showDecoy, setShowDecoy] = useState(true);

  // SCROLL LISTENER (The Vanishing Act)
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setShowDecoy(false);
      } else {
        setShowDecoy(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* THE ARMOR: Global Toast Container */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '0px',
            background: '#000', 
            color: '#fff',
            border: '1px solid #27272a', 
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            fontWeight: '900',
            letterSpacing: '0.1em',
            fontSize: '12px'
          },
          success: {
            iconTheme: { primary: '#16a34a', secondary: '#000' },
            style: { border: '1px solid #14532d' } 
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#000' },
            style: { border: '1px solid #7f1d1d' } 
          },
        }}
      />

      {/* DECOY BUTTON */}
      <button
        onClick={(e) => {
          e.preventDefault();
          const target = document.getElementById("staking-forge-section");
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        className={`fixed top-6 right-6 z-[99999] flex items-center justify-center 
                   bg-transparent backdrop-blur-sm border border-red-800 
                   text-red-500 font-bold tracking-[0.2em] uppercase text-[10px] sm:text-xs
                   px-4 py-3 sm:px-6 transition-all duration-500 ease-in-out cursor-pointer
                   hover:bg-red-900 hover:text-white hover:border-red-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]
                   ${showDecoy ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
      >
        Connect Wallet
      </button>

      {/* FULL PAGE WRAPPER FOR BACKGROUND */}
      <div className="relative w-full min-h-screen bg-black overflow-hidden flex flex-col">
        
        {/* THE VIDEO BACKGROUND */}
        <video autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-40">
          <source src="/gym-bg.mp4" type="video/mp4" />
        </video>

        {/* THE MAIN INTERFACE */}
        <div id="staking-forge-section" className="w-full flex-grow flex justify-center items-start relative z-10 pt-28 md:pt-12 pb-24 px-4">
          {!connected ? (
            <div className="w-full max-w-md animate-fade-in mx-auto flex justify-center mt-10 z-[100]">
              <WalletMultiButton className="!bg-red-600 hover:!bg-red-700 transition-colors rounded-none font-black uppercase tracking-widest px-8 py-6 w-full !justify-center items-center text-lg shadow-[0_0_30px_rgba(220,38,38,0.2)]" />
            </div>
          ) : (
            <div className="w-full max-w-md flex flex-col gap-6 animate-fade-in mt-10">
              
              {/* Global Wallet Info Card */}
              <div className="flex flex-col items-center border-2 border-zinc-900 bg-black/60 backdrop-blur-sm p-6 shadow-xl relative z-[100]">
                <h2 className="text-sm font-black mb-3 uppercase text-zinc-400 tracking-widest">Active Lifter</h2>
                <p className="text-green-500 mb-6 font-mono bg-transparent px-4 py-2 text-sm border border-green-900/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                  {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
                </p>
                <WalletMultiButton className="!bg-zinc-900/50 hover:!bg-zinc-800 transition-colors rounded-none font-bold uppercase text-xs w-full !justify-center items-center border border-zinc-800" />
              </div>

              {/* THE MODE TOGGLE */}
              <div className="flex bg-black/60 p-1 border border-zinc-800 shadow-xl backdrop-blur-md relative z-50">
                <button 
                  onClick={() => setActiveTab('LONE_WOLF')}
                  className={`flex-1 py-3 text-xs font-black tracking-widest uppercase transition-all ${
                    activeTab === 'LONE_WOLF' 
                    ? 'bg-zinc-800 text-white shadow-[0_0_15px_rgba(0,0,0,0.5)]' 
                    : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Lone Wolf
                </button>
                <button 
                  onClick={() => setActiveTab('BLOOD_PACT')}
                  className={`flex-1 py-3 text-xs font-black tracking-widest uppercase transition-all ${
                    activeTab === 'BLOOD_PACT' 
                    ? 'bg-red-900/40 text-red-500 border border-red-900/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]' 
                    : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Blood Pact (Squad)
                </button>
              </div>

              {/* DYNAMIC DASHBOARD RENDERING */}
              <div className="w-full transition-all duration-300">
                {activeTab === 'LONE_WOLF' ? <LoneWolfDashboard /> : <BloodPactDashboard />}
              </div>

            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}