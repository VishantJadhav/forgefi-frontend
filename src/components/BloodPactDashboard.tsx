import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import toast from 'react-hot-toast';

// IDL & Hooks
import idl from '../idl/idl.json';
import { PROGRAM_ID } from '../hooks/useVaultState'; 
import { useSquadState } from '../hooks/useSquadState'; // <-- NEW RADAR HOOK

export default function BloodPactDashboard() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, signTransaction } = wallet;

  // SQUAD RADAR
  const { squadData, isLoading: isSquadLoading } = useSquadState();

  // View State: 'MENU' | 'CREATE' | 'JOIN'
  const [view, setView] = useState<'MENU' | 'CREATE' | 'JOIN'>('MENU');

  // Create Squad State
  const [days, setDays] = useState(6);
  const [stakeAmount, setStakeAmount] = useState(0.5);
  const [playerTwo, setPlayerTwo] = useState('');
  const [playerThree, setPlayerThree] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Join Squad State
  const [leaderAddress, setLeaderAddress] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // ==========================================
  // 1. FORGE THE PACT (CREATE SQUAD)
  // ==========================================
  const handleCreateSquad = async () => {
    if (!publicKey || !signTransaction) return;
    if (!playerTwo) {
      toast.error("You must invite at least Player 2 to forge a pact.");
      return;
    }

    try {
      setIsCreating(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      // Validate and parse the friend's addresses
      let p2Key: web3.PublicKey;
      let p3Key: web3.PublicKey;

      try {
        p2Key = new web3.PublicKey(playerTwo);
        // If Player 3 is empty, pass the SystemProgram ID to tell Rust this is a Duo
        p3Key = playerThree ? new web3.PublicKey(playerThree) : web3.SystemProgram.programId;
      } catch (err) {
        toast.error("Invalid Solana address format for Player 2 or 3.");
        setIsCreating(false);
        return;
      }

      const lamports = new BN(Math.floor(stakeAmount * web3.LAMPORTS_PER_SOL));
      const daysU8 = days;

      // PDA is derived using PLAYER 1's key (The Creator)
      const [squadVaultPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("squad"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const tx = await program.methods
        .initializeSquad(lamports, daysU8, p2Key, p3Key)
        .accounts({
          playerOne: publicKey,
          squadVault: squadVaultPDA,
          systemProgram: web3.SystemProgram.programId,
        } as any)
        .rpc({ skipPreflight: true });

      console.log(`Blood Pact Forged. Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      toast.success("Pact forged! Send your wallet address to your squad to invite them.");
      
      // Return to menu
      setView('MENU');

    } catch (error) {
      console.error("Failed to create squad:", error);
      toast.error("Transaction failed or rejected by lifter.");
    } finally {
      setIsCreating(false);
    }
  };

  // ==========================================
  // 2. HONOR THE INVITE (JOIN SQUAD) - DETECTIVE VERSION
  // ==========================================
  const handleJoinSquad = async () => {
    if (!publicKey || !signTransaction) return;
    if (!leaderAddress) {
      toast.error("You need the Squad Leader's address to find the vault.");
      return;
    }

    try {
      setIsJoining(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      // Parse the Leader's address (with .trim() to fix copy-paste spaces!)
      let leaderKey: web3.PublicKey;
      try {
        leaderKey = new web3.PublicKey(leaderAddress.trim());
      } catch (err) {
        toast.error("Invalid Squad Leader address format.");
        setIsJoining(false);
        return;
      }

      const [squadVaultPDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("squad"), leaderKey.toBuffer()],
        PROGRAM_ID
      );

      // ==========================================
      // PRE-FLIGHT CHECK 1: DOES THE VAULT EXIST?
      // ==========================================
      let vaultData : any;
      try {
        // We actively ask the blockchain for the Vault data
        vaultData = await program.account.squadVault.fetch(squadVaultPDA);
      } catch (e) {
        console.error("Vault fetch error:", e);
        toast.error("BLOCKCHAIN ERROR: No vault found for this Leader's address. Did you paste the right one?");
        setIsJoining(false);
        return;
      }

      // ==========================================
      // PRE-FLIGHT CHECK 2: ARE YOU INVITED?
      // ==========================================
      const myAddress = publicKey.toBase58();
      const p2Address = vaultData.playerTwo.toBase58();
      const p3Address = vaultData.playerThree.toBase58();

      if (myAddress !== p2Address && myAddress !== p3Address) {
        toast.error(`THE BOUNCER REJECTS YOU: This vault invited ${p2Address.slice(0,4)}... not you!`);
        setIsJoining(false);
        return;
      }

      // ==========================================
      // PRE-FLIGHT CHECK 3: ALREADY STAKED?
      // ==========================================
      if ((myAddress === p2Address && vaultData.p2Staked) || 
          (myAddress === p3Address && vaultData.p3Staked)) {
        toast.error("You have already locked your SOL in this pact!");
        setIsJoining(false);
        return;
      }

      // ==========================================
      // FINAL STEP: SIGN AND SEND
      // ==========================================
      const tx = await program.methods
        .joinSquad()
        .accounts({
          player: publicKey,
          squadVault: squadVaultPDA,
          // Explicitly passing the System Program is critical for SOL transfers!
          systemProgram: web3.SystemProgram.programId,
        } as any)
        .rpc({ skipPreflight: true }); // Phantom will simulate natively now.

      console.log(`Joined Squad. Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      toast.success("You have honored the invite. SOL locked.");
      
      // Return to menu
      setView('MENU');

    } catch (error: any) {
      console.error("Failed to join squad:", error);
      toast.error("Phantom rejected the signature, or you lack SOL.");
    } finally {
      setIsJoining(false);
    }
  };

  // --- RENDER 0: THE ACTIVE LOBBY / SQUAD VIEW ---
  if (isSquadLoading) {
    return <div className="text-zinc-500 font-mono text-center p-8 uppercase tracking-widest animate-pulse">Scanning Blockchain...</div>;
  }

  if (squadData) {
    const isP2Empty = squadData.playerTwo.toBase58() === web3.SystemProgram.programId.toBase58();
    const isP3Empty = squadData.playerThree.toBase58() === web3.SystemProgram.programId.toBase58();

    return (
      <div className="border-2 border-red-900 bg-black/60 backdrop-blur-md p-8 shadow-[0_0_30px_rgba(220,38,38,0.15)] flex flex-col gap-6 relative overflow-hidden z-50">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl translate-x-10 -translate-y-10"></div>
        
        <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4 relative z-10">
          <div>
            <h2 className="text-2xl font-black uppercase text-white tracking-tight">Active Pact</h2>
            <p className="text-zinc-500 font-mono text-[10px] uppercase mt-1">
              Leader: {squadData.playerOne.toBase58().slice(0,4)}...{squadData.playerOne.toBase58().slice(-4)}
            </p>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 text-xs font-black uppercase tracking-widest ${squadData.protocolActive ? 'bg-red-900/40 text-red-500 border border-red-500' : 'bg-yellow-900/40 text-yellow-500 border border-yellow-500'}`}>
              {squadData.protocolActive ? 'Protocol Live' : 'Awaiting Stakers'}
            </span>
          </div>
        </div>

        {/* Player Roster */}
        <div className="flex flex-col gap-3 relative z-10">
          <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">The Roster</label>
          
          {/* Player 1 (Always Staked if vault exists) */}
          <div className="flex justify-between items-center bg-zinc-900/50 p-3 border border-zinc-800">
            <span className="font-mono text-sm text-white">Player 1 (Creator)</span>
            <span className="text-xs font-black text-green-500 uppercase">Staked</span>
          </div>

          {/* Player 2 */}
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

          {/* Player 3 */}
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
      </div>
    );
  }

  // --- RENDER 1: THE CROSSROADS MENU ---
  if (view === 'MENU') {
    return (
      <div className="border-2 border-red-900 bg-black/60 backdrop-blur-md p-8 shadow-[0_0_30px_rgba(220,38,38,0.15)] flex flex-col gap-6 relative overflow-hidden z-50 text-center">
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

  // --- RENDER 2: CREATE SQUAD FORM ---
  if (view === 'CREATE') {
    return (
      <div className="border-2 border-zinc-900 bg-black/60 backdrop-blur-md p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden z-50">
        <div className="flex justify-between items-center border-b-2 border-zinc-900 pb-4 relative z-10">
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Forge Pact</h2>
          <button onClick={() => setView('MENU')} className="text-xs text-zinc-500 hover:text-red-500 uppercase font-black tracking-widest transition-colors">Abort</button>
        </div>

        {/* Commitment Grid */}
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

        {/* Stake Amount */}
        <div className="flex flex-col gap-2 relative z-10">
          <label className="text-xs font-black text-red-600 uppercase tracking-widest">Required Stake Per Player (SOL)</label>
          <div className="relative">
            <input type="number" value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} className="bg-transparent border-2 border-zinc-800 text-white p-4 font-mono text-xl focus:outline-none focus:border-red-600 transition-colors w-full pl-16" step="0.1" min="0.1" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-500 font-mono">SOL</span>
          </div>
        </div>

        {/* The Guest List */}
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

  // --- RENDER 3: JOIN SQUAD FORM ---
  if (view === 'JOIN') {
    return (
      <div className="border-2 border-zinc-900 bg-black/60 backdrop-blur-md p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden z-50">
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