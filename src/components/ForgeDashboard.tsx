import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import toast, { Toaster } from 'react-hot-toast';
import DeadlineTimer from './DeadlineTimer';
import IronMatrix from './IronMatrix';

// The IDL Blueprint
import idl from '../idl/idl.json';

// ==========================================
// ENVIRONMENT TOGGLE
// ==========================================
// Set to true while testing on Desktop so IP bounces don't block transactions.
// Set to false for Production (enforces strict 100m gym radius).
const DEV_MODE_RADIUS = true; 
const ALLOWED_DISTANCE_METERS = DEV_MODE_RADIUS ? 10000000 : 100;

// --- THE MATH: Haversine Formula for GPS Distance (in meters) ---
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const toRadians = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function ForgeDashboard() {
  // 1. Solana Wallet & Connection Hooks
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected, signTransaction } = wallet;
  
  // 2. Form & UI State
  const [days, setDays] = useState(6);
  const [stakeAmount, setStakeAmount] = useState(0.5);
  const [isStaking, setIsStaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // 3. Application State (The Scanner & Oracle)
  const [isChecking, setIsChecking] = useState(false);
  const [activeStake, setActiveStake] = useState<any>(null);
  const [gymLocation, setGymLocation] = useState<{lat: number, lng: number} | null>(null);

  // 4. Scroll State (For the vanishing Decoy Button)
  const [showDecoy, setShowDecoy] = useState(true);

  // ==========================================
  // SCROLL LISTENER (The Vanishing Act)
  // ==========================================
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

  // ==========================================
  // MULTI-WALLET IDENTITY STORAGE
  // ==========================================
  useEffect(() => {
    if (publicKey) {
      const storageKey = `forgefi_gym_${publicKey.toBase58()}`;
      const savedGym = localStorage.getItem(storageKey);
      
      if (savedGym) {
        setGymLocation(JSON.parse(savedGym));
      } else {
        setGymLocation(null); 
      }
    } else {
      setGymLocation(null);
    }
  }, [publicKey]);

  // ==========================================
  // THE BLOCKCHAIN SCANNER (READ)
  // ==========================================
  const fetchStakeData = async () => {
    if (!publicKey || !connected) {
      setActiveStake(null);
      return;
    }

    try {
      setIsChecking(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const PROGRAM_ID = new web3.PublicKey("AyN3aAx2VJTSxJGaR5n9Ayhpa6inCAxaSGupxbGw1Rnz");
      const program = new Program(idl as any, PROGRAM_ID, provider);

      const [userStakePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const accountData = await program.account.userStake.fetchNullable(userStakePDA);

      if (accountData) {
        setActiveStake(accountData); 
      } else {
        setActiveStake(null); 
      }
    } catch (error) {
      console.error("Error scanning for vault:", error);
      setActiveStake(null);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchStakeData();
  }, [publicKey, connection, connected]); 

  // ==========================================
  // THE ORACLE: GEOLOCATION CALIBRATION
  // ==========================================
  const calibrateGymLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setGymLocation(coords);
        
        if (publicKey) {
          const storageKey = `forgefi_gym_${publicKey.toBase58()}`;
          localStorage.setItem(storageKey, JSON.stringify(coords));
        }
        
        toast.success(`Gym location locked! Active Radius: ${ALLOWED_DISTANCE_METERS}m.`);
      },
      (error) => {
        console.error(error);
        toast.error("Failed to get location. Allow permissions in settings.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 } 
    );
  };

  // ==========================================
  // THE SMART CONTRACT ENGINE (WRITE: STAKE)
  // ==========================================
  const handleStake = async () => {
    if (!publicKey || !signTransaction) return;

    try {
      setIsStaking(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const PROGRAM_ID = new web3.PublicKey("AyN3aAx2VJTSxJGaR5n9Ayhpa6inCAxaSGupxbGw1Rnz");
      const program = new Program(idl as any, PROGRAM_ID, provider);

      const lamports = new BN(Math.floor(stakeAmount * web3.LAMPORTS_PER_SOL));
      const daysU8 = days; 

      const [userStakePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const tx = await program.methods
        .initializeRoutine(lamports, daysU8)
        .accounts({
          user: publicKey,
          userStake: userStakePDA, 
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      // Log TX for debugging to clear TypeScript warning
      console.log(`Stake successful. Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

      toast.success("Stake locked in the vault! Protocol Active.");
      await fetchStakeData(); 

    } catch (error) {
      console.error("Failed to lock stake:", error);
      toast.error("Transaction failed or rejected by lifter.");
    } finally {
      setIsStaking(false);
    }
  };

  // ==========================================
  // THE SMART CONTRACT ENGINE (WRITE: VERIFY)
  // ==========================================
  const handleVerify = async () => {
    if (!publicKey || !signTransaction) return;
    if (!gymLocation) {
      toast.error("Please calibrate your gym location first!");
      return;
    }

    // 🛡️ THE PRE-FLIGHT COOLDOWN CHECK
    if (activeStake) {
      const lastCheckIn = activeStake.lastCheckIn.toNumber();
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const timeSinceLastWorkout = currentTimestamp - lastCheckIn;
      const SECONDS_IN_A_DAY = 86400; // 24 hours

      if (timeSinceLastWorkout < SECONDS_IN_A_DAY) {
        const hoursLeft = Math.ceil((SECONDS_IN_A_DAY - timeSinceLastWorkout) / 3600);
        toast.error(`RECOVERY PERIOD: You already forged today. Iron cools in ${hoursLeft} hours.`);
        return; 
      }
    }

    setIsVerifying(true);

    // 1. THE ORACLE CHECK (Off-Chain Verification)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        
        const distance = getDistanceInMeters(gymLocation.lat, gymLocation.lng, currentLat, currentLng);
        console.log(`User is ${Math.round(distance)} meters away from the gym.`);

        if (distance > ALLOWED_DISTANCE_METERS) {
          toast.error(`ORACLE REJECTED: You are ${Math.round(distance)} meters away from the gym. Get to the iron.`);
          setIsVerifying(false);
          return;
        }

        // 2. THE BLOCKCHAIN TRANSACTION (On-Chain Execution)
        try {
          const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
          const PROGRAM_ID = new web3.PublicKey("AyN3aAx2VJTSxJGaR5n9Ayhpa6inCAxaSGupxbGw1Rnz");
          const program = new Program(idl as any, PROGRAM_ID, provider);

          const [userStakePDA] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("stake"), publicKey.toBuffer()],
            PROGRAM_ID
          );

          console.log("Oracle passed. Requesting signature...");

          const tx = await program.methods
            .verifyWorkout()
            .accounts({
              user: publicKey,
              userStake: userStakePDA, 
            } as any)
            .rpc();

          // Log TX for debugging to clear TypeScript warning
          console.log(`Verify successful. Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

          toast.success("Workout verified on-chain! Streak updated.");
          await fetchStakeData(); 

        } catch (error) {
          console.error("Failed to verify workout:", error);
          toast.error("Verification failed or rejected by lifter.");
        } finally {
          setIsVerifying(false);
        }
      },
      (error) => {
        setIsVerifying(false);
        let errorMessage = "";
        
        switch(error.code) {
          case 1: 
            errorMessage = "LOCATION BLOCKED: Turn on GPS permissions and try again.";
            break;
          case 2: 
            errorMessage = "SIGNAL LOST: Turn off VPN or walk near a window.";
            break;
          case 3: 
            errorMessage = "TIMEOUT: GPS signal too weak. Connect to Wi-Fi.";
            break;
          default:
            errorMessage = "ORACLE FAILURE: Unknown GPS error.";
            break;
        }
        
        toast.error(errorMessage);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  };

  return (
    <>
    {/* THE ARMOR: Global Toast Container */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: '0px',
            background: '#09090b', // zinc-950
            color: '#fff',
            border: '1px solid #27272a', // zinc-800
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            fontWeight: '900',
            letterSpacing: '0.1em',
            fontSize: '12px'
          },
          success: {
            iconTheme: { primary: '#16a34a', secondary: '#000' },
            style: { border: '1px solid #14532d' } // green-900
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#000' },
            style: { border: '1px solid #7f1d1d' } // red-900
          },
        }}
      />
      
      {/* THE DECOY SCROLL BUTTON */}
      <button
        onClick={(e) => {
          e.preventDefault();
          const target = document.getElementById("staking-forge-section");
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }}
        className={`fixed top-6 right-6 z-50 flex items-center justify-center 
                   bg-black/80 backdrop-blur-sm border border-red-800 
                   text-red-500 font-bold tracking-[0.2em] uppercase 
                   px-6 py-3 transition-all duration-500 ease-in-out cursor-pointer
                   hover:bg-red-900 hover:text-white hover:border-red-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)]
                   ${showDecoy ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
      >
        Connect Wallet
      </button>

      {/* THE MAIN INTERFACE - The Anchor Target */}
      <div id="staking-forge-section" className="w-full flex justify-center relative z-10 pt-16 pb-24">
        {!connected ? (
          <div className="w-full max-w-md animate-fade-in mx-auto flex justify-center">
            <WalletMultiButton className="!bg-red-600 hover:!bg-red-700 transition-colors rounded-none font-black uppercase tracking-widest px-8 py-6 w-full !justify-center items-center text-lg shadow-[0_0_30px_rgba(220,38,38,0.2)]" />
          </div>
        ) : (
          <div className="w-full max-w-md flex flex-col gap-6 animate-fade-in">
            
            {/* Wallet Info Card */}
            <div className="flex flex-col items-center border-2 border-zinc-800 bg-zinc-900/80 p-6 backdrop-blur-md shadow-xl relative z-50">
              <h2 className="text-sm font-black mb-3 uppercase text-zinc-400 tracking-widest">Active Lifter</h2>
              <p className="text-green-500 mb-6 font-mono bg-black px-4 py-2 text-sm border border-green-900/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
              </p>
              <WalletMultiButton className="!bg-zinc-800 hover:!bg-zinc-700 transition-colors rounded-none font-bold uppercase text-xs w-full !justify-center items-center border border-zinc-700" />
            </div>

            {/* DYNAMIC UI RENDERING */}
            {isChecking ? (
              <div className="border-2 border-zinc-800 bg-zinc-900/90 p-12 text-center text-zinc-500 font-mono uppercase tracking-widest animate-pulse shadow-2xl">
                Scanning Blockchain...
              </div>
            ) : activeStake ? (
              <div className="border-2 border-red-900 bg-black p-8 shadow-[0_0_30px_rgba(220,38,38,0.15)] flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
                
                <div className="flex justify-between items-center border-b-2 border-zinc-800 pb-4 relative z-10">
                  <h2 className="text-2xl font-black uppercase text-white tracking-tight">Active Protocol</h2>
                  <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 tracking-widest animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]">Live</span>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Locked Vault</span>
                    <span className="text-2xl font-black text-red-500 font-mono drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                      {(
                        (activeStake.stakeAmount.toNumber() / web3.LAMPORTS_PER_SOL) - 
                        ((activeStake.stakeAmount.toNumber() / web3.LAMPORTS_PER_SOL) * 0.1 * (activeStake.missedDays || 0))
                      ).toFixed(2)} SOL
                    </span>
                    {activeStake.missedDays > 0 && (
                      <span className="text-[10px] text-red-600 font-black tracking-widest uppercase mt-1 animate-pulse">
                        Bleeding (-{activeStake.missedDays * 10}%)
                      </span>
                    )}
                  </div>
                  <div className="border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col items-center justify-center">
                    <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Commitment</span>
                    <span className="text-2xl font-black text-white font-mono">
                      {activeStake.daysCommitted} Days
                    </span>
                  </div>
                </div>

                {/* THE GUILLOTINE TIMER */}
                <div className="mt-2 relative z-10">
                   <DeadlineTimer />
                </div>

                {/* THE IRON MATRIX (STREAK TRACKER) */}
                <div className="mt-2 relative z-10">
                  <IronMatrix 
                    daysCommitted={activeStake.daysCommitted} 
                    daysCompleted={activeStake.daysCompleted} 
                    missedDays={activeStake.missedDays || 0} 
                    userKey={publicKey?.toBase58()}
                  />
                </div>

                {/* THE GEOLOCATION ORACLE CONTROLS */}
                <div className="flex flex-col gap-2 mt-4 relative z-10">
                  {!gymLocation ? (
                    <button 
                      onClick={calibrateGymLocation}
                      className="w-full bg-blue-600/20 text-blue-400 border border-blue-900/50 font-black uppercase tracking-widest p-3 text-xs hover:bg-blue-600/30 transition-colors"
                    >
                      Set Current Location as Gym
                    </button>
                  ) : (
                    <div className="flex justify-between items-center bg-zinc-900 border border-green-900/50 p-2 px-4 mb-2">
                      <span className="text-[10px] text-green-500 font-mono tracking-widest uppercase flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        Gym Locked
                      </span>
                      <button 
                        onClick={calibrateGymLocation}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer uppercase tracking-widest underline decoration-zinc-700 underline-offset-4"
                      >
                        Recalibrate
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={handleVerify}
                    disabled={isVerifying || !gymLocation}
                    className={`w-full font-black uppercase tracking-widest p-5 transition-all border ${
                      isVerifying || !gymLocation
                        ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed' 
                        : 'bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-600 hover:border-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.98]'
                    }`}
                  >
                    {isVerifying ? 'Checking Location...' : 'Verify Workout'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-zinc-800 bg-zinc-900/90 backdrop-blur-md p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
                
                <h2 className="text-3xl font-black uppercase text-white border-b-2 border-zinc-800 pb-4 tracking-tight relative z-10">
                  Lock Your Stake
                </h2>
                
                <div className="flex flex-col gap-3 relative z-10 mb-2">
                  <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                    Select Protocol
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => setDays(6)} className={`border-2 p-3 flex flex-col items-center justify-center transition-all ${days === 6 ? 'border-red-600 bg-red-600/10 text-red-500' : 'border-zinc-800 bg-black text-zinc-500'}`}>
                      <span className="font-black text-lg">PPL</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest mt-1">6 Days</span>
                    </button>
                    <button onClick={() => setDays(4)} className={`border-2 p-3 flex flex-col items-center justify-center transition-all ${days === 4 ? 'border-red-600 bg-red-600/10 text-red-500' : 'border-zinc-800 bg-black text-zinc-500'}`}>
                      <span className="font-black text-lg">U/L</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest mt-1">4 Days</span>
                    </button>
                    <button onClick={() => setDays(3)} className={`border-2 p-3 flex flex-col items-center justify-center transition-all ${days === 3 ? 'border-red-600 bg-red-600/10 text-red-500' : 'border-zinc-800 bg-black text-zinc-500'}`}>
                      <span className="font-black text-lg">FB</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest mt-1">3 Days</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                  <label className="text-xs font-black text-red-600 uppercase tracking-widest">Custom Commitment (Days)</label>
                  <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-black border-2 border-zinc-800 text-white p-4 font-mono text-xl focus:outline-none focus:border-red-600 transition-colors w-full" min="1" max="30" />
                </div>

                <div className="flex flex-col gap-2 relative z-10">
                  <label className="text-xs font-black text-red-600 uppercase tracking-widest">Stake Amount (SOL)</label>
                  <div className="relative">
                    <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} className="bg-black border-2 border-zinc-800 text-white p-4 font-mono text-xl focus:outline-none focus:border-red-600 transition-colors w-full pl-16" step="0.1" min="0.1" />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-500 font-mono">SOL</span>
                  </div>
                </div>

                <button onClick={handleStake} disabled={isStaking} className={`w-full text-white font-black uppercase tracking-widest p-5 mt-4 transition-all relative z-10 ${isStaking ? 'bg-zinc-600' : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-[0.98]'}`}>
                  {isStaking ? 'Awaiting Signature...' : 'Sign & Lock Contract'}
                </button>
              </div>
            )}

          </div>
        )}
      </div>
    </>
  );
}