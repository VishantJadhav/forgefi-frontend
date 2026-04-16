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
  const { publicKey, signTransaction } = wallet;
  
  const { gymLocation, calibrateGymLocation } = useGeolocation(publicKey?.toBase58());
  const { activeStake, isChecking, fetchStakeData } = useVaultState();

  const [days, setDays] = useState(6);
  const [stakeAmount, setStakeAmount] = useState(0.5);
  const [isStaking, setIsStaking] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBurning, setIsBurning] = useState(false);

  // ==========================================
  // THE SMART CONTRACT ENGINE (WRITE: STAKE)
  // ==========================================
  const handleStake = async () => {
    if (!publicKey || !signTransaction) return;

    try {
      setIsStaking(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
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

    if (activeStake) {
      const isFirstWorkout = activeStake.daysCompleted === 0;
      if (!isFirstWorkout) {
        const lastCheckIn = Number(activeStake.lastCheckIn.toString());
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const timeSinceLastWorkout = currentTimestamp - lastCheckIn;
        const COOLDOWN_PERIOD = 10; 

        if (timeSinceLastWorkout < COOLDOWN_PERIOD) {
          const hoursLeft = Math.ceil((COOLDOWN_PERIOD - timeSinceLastWorkout) / 3600);
          toast.error(`RECOVERY PERIOD: Muscles still repairing. Iron cools in ${hoursLeft} hours.`);
          return; 
        }
      }
    }

    setIsVerifying(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        const distance = getDistanceInMeters(gymLocation.lat, gymLocation.lng, currentLat, currentLng);

        if (distance > ALLOWED_DISTANCE_METERS) {
          toast.error(`ORACLE REJECTED: You are ${Math.round(distance)} meters away from the gym. Get to the iron.`);
          setIsVerifying(false);
          return;
        }

        try {
          const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
          const program = new Program(idl as any, PROGRAM_ID, provider);

          const [userStakePDA] = web3.PublicKey.findProgramAddressSync(
            [Buffer.from("stake"), publicKey.toBuffer()],
            PROGRAM_ID
          );

          const tx = await program.methods
            .verifyWorkout()
            .accounts({
              user: publicKey,
              userStake: userStakePDA, 
            } as any)
            .rpc();

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
        let errorMessage = "ORACLE FAILURE: Unknown GPS error.";
        if(error.code === 1) errorMessage = "LOCATION BLOCKED: Turn on GPS permissions and try again.";
        if(error.code === 2) errorMessage = "SIGNAL LOST: Turn off VPN or walk near a window.";
        if(error.code === 3) errorMessage = "TIMEOUT: GPS signal too weak. Connect to Wi-Fi.";
        toast.error(errorMessage);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ==========================================
  // THE SMART CONTRACT ENGINE (WRITE: BURN ZOMBIE)
  // ==========================================
  const handleBurnZombie = async () => {
    if (!publicKey || !signTransaction) return;

    try {
      setIsBurning(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      const [userStakePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const tx = await program.methods
        .acknowledgeFailure()
        .accounts({
          user: publicKey,
          userStake: userStakePDA,
        } as any)
        .rpc();

      // FIX: Actually use the 'tx' variable so TypeScript stops crying
      console.log(`Zombie Vault Burned. Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);  

      toast.success("Zombie vault burned. The slate is wiped clean.");
      await fetchStakeData(); 

    } catch (error) {
      console.error("Failed to burn zombie vault:", error);
      toast.error("Failed to acknowledge failure.");
    } finally {
      setIsBurning(false);
    }
  };

  // --- RENDER DYNAMIC UI FOR SINGLE PLAYER ---
  if (isChecking) {
    return (
      <div className="border-2 border-zinc-900 bg-black/60 backdrop-blur-md p-12 text-center text-zinc-500 font-mono uppercase tracking-widest animate-pulse shadow-2xl relative z-10">
        Scanning Blockchain...
      </div>
    );
  }

  if (activeStake?.missedDays === 999) {
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

  if (activeStake) {
    return (
      <div className="border-2 border-red-900 bg-black/60 backdrop-blur-md p-8 shadow-[0_0_30px_rgba(220,38,38,0.15)] flex flex-col gap-6 relative overflow-hidden z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
        <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-4 relative z-10">
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Active Protocol</h2>
          <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 tracking-widest animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]">Live</span>
        </div>
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="border border-zinc-900 bg-transparent p-4 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Locked Vault</span>
            <span className="text-2xl font-black text-red-500 font-mono drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
              {(
                (Number(activeStake.stakeAmount.toString()) / web3.LAMPORTS_PER_SOL) - 
                ((Number(activeStake.stakeAmount.toString()) / web3.LAMPORTS_PER_SOL) * 0.1 * (activeStake.missedDays || 0))
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
        <div className="mt-2 relative z-10">
           <DeadlineTimer lastCheckIn={Number(activeStake.lastCheckIn.toString())} daysCompleted={activeStake.daysCompleted} />
        </div>
        <div className="mt-2 relative z-10">
          <IronMatrix daysCommitted={activeStake.daysCommitted} daysCompleted={activeStake.daysCompleted} missedDays={activeStake.missedDays || 0} userKey={publicKey?.toBase58()} />
        </div>
        <div className="flex flex-col gap-2 mt-4 relative z-10">
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

  return (
    <div className="border-2 border-zinc-900 bg-black/60 backdrop-blur-md p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden z-10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/5 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
      <h2 className="text-3xl font-black uppercase text-white border-b-2 border-zinc-900 pb-4 tracking-tight relative z-10">
        Lock Your Stake
      </h2>
      <div className="flex flex-col gap-3 relative z-10 mb-4">
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
        {isStaking ? 'Awaiting Signature...' : 'Sign & Lock Contract'}
      </button>
    </div>
  );
}