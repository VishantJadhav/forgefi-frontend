import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import toast from 'react-hot-toast';

// Components & IDL
import DeadlineTimer from './DeadlineTimer';
import IronMatrix from './IronMatrix';
import idl from '../idl/idl.json';

// Custom Hooks
import { useGeolocation, ALLOWED_DISTANCE_METERS, getDistanceInMeters } from '../hooks/useGeolocation';
import { useVaultState, PROGRAM_ID } from '../hooks/useVaultState';

export default function LoneWolfDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  
  const { gymLocation, calibrateGymLocation } = useGeolocation(publicKey?.toBase58());
  const { activeStake, isChecking, fetchStakeData } = useVaultState();

  const [days, setDays] = useState(6);
  const [stakeAmount, setStakeAmount] = useState(0.5);
  const [isStaking, setIsStaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // ==========================================
  // 1. FORGE THE PACT (STAKE)
  // ==========================================
  const handleStake = async () => {
    if (!connected || !publicKey) {
      toast.error("Wallet disconnected. Please reconnect.");
      return;
    }

    try {
      setIsStaking(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      const [stakePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const lamports = new BN(Math.floor(stakeAmount * web3.LAMPORTS_PER_SOL));
      const daysU16 = days;

      await program.methods
        .initializeRoutine(lamports, daysU16)
        .accounts({
          user: publicKey,
          userStake: stakePDA,
          systemProgram: web3.SystemProgram.programId,
        } as any)
        .rpc();

      toast.success("Blood locked! The Forge awaits.");
      fetchStakeData(); 
    } catch (error) {
      console.error("Staking failed:", error);
      toast.error("Transaction rejected.");
    } finally {
      setIsStaking(false);
    }
  };

  // ==========================================
  // 2. HONOR THE IRON (VERIFY WORKOUT)
  // ==========================================
  const handleVerify = async () => {
    if (!connected || !publicKey || !activeStake) return;
    if (!gymLocation) {
      toast.error("Please calibrate your gym location first!");
      return;
    }

    setIsVerifying(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const distance = getDistanceInMeters(
          gymLocation.lat, 
          gymLocation.lng, 
          position.coords.latitude, 
          position.coords.longitude
        );

        if (distance > ALLOWED_DISTANCE_METERS) {
          toast.error(`ORACLE REJECTED: You are ${Math.round(distance)} meters away from the gym.`);
          setIsVerifying(false);
          return;
        }

        try {
          const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
          const program = new Program(idl as any, PROGRAM_ID, provider);

          // 🚨 FIX: Derive the PDA mathematically instead of relying on state
          const [stakePDA] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("stake"), publicKey.toBuffer()],
            PROGRAM_ID
          );

          await program.methods
            .verifyWorkout()
            .accounts({
              user: publicKey,
              userStake: stakePDA,
            } as any)
            .rpc();

          toast.success("Workout verified on-chain! You survive another day.");
          fetchStakeData();
        } catch (error: any) {
          console.error("Verification failed:", error);
          const errString = error.toString();
          if (errString.includes("WorkoutTooSoon") || errString.includes("6000")) {
            toast.error("RECOVERY PERIOD: Iron cools in 10 seconds.");
          } else if (errString.includes("MissedDeadline") || errString.includes("6003")) {
            toast.error("GUILLOTINE: You missed your window.");
          } else if (errString.includes("ProtocolComplete")) {
             toast.error("Protocol is already finished!");
          } else {
            toast.error("Transaction failed.");
          }
        } finally {
          setIsVerifying(false);
        }
      },
      (error) => {
        setIsVerifying(false);
        console.error("GPS Error:", error); // <-- We are now 'reading' the error!
        toast.error("ORACLE FAILURE: GPS signal lost or blocked.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ==========================================
  // 3. BURN THE DEAD (ZOMBIE VAULT)
  // ==========================================
  const handleBurnZombie = async () => {
    if (!connected || !publicKey || !activeStake) return;

    try {
      setIsBurning(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      // 🚨 FIX: Derive the PDA
      const [stakePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      await program.methods
        .acknowledgeFailure()
        .accounts({
          user: publicKey,
          userStake: stakePDA,
        } as any)
        .rpc();

      toast.success("Zombie vault burned. The slate is wiped clean.");
      fetchStakeData(); 
    } catch (error) {
      console.error("Burn failed:", error);
      toast.error("Failed to acknowledge failure.");
    } finally {
      setIsBurning(false);
    }
  };

  // ==========================================
  // 4. CLAIM VICTORY (RESOLVE COMPLETED PROTOCOL)
  // ==========================================
  const handleResolve = async () => {
    if (!connected || !publicKey || !activeStake) return;

    try {
      setIsResolving(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      // 🚨 FIX: Derive the PDA
      const [stakePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      await program.methods
        .resolveStake()
        .accounts({
          user: publicKey,
          userStake: stakePDA,
        } as any)
        .rpc();

      toast.success("Protocol resolved! Remaining SOL has been returned.");
      fetchStakeData(); 
    } catch (error) {
      console.error("Resolution failed:", error);
      toast.error("Failed to claim remaining stake.");
    } finally {
      setIsResolving(false);
    }
  };

  // ==========================================
  // RENDER DYNAMIC UI FOR LONE WOLF
  // ==========================================
  if (isChecking) {
    return (
      <div className="border-2 border-zinc-900 bg-black/60 backdrop-blur-md p-12 text-center text-zinc-500 font-mono uppercase tracking-widest animate-pulse shadow-2xl relative z-10">
        Scanning Blockchain...
      </div>
    );
  }

  // 🛡️ THE SHIELD: Only calculate finished states if a stake exists 🛡️
  if (activeStake) {
    
    // --- 1. THE ZOMBIE STATE ---
    if (activeStake.missedDays === 999) {
      return (
        <div className="border-2 border-red-900 bg-red-950/40 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(220,38,38,0.3)] flex flex-col items-center text-center relative overflow-hidden z-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
          <div className="w-16 h-16 bg-red-900/40 rounded-full flex items-center justify-center mb-6 border border-red-600 relative z-10 animate-pulse">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest mb-4 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] relative z-10">
            You Abandoned <br/> The Iron
          </h2>
          <p className="text-red-200/70 mb-8 leading-relaxed font-mono text-xs uppercase tracking-wider relative z-10">
            Your vault was totally liquidated. Burn this dead vault and acknowledge your failure.
          </p>
          <button 
            onClick={handleBurnZombie}
            disabled={isBurning}
            className={`w-full font-black uppercase tracking-widest py-5 transition-all relative z-10 ${
              isBurning ? 'bg-red-900/50 text-red-500 border border-red-800 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-black shadow-[0_0_20px_rgba(220,38,38,0.4)] active:scale-[0.98]'
            }`}
          >
            {isBurning ? 'Burning Vault...' : 'Acknowledge Failure'}
          </button>
        </div>
      );
    }

    // --- 2. THE CONCLUSION STATE (Finished Protocol) ---
    const isFinished = activeStake.daysCompleted + activeStake.missedDays >= activeStake.daysCommitted;
    
    if (isFinished) {
      const remainingSol = (activeStake.stakeAmount / web3.LAMPORTS_PER_SOL) - 
                          ((activeStake.stakeAmount / web3.LAMPORTS_PER_SOL) * 0.1 * activeStake.missedDays);

      return (
        <div className="border-2 border-zinc-500 bg-zinc-900/80 backdrop-blur-md p-8 shadow-[0_0_40px_rgba(255,255,255,0.1)] flex flex-col items-center text-center relative overflow-hidden z-10">
          <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2 relative z-10">
            Protocol Concluded
          </h2>
          <p className="text-zinc-400 mb-6 leading-relaxed font-mono text-xs uppercase tracking-wider relative z-10">
            You completed {activeStake.daysCompleted} days and missed {activeStake.missedDays} days.<br/>
            The Executioner slashed {(activeStake.missedDays * 10)}% of your vault.
          </p>
          
          <div className="border border-zinc-700 bg-black/50 w-full p-4 mb-6">
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest block mb-1">Surviving SOL</span>
            <span className="text-3xl font-black text-green-500 font-mono">
              {Math.max(0, remainingSol).toFixed(2)} SOL
            </span>
          </div>

          <button 
            onClick={handleResolve}
            disabled={isResolving}
            className={`w-full font-black uppercase tracking-widest py-5 transition-all relative z-10 ${
              isResolving ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-[0.98]'
            }`}
          >
            {isResolving ? 'Withdrawing...' : 'Claim Surviving SOL & Burn Vault'}
          </button>
        </div>
      );
    }

    // --- 3. THE ACTIVE PROTOCOL STATE ---
    return (
      <div className="border-2 border-red-900 bg-black/60 backdrop-blur-md p-8 shadow-[0_0_30px_rgba(220,38,38,0.15)] flex flex-col gap-6 relative overflow-hidden z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
        
        <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-4 relative z-10">
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Active Protocol</h2>
          <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 tracking-widest animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]">Live</span>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="border border-zinc-900 bg-transparent p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Vault Pool</span>
            <span className="text-2xl font-black text-red-500 font-mono drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              {(
                (activeStake.stakeAmount / web3.LAMPORTS_PER_SOL) - 
                ((activeStake.stakeAmount / web3.LAMPORTS_PER_SOL) * 0.1 * activeStake.missedDays)
              ).toFixed(2)} SOL
            </span>
            {activeStake.missedDays > 0 && (
              <span className="text-[10px] text-red-600 font-black tracking-widest uppercase mt-1 animate-pulse">
                Bleeding (-{activeStake.missedDays * 10}%)
              </span>
            )}
          </div>
          <div className="border border-zinc-900 bg-transparent p-4 flex flex-col items-center justify-center">
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Commitment</span>
            <span className="text-2xl font-black text-white font-mono">
              {activeStake.daysCommitted} Days
            </span>
          </div>
        </div>

        <div className="relative z-10 -mt-2">
          <DeadlineTimer lastCheckIn={activeStake.lastCheckIn} daysCompleted={activeStake.daysCompleted} />
        </div>

        <div className="relative z-10 -mt-2">
          <IronMatrix 
            daysCommitted={activeStake.daysCommitted} 
            daysCompleted={activeStake.daysCompleted} 
            missedDays={activeStake.missedDays} 
            userKey={publicKey?.toBase58()} 
          />
        </div>

        <div className="flex flex-col gap-2 mt-2 relative z-10">
          {!gymLocation ? (
            <button onClick={calibrateGymLocation} className="w-full bg-blue-900/20 text-blue-400 border border-blue-900/50 font-black uppercase tracking-widest p-3 text-xs hover:bg-blue-900/40 transition-colors">
              Set Current Location as Gym
            </button>
          ) : (
            <div className="flex justify-between items-center bg-transparent border border-green-900/50 p-2 px-4 mb-2">
              <span className="text-[10px] text-green-500 font-mono tracking-widest uppercase flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Gym Locked
              </span>
              <button onClick={calibrateGymLocation} className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer uppercase tracking-widest underline decoration-zinc-700 underline-offset-4">
                Recalibrate
              </button>
            </div>
          )}
          <button 
            onClick={handleVerify}
            disabled={isVerifying || !gymLocation}
            className={`w-full font-black uppercase tracking-widest p-5 transition-all border ${
              isVerifying || !gymLocation ? 'bg-transparent text-zinc-600 border-zinc-800 cursor-not-allowed' : 'bg-zinc-900/80 text-white hover:bg-zinc-800 border-zinc-600 hover:border-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.98]'
            }`}
          >
            {isVerifying ? 'Checking Location...' : 'Verify Workout'}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER CREATE STAKE (No active stake)
  // ==========================================
  return (
    <div className="border-2 border-zinc-900 bg-black/60 backdrop-blur-md p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden z-10">
      <div className="flex flex-col gap-3 relative z-10">
        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Select Commitment</label>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setDays(6)} className={`border-2 p-3 flex flex-col items-center justify-center transition-all ${days === 6 ? 'border-red-600 bg-red-900/20 text-red-500' : 'border-zinc-800 bg-transparent text-zinc-500 hover:border-zinc-600'}`}>
            <span className="font-black text-lg">PPL</span>
            <span className="text-[10px] uppercase font-bold tracking-widest mt-1">6 Days</span>
          </button>
          <button onClick={() => setDays(4)} className={`border-2 p-3 flex flex-col items-center justify-center transition-all ${days === 4 ? 'border-red-600 bg-red-900/20 text-red-500' : 'border-zinc-800 bg-transparent text-zinc-500 hover:border-zinc-600'}`}>
            <span className="font-black text-lg">UPPER/LOWER</span>
            <span className="text-[10px] uppercase font-bold tracking-widest mt-1">4 Days</span>
          </button>
          <button onClick={() => setDays(3)} className={`border-2 p-3 flex flex-col items-center justify-center transition-all ${days === 3 ? 'border-red-600 bg-red-900/20 text-red-500' : 'border-zinc-800 bg-transparent text-zinc-500 hover:border-zinc-600'}`}>
            <span className="font-black text-lg">FULL BODY</span>
            <span className="text-[10px] uppercase font-bold tracking-widest mt-1">3 Days</span>
          </button>
          <div className={`border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden ${![3, 4, 6].includes(days) ? 'border-red-600 bg-red-900/20' : 'border-zinc-800 bg-transparent hover:border-zinc-600'}`}>
            <span className={`absolute top-2 text-[10px] uppercase font-bold tracking-widest ${![3, 4, 6].includes(days) ? 'text-red-500' : 'text-zinc-500'}`}>CUSTOM DAYS</span>
            <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} className="bg-transparent text-center text-white font-black text-2xl w-full h-full pt-5 pb-2 focus:outline-none appearance-none" min="1" max="365" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 relative z-10">
        <label className="text-xs font-black text-red-600 uppercase tracking-widest">Stake Amount (SOL)</label>
        <div className="relative">
          <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} className="bg-transparent border-2 border-zinc-800 text-white p-4 font-mono text-xl focus:outline-none focus:border-red-600 transition-colors w-full pl-16" step="0.1" min="0.1" />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-500 font-mono">SOL</span>
        </div>
      </div>
      <button onClick={handleStake} disabled={isStaking} className={`w-full text-white font-black uppercase tracking-widest p-5 mt-4 transition-all relative z-10 ${isStaking ? 'bg-zinc-800/50 text-zinc-400 border border-zinc-700' : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-[0.98]'}`}>
        {isStaking ? 'Locking SOL...' : 'Lock SOL & Enter Forge'}
      </button>
    </div>
  );
}