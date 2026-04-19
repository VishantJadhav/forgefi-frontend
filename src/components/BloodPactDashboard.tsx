import { useState } from 'react';
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import toast from 'react-hot-toast';

import idl from '../idl/idl.json';
import DeadlineTimer from './DeadlineTimer';
import IronMatrix from './IronMatrix';

import { PROGRAM_ID } from '../hooks/useVaultState'; 
import { useSquadState } from '../hooks/useSquadState'; 
import { useGeolocation, ALLOWED_DISTANCE_METERS, getDistanceInMeters } from '../hooks/useGeolocation';

export default function BloodPactDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet(); 
  const { publicKey, connected, sendTransaction } = wallet; 

  const { squadData, squadPda, isLoading: isSquadLoading } = useSquadState();
  const { gymLocation, calibrateGymLocation } = useGeolocation(publicKey?.toBase58());

  const [view, setView] = useState<'MENU' | 'CREATE' | 'JOIN'>('MENU');

  const [days, setDays] = useState(6);
  const [stakeAmount, setStakeAmount] = useState(0.5);
  const [playerTwo, setPlayerTwo] = useState('');
  const [playerThree, setPlayerThree] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [leaderAddress, setLeaderAddress] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // ==========================================
  // 1. FORGE THE PACT
  // ==========================================
  const handleCreateSquad = async () => {
    if (!connected || !publicKey || !anchorWallet) {
      toast.error("Wallet disconnected. Please reconnect.");
      return;
    }
    if (!playerTwo) {
      toast.error("You must invite at least Player 2 to forge a pact.");
      return;
    }

    try {
      setIsCreating(true);
      const provider = new AnchorProvider(connection, anchorWallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      let p2Key: web3.PublicKey;
      let p3Key: web3.PublicKey;

      try {
        p2Key = new web3.PublicKey(playerTwo);
        p3Key = playerThree ? new web3.PublicKey(playerThree) : web3.SystemProgram.programId;
      } catch (err) {
        toast.error("Invalid Solana address format for Player 2 or 3.");
        setIsCreating(false);
        return;
      }

      const lamports = new BN(Math.floor(stakeAmount * web3.LAMPORTS_PER_SOL));
      const daysU8 = days;

      const [squadVaultPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("squad_v2"), publicKey.toBuffer(), p2Key.toBuffer()],
        PROGRAM_ID
      );

      const txInstruction = await program.methods
        .initializeSquad(lamports, daysU8, p2Key, p3Key)
        .accounts({
          playerOne: publicKey,
          squadVault: squadVaultPDA,
          systemProgram: web3.SystemProgram.programId,
        } as any)
        .instruction();

      const transaction = new web3.Transaction().add(txInstruction);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const simulation = await connection.simulateTransaction(transaction);
      
      if (simulation.value.err) {
        toast.error("Protocol rejected the terms. Ensure you have sufficient SOL.");
        setIsCreating(false);
        return;
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success("Pact forged! Send your wallet address to your squad to invite them.");
      setView('MENU');

    } catch (error) {
      toast.error("Transaction failed or rejected by lifter.");
    } finally {
      setIsCreating(false);
    }
  };

  // ==========================================
  // 2. HONOR THE INVITE (MENU MANUAL ENTRY)
  // ==========================================
  const handleJoinSquad = async () => {
    if (!connected || !publicKey || !anchorWallet) {
      toast.error("Wallet disconnected. Please reconnect.");
      return;
    }
    if (!leaderAddress) return;

    try {
      setIsJoining(true);
      const provider = new AnchorProvider(connection, anchorWallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      let leaderKey: web3.PublicKey;
      try {
        leaderKey = new web3.PublicKey(leaderAddress.trim());
      } catch (err) {
        toast.error("Invalid Squad Leader address format.");
        setIsJoining(false);
        return;
      }

      const allVaults = await program.account.squadVaultV2.all();
      const vault = allVaults.find((v : any) => v.account.playerOne.toBase58() === leaderKey.toBase58());

      if (!vault) {
        toast.error("BLOCKCHAIN ERROR: No vault found for this Leader's address.");
        setIsJoining(false);
        return;
      }

      const squadVaultPDA = vault.publicKey;

      const txInstruction = await program.methods
        .joinSquad()
        .accounts({
          player: publicKey,
          squadVault: squadVaultPDA,
          systemProgram: web3.SystemProgram.programId,
        } as any)
        .instruction();

      const transaction = new web3.Transaction().add(txInstruction);
      
      // 🚨 THE MISSING LINES: Adding Blockhash and Fee Payer 🚨
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success("You have honored the invite. SOL locked.");
      setView('MENU');
    } catch (error: any) {
      console.error("Failed to join squad:", error);
      toast.error("Transaction failed or rejected.");
    } finally {
      setIsJoining(false);
    }
  };

  // ==========================================
  // 2.5 DIRECT STAKE (WHEN ALREADY IN LOBBY)
  // ==========================================
  const handleStakeToJoin = async () => {
    if (!connected || !publicKey || !anchorWallet || !squadPda) {
      toast.error("Wallet disconnected. Please reconnect.");
      return;
    }

    try {
      setIsJoining(true);
      const provider = new AnchorProvider(connection, anchorWallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      const squadVaultPDA = new web3.PublicKey(squadPda);

      const txInstruction = await program.methods
        .joinSquad()
        .accounts({
          player: publicKey,
          squadVault: squadVaultPDA,
          systemProgram: web3.SystemProgram.programId,
        } as any)
        .instruction();

      const transaction = new web3.Transaction().add(txInstruction);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const simulation = await connection.simulateTransaction(transaction);
      if (simulation.value.err) {
        toast.error("Protocol rejected the terms. Ensure you have sufficient SOL.");
        setIsJoining(false);
        return;
      }

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success("Blood locked! You are in the Pact.");
    } catch (error) {
      toast.error("Phantom rejected the transaction.");
    } finally {
      setIsJoining(false);
    }
  };

  // ==========================================
  // 3. VERIFY SQUAD WORKOUT
  // ==========================================
  const handleVerifySquad = async () => {
    if (!connected || !publicKey || !anchorWallet) {
      toast.error("Wallet disconnected. Please reconnect.");
      return;
    }

    if (!gymLocation) {
      toast.error("Please calibrate your gym location first!");
      return;
    }
    if (!squadPda) return;

    setIsVerifying(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const distance = getDistanceInMeters(gymLocation.lat, gymLocation.lng, position.coords.latitude, position.coords.longitude);

        if (distance > ALLOWED_DISTANCE_METERS) {
          toast.error(`ORACLE REJECTED: You are ${Math.round(distance)} meters away from the gym.`);
          setIsVerifying(false);
          return;
        }

        try {
          const provider = new AnchorProvider(connection, anchorWallet as any, { preflightCommitment: 'confirmed' });
          const program = new Program(idl as any, PROGRAM_ID, provider);

          const txInstruction = await program.methods
            .verifySquadWorkout()
            .accounts({
              player: publicKey,
              squadVault: new web3.PublicKey(squadPda),
            } as any)
            .instruction();

          const transaction = new web3.Transaction().add(txInstruction);
          
          // 🚨 THE MISSING LINES: Adding Blockhash and Fee Payer 🚨
          transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
          transaction.feePayer = publicKey;

          // Catch Cooldown/Deadline errors before Phantom sees them!
          const simulation = await connection.simulateTransaction(transaction);
          if (simulation.value.err) {
            console.error("🔥 VERIFY REJECTED 🔥", simulation.value.logs);
            const logStr = simulation.value.logs?.toString() || "";
            if (logStr.includes("WorkoutTooSoon") || logStr.includes("6000")) {
              toast.error("RECOVERY PERIOD: Iron cools in 10 seconds.");
            } else if (logStr.includes("MissedDeadline") || logStr.includes("6003")) {
              toast.error("GUILLOTINE: You missed your window.");
            } else {
              toast.error("Protocol rejected the verification.");
            }
            setIsVerifying(false);
            return;
          }

          const signature = await sendTransaction(transaction, connection);
          await connection.confirmTransaction(signature, 'confirmed');

          toast.success("Workout verified on-chain! Awaiting squadmates.");
        } catch (error: any) {
          console.error(error);
          toast.error("Phantom rejected the transaction.");
        } finally {
          setIsVerifying(false);
        }
      },
      (error) => {
        setIsVerifying(false);
        console.error("GPS Error:", error);
        toast.error("ORACLE FAILURE: GPS signal lost or blocked.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  };

  // --- RENDER 0: THE ACTIVE LOBBY / SQUAD VIEW ---
  if (isSquadLoading) {
    return <div className="text-zinc-500 font-mono text-center p-8 uppercase tracking-widest animate-pulse">Scanning Blockchain...</div>;
  }

  if (squadData) {
    const isP2Empty = squadData.playerTwo.toBase58() === web3.SystemProgram.programId.toBase58();
    const isP3Empty = squadData.playerThree.toBase58() === web3.SystemProgram.programId.toBase58();
    
    const myAddress = publicKey?.toBase58().trim() || "";
    const onChainP2 = squadData.playerTwo.toBase58().trim();
    const onChainP3 = squadData.playerThree.toBase58().trim();

    const amIPlayerTwo = myAddress === onChainP2;
    const amIPlayerThree = myAddress === onChainP3;
    
    const doINeedToStake = (amIPlayerTwo && !squadData.p2Staked) || (amIPlayerThree && !squadData.p3Staked);

    let myLastCheckIn = 0;
    if (myAddress === squadData.playerOne.toBase58().trim()) myLastCheckIn = Number(squadData.p1LastCheckIn.toString());
    else if (amIPlayerTwo) myLastCheckIn = Number(squadData.p2LastCheckIn.toString());
    else if (amIPlayerThree) myLastCheckIn = Number(squadData.p3LastCheckIn.toString());

    return (
      <div className="border-2 border-red-900 bg-black/60 backdrop-blur-md p-8 shadow-[0_0_30px_rgba(220,38,38,0.15)] flex flex-col gap-6 relative overflow-hidden z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
        
        <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-black uppercase text-white tracking-tight">Active Pact</h2>
            <p className="text-zinc-500 font-mono text-[10px] uppercase mt-1">
              Leader: {squadData.playerOne.toBase58().slice(0,4)}...{squadData.playerOne.toBase58().slice(-4)}
            </p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest ${squadData.protocolActive ? 'bg-red-900/40 text-red-500 border border-red-500 shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'bg-yellow-900/40 text-yellow-500 border border-yellow-500'}`}>
              {squadData.protocolActive ? 'Protocol Live' : 'Awaiting Stakers'}
            </span>
          </div>
        </div>

        {squadData.protocolActive && (
          <>
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="border border-zinc-900 bg-transparent p-4 flex flex-col items-center justify-center text-center">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Blood Pool</span>
                <span className="text-2xl font-black text-red-500 font-mono drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                  {(
                    (Number(squadData.totalVaultBalance.toString()) / web3.LAMPORTS_PER_SOL) - 
                    ((Number(squadData.totalVaultBalance.toString()) / web3.LAMPORTS_PER_SOL) * 0.1 * (squadData.missedDays || 0))
                  ).toFixed(2)} SOL
                </span>
                {squadData.missedDays > 0 && (
                  <span className="text-[10px] text-red-600 font-black tracking-widest uppercase mt-1 animate-pulse">
                    Bleeding (-{squadData.missedDays * 10}%)
                  </span>
                )}
              </div>
              <div className="border border-zinc-900 bg-transparent p-4 flex flex-col items-center justify-center">
                <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-1">Commitment</span>
                <span className="text-2xl font-black text-white font-mono">
                  {squadData.daysCommitted} Days
                </span>
              </div>
            </div>

            <div className="relative z-10 -mt-2">
              <DeadlineTimer lastCheckIn={myLastCheckIn} daysCompleted={squadData.daysCompleted} />
            </div>

            <div className="relative z-10 -mt-2">
              <IronMatrix 
                daysCommitted={squadData.daysCommitted} 
                daysCompleted={squadData.daysCompleted} 
                missedDays={squadData.missedDays || 0} 
                userKey={squadPda || undefined} 
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 relative z-10 mt-2">
          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">The Roster</label>
          <div className="flex justify-between items-center bg-zinc-900/50 p-3 border border-zinc-800">
            <span className="font-mono text-sm text-white">Player 1 (Creator)</span>
            <span className="text-xs font-black text-green-500 uppercase">Staked</span>
          </div>
          {!isP2Empty && (
            <div className="flex justify-between items-center bg-zinc-900/50 p-3 border border-zinc-800">
              <span className="font-mono text-sm text-white">
                Player 2 ({squadData.playerTwo.toBase58().slice(0,4)}...{squadData.playerTwo.toBase58().slice(-4)})
              </span>
              {squadData.p2Staked ? (
                <span className="text-xs font-black text-green-500 uppercase">Staked</span>
              ) : (
                <span className="text-xs font-black text-yellow-500 uppercase animate-pulse">Pending...</span>
              )}
            </div>
          )}
          {!isP3Empty && (
            <div className="flex justify-between items-center bg-zinc-900/50 p-3 border border-zinc-800">
              <span className="font-mono text-sm text-white">
                Player 3 ({squadData.playerThree.toBase58().slice(0,4)}...{squadData.playerThree.toBase58().slice(-4)})
              </span>
              {squadData.p3Staked ? (
                <span className="text-xs font-black text-green-500 uppercase">Staked</span>
              ) : (
                <span className="text-xs font-black text-yellow-500 uppercase animate-pulse">Pending...</span>
              )}
            </div>
          )}
        </div>

        {!squadData.protocolActive && (
          <div className="mt-4 relative z-10">
            {doINeedToStake ? (
              <button 
                onClick={handleStakeToJoin}
                disabled={isJoining}
                className={`w-full font-black uppercase tracking-widest p-5 transition-all ${isJoining ? 'bg-zinc-800 text-zinc-500 border border-zinc-700' : 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] active:scale-[0.98]'}`}
              >
                {isJoining ? 'Locking SOL...' : `Lock ${(Number(squadData.requiredStakePerPlayer) / web3.LAMPORTS_PER_SOL).toFixed(2)} SOL to Honor Pact`}
              </button>
            ) : (
              <div className="w-full border border-yellow-900/50 bg-yellow-900/10 text-yellow-500 p-4 text-center font-mono text-xs uppercase tracking-widest animate-pulse">
                Awaiting squadmates to lock their stake...
              </div>
            )}
          </div>
        )}

        {squadData.protocolActive && (
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
              onClick={handleVerifySquad}
              disabled={isVerifying || !gymLocation}
              className={`w-full font-black uppercase tracking-widest p-5 transition-all border ${
                isVerifying || !gymLocation ? 'bg-transparent text-zinc-600 border-zinc-800 cursor-not-allowed' : 'bg-zinc-900/80 text-white hover:bg-zinc-800 border-zinc-600 hover:border-zinc-400 shadow-[0_0_15px_rgba(255,255,255,0.05)] active:scale-[0.98]'
              }`}
            >
              {isVerifying ? 'Checking Location...' : 'Verify Squad Workout'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'MENU') {
    return (
      <div className="border-2 border-red-900 bg-black/60 backdrop-blur-md p-8 shadow-[0_0_30px_rgba(220,38,38,0.15)] flex flex-col gap-6 relative overflow-hidden z-10 text-center">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
        <h2 className="text-3xl font-black text-red-500 uppercase tracking-widest mb-2 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
          The Blood Pact
        </h2>
        <p className="text-zinc-400 font-mono text-xs uppercase px-2 leading-relaxed">
          Bind your fate to your squad. If one lifter misses a workout, the entire squad bleeds.
        </p>
        <div className="grid grid-cols-1 gap-4 mt-4 relative z-10">
          <button onClick={() => setView('CREATE')} className="w-full bg-red-900/20 border border-red-800 text-red-500 hover:bg-red-900/40 hover:text-white hover:border-red-500 font-black uppercase tracking-widest p-5 transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)]">
            Forge a New Pact
          </button>
          <button onClick={() => setView('JOIN')} className="w-full bg-transparent border border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-white font-black uppercase tracking-widest p-5 transition-all">
            Honor an Invite
          </button>
        </div>
      </div>
    );
  }

  if (view === 'CREATE') {
    return (
      <div className="border-2 border-zinc-900 bg-black/60 backdrop-blur-md p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden z-10">
        <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-4 relative z-10">
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Forge Pact</h2>
          <button onClick={() => setView('MENU')} className="text-xs text-zinc-500 hover:text-red-500 uppercase font-black tracking-widest transition-colors">Abort</button>
        </div>

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
          <label className="text-xs font-black text-red-600 uppercase tracking-widest">Required Stake Per Player (SOL)</label>
          <div className="relative">
            <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} className="bg-transparent border-2 border-zinc-800 text-white p-4 font-mono text-xl focus:outline-none focus:border-red-600 transition-colors w-full pl-16" step="0.1" min="0.1" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-500 font-mono">SOL</span>
          </div>
        </div>

        <div className="flex flex-col gap-4 relative z-10">
          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">The Guest List (Solana Addresses)</label>
          <input type="text" placeholder="Player 2 Wallet Address..." value={playerTwo} onChange={(e) => setPlayerTwo(e.target.value)} className="bg-transparent border border-zinc-800 text-white p-3 font-mono text-xs focus:outline-none focus:border-zinc-500 w-full" />
          <input type="text" placeholder="Player 3 Wallet Address (Optional)..." value={playerThree} onChange={(e) => setPlayerThree(e.target.value)} className="bg-transparent border border-zinc-800 text-zinc-400 p-3 font-mono text-xs focus:outline-none focus:border-zinc-500 w-full" />
        </div>

        <button onClick={handleCreateSquad} disabled={isCreating} className={`w-full text-white font-black uppercase tracking-widest p-5 mt-2 transition-all relative z-10 ${isCreating ? 'bg-zinc-800/50 text-zinc-400 border border-zinc-700' : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-[0.98]'}`}>
          {isCreating ? 'Forging Pact...' : 'Lock SOL & Create Squad'}
        </button>
      </div>
    );
  }

  if (view === 'JOIN') {
    return (
      <div className="border-2 border-zinc-900 bg-black/60 backdrop-blur-md p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden z-10">
        <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-4 relative z-10">
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Honor Invite</h2>
          <button onClick={() => setView('MENU')} className="text-xs text-zinc-500 hover:text-red-500 uppercase font-black tracking-widest transition-colors">Abort</button>
        </div>

        <p className="text-zinc-400 font-mono text-xs uppercase leading-relaxed">
          To find your squad's vault on the blockchain, you must provide the wallet address of the Lifter who created the pact.
        </p>

        <div className="flex flex-col gap-2 relative z-10">
          <label className="text-xs font-black text-red-600 uppercase tracking-widest">Squad Leader's Wallet Address</label>
          <input type="text" placeholder="Paste Player 1's Address here..." value={leaderAddress} onChange={(e) => setLeaderAddress(e.target.value)} className="bg-transparent border-2 border-zinc-800 text-white p-4 font-mono text-sm focus:outline-none focus:border-red-600 transition-colors w-full" />
        </div>

        <button onClick={handleJoinSquad} disabled={isJoining} className={`w-full text-white font-black uppercase tracking-widest p-5 mt-4 transition-all relative z-10 ${isJoining ? 'bg-zinc-800/50 text-zinc-400 border border-zinc-700' : 'bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-[0.98]'}`}>
          {isJoining ? 'Scanning Chain...' : 'Find Vault & Join'}
        </button>
      </div>
    );
  }

  return null;
}