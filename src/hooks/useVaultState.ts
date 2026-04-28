import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { Buffer } from 'buffer';
import idl from '../idl/idl.json';

// Single source of truth for your Program ID
export const PROGRAM_ID = new web3.PublicKey("AyN3aAx2VJTSxJGaR5n9Ayhpa6inCAxaSGupxbGw1Rnz");

export function useVaultState() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  
  const [activeStake, setActiveStake] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const fetchStakeData = async () => {
    if (!publicKey || !connected) {
      setActiveStake(null);
      return;
    }

    try {
      setIsChecking(true);
      const provider = new AnchorProvider(connection, wallet as any, { preflightCommitment: 'confirmed' });
      const program = new Program(idl as any, PROGRAM_ID, provider);

      // 🚨 Upgraded to stake_v3 for the new Tactical Rest architecture
      const [userStakePDA] = web3.PublicKey.findProgramAddressSync(
        [Buffer.from("stake_v3"), publicKey.toBuffer()],
        PROGRAM_ID
      );

      const accountData = await program.account.userStake.fetchNullable(userStakePDA);

      if (accountData) {
        // 🚨 Reverted to your exact working method! No TypeScript errors here.
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

  return { activeStake, isChecking, fetchStakeData };
}